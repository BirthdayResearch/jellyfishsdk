import { WIF } from '@defichain/jellyfish-crypto'
import { WalletClassic } from '@defichain/jellyfish-wallet-classic'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { fromAddress } from '@defichain/jellyfish-address'
import { MainNet } from '@defichain/jellyfish-network'
import { WhaleWalletAccount } from '@defichain/whale-api-wallet'
import { CTransactionSegWit, TransactionSegWit } from '@defichain/jellyfish-transaction'
import { BigNumber } from 'bignumber.js'
import { AddressToken } from '@defichain/whale-api-client/dist/api/address'

/* eslint-disable @typescript-eslint/no-non-null-assertion */
const BURN_ADDRESS_SCRIPT = fromAddress('8defichainBurnAddressXXXXXXXdRQkSm', 'mainnet')!.script

/**
 * Initialize WhaleApiClient connected to ocean.defichain.com/v0
 */
const client = new WhaleApiClient({
  url: 'https://ocean.defichain.com',
  version: 'v0'
})

// You can `dumpprivkey [address]` with defi-cli, only Bech32 address (df1...) are supported.
const PRIVATE_KEY = 'PRIVATE_KEY_IN_WIF'

export async function main (): Promise<void> {
  const wallet = new WalletClassic(WIF.asEllipticPair(PRIVATE_KEY))
  const sequencer = new BurnProgram(client, wallet)

  // Refill UTXO if balance is getting low
  if (await sequencer.accountToUTXO()) {
    return
  }

  // Burn dBTC by sending to burn address
  if (await sequencer.burnDBTC()) {
    return
  }

  // Swap DFI to BTC
  await sequencer.swapDFIDBTC()
}

export class BurnProgram {
  constructor (
    private readonly client: WhaleApiClient,
    private readonly wallet: WalletClassic,
    private readonly account = new WhaleWalletAccount(client, wallet, MainNet)
  ) {
  }

  /**
   * Refill UTXO when there is less than 1.1 UTXO.
   */
  async accountToUTXO (): Promise<boolean> {
    const utxoBalance = await this.getUTXOBalance()
    console.log(`UTXO Balance: ${utxoBalance.toFixed()}`)

    if (utxoBalance.gte(new BigNumber('1.1'))) {
      return false
    }
    console.log('Refilling UTXO')

    const script = await this.account.getScript()
    const txn = await this.account.withTransactionBuilder().account.accountToUtxos({
      from: script,
      balances: [
        {
          token: 0,
          amount: new BigNumber('1.0')
        }
      ],
      mintingOutputsStart: 2 // 0: DfTx, 1: change, 2: minted utxos (mandated by jellyfish SDK)
    }, script)

    await this.send(txn)
    return true
  }

  /**
   * Burn dBTC there is more than 0.1 BTC
   */
  async burnDBTC (): Promise<boolean> {
    const dBTC = await this.getTokenBalance('BTC', new BigNumber('0.1'))
    if (dBTC === undefined) {
      return false
    }
    console.log(`Burning dBTC: ${dBTC.amount}`)

    const script = await this.account.getScript()
    const txn = await this.account.withTransactionBuilder().account.accountToAccount({
      from: script,
      to: [{
        script: BURN_ADDRESS_SCRIPT,
        balances: [{
          token: parseInt(dBTC.id),
          amount: new BigNumber(dBTC.amount)
        }]
      }]
    }, script)

    await this.send(txn)
    return true
  }

  /**
   * Swap DFI to dBTC when there is more than 100 DFI
   */
  async swapDFIDBTC (): Promise<boolean> {
    const dfi = await this.getTokenBalance('DFI', new BigNumber('100'))
    if (dfi === undefined) {
      console.log('DFI Account balance less than 100')
      return false
    }
    console.log(`Swap ${dfi.amount} DFI to dBTC`)

    const script = await this.account.getScript()
    const txn = await this.account.withTransactionBuilder().dex.compositeSwap({
      poolSwap: {
        fromScript: script,
        toScript: script,
        fromTokenId: 0,
        toTokenId: 2,
        fromAmount: new BigNumber(dfi.amount),
        maxPrice: new BigNumber('9223372036854775807')
      },
      pools: []
    }, script)

    await this.send(txn)
    return true
  }

  /**
   * Get token balance from wallet with minBalance
   */
  private async getTokenBalance (symbol: string, minBalance: BigNumber): Promise<AddressToken | undefined> {
    const address = await this.account.getAddress()
    const tokens = await this.client.address.listToken(address, 200)

    return tokens.find(token => {
      return token.isDAT && token.symbol === symbol && new BigNumber(token.amount).gte(minBalance)
    })
  }

  /**
   * Get current wallet UTXO balance
   */
  private async getUTXOBalance (): Promise<BigNumber> {
    const address = await this.account.getAddress()

    return new BigNumber(await this.client.address.getBalance(address))
  }

  private async send (txn: TransactionSegWit): Promise<void> {
    const hex: string = new CTransactionSegWit(txn).toHex()
    const txId: string = await this.client.rawtx.send({ hex: hex })

    console.log(`Send TxId: ${txId}`)
  }
}
