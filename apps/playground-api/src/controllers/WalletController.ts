import BigNumber from 'bignumber.js'
import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { CTransaction, DeFiTransactionConstants, OP_CODES, Script, Transaction, Vout } from '@defichain/jellyfish-transaction'
import { fromAddress } from '@defichain/jellyfish-address'
import { waitForCondition } from '@defichain/testcontainers'

export interface WalletBalances {
  balance: number
  tokens: Array<{ id: string, balance: number }>
}

export interface SendTo {
  amount: string
  address: string
}

@Controller('/v0/playground/wallet')
export class WalletController {
  constructor (private readonly client: ApiClient) {
  }

  @Get('/balances')
  async balances (): Promise<WalletBalances> {
    const balance = await this.client.wallet.getBalance()
    const account = await this.client.account.getTokenBalances({}, true, {
      symbolLookup: false,
      includeEth: false
    })

    const tokens = Object.entries(account).map(([id, value]) => {
      return {
        id: id,
        balance: value.toNumber()
      }
    })

    return {
      balance: balance.toNumber(),
      tokens: tokens
    }
  }

  @Post('/utxo/send')
  async sendUtxo (@Param('id') tokenId: string, @Body() data: SendTo): Promise<string> {
    const txid = await this.client.wallet.sendToAddress(data.address, Number(data.amount))
    await this.waitConfirmation(txid)
    return txid
  }

  @Post('/tokens/:id/send')
  async sendToken (@Param('id') tokenId: string, @Body() data: SendTo): Promise<string> {
    let txid: string
    if (tokenId === '0') {
      txid = await this.sendDfiToken(data.amount, data.address)
    } else {
      const to = { [data.address]: [`${data.amount}@${tokenId}`] }
      txid = await this.client.account.sendTokensToAddress({}, to)
    }

    await this.waitConfirmation(txid)
    return txid
  }

  async sendDfiToken (amount: string, address: string): Promise<string> {
    const txn = createUtxoToAccountTxn(amount, address)
    const hex = new CTransaction(txn).toHex()

    const fundOptions = { lockUnspents: true, changePosition: 1 }
    const { hex: funded } = await this.client.call('fundrawtransaction', [hex, fundOptions], 'number')
    const { hex: signed } = await this.client.call('signrawtransactionwithwallet', [funded], 'number')
    return await this.client.rawtx.sendRawTransaction(signed)
  }

  async waitConfirmation (txid: string, timeout: number = 30000): Promise<void> {
    await waitForCondition(async () => {
      const txn = await this.client.rawtx.getRawTransaction(txid, true)
      return txn.confirmations > 0
    }, timeout, 500)
  }
}

function createUtxoToAccountTxn (amount: string, address: string): Transaction {
  const value = new BigNumber(amount)
  const script = fromAddress(address, 'regtest')?.script as Script

  const utxoToAccount: Vout = {
    value: value,
    script: {
      stack: [
        OP_CODES.OP_RETURN,
        OP_CODES.OP_DEFI_TX_UTXOS_TO_ACCOUNT({
          to: [{
            script: script,
            balances: [{ token: 0, amount: value }]
          }]
        })
      ]
    },
    tokenId: 0x00
  }

  return {
    version: DeFiTransactionConstants.Version,
    vin: [],
    vout: [utxoToAccount],
    lockTime: 0x00000000
  }
}
