import { WIF } from '@defichain/jellyfish-crypto'
import { WalletClassic } from '@defichain/jellyfish-wallet-classic'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { MainNet } from '@defichain/jellyfish-network'
import { WhaleWalletAccount } from '@defichain/whale-api-wallet'
import { CTransactionSegWit, TransactionSegWit } from '@defichain/jellyfish-transaction'
import { BigNumber } from 'bignumber.js'
import { AddressToken } from '@defichain/whale-api-client/dist/api/address'

/**
 * Initialize WhaleApiClient connected to ocean.defichain.com/v0
 */
const client = new WhaleApiClient({
  url: 'https://ocean.defichain.com',
  version: 'v0'
})

/**
 * @param {string} privateKey you can `dumpprivkey [address]` with defi-cli, supports only Bech32 address (df1...)
 */
export async function main (privateKey: string | undefined = process.env.PRIVATE_KEY): Promise<void> {
  if (privateKey === undefined) {
    throw new Error('PrivateKey in WIF not provided')
  }

  const wallet = new WalletClassic(WIF.asEllipticPair(privateKey))
  const program = new TradingProgram(wallet)
  await program.run()
}

/**
 * Single Address Wallet DEX Trading Program
 *
 * This Program assumes you always have enough UTXO.
 * Only Account balances is used for trading.
 *
 * This bot just trades all dUSDT it has into dDOGE,
 * no conditional logic is performed. You need to implement them yourself.
 */
export class TradingProgram {
  constructor (
    private readonly wallet: WalletClassic,
    private readonly account = new WhaleWalletAccount(client, wallet, MainNet)
  ) {
  }

  async run (): Promise<void> {
    const usdt = await this.getAddressToken(0)
    if (usdt === undefined) {
      console.log('dUSDT balance is 0')
      return
    }

    console.log(`Swap ${usdt.amount} dUSDT to dDOGE`)

    const script = await this.account.getScript()
    const txn = await this.account.withTransactionBuilder().dex.compositeSwap({
      poolSwap: {
        fromScript: script,
        toScript: script,
        // You can get tokenId here: https://ocean.defichain.com/v0/mainnet/tokens
        fromTokenId: 0,
        toTokenId: 2,
        // Amount to swap from
        fromAmount: new BigNumber(usdt.amount),
        // Max price of the SWAP
        maxPrice: new BigNumber('9223372036854775807')
      },
      pools: [
        // Composite swap from dUSDT via (dUSDT-DFI) to (DFI-dDOGE) for dDOGE
        { id: 6 }, // https://ocean.defichain.com/v0/mainnet/poolpairs/6
        { id: 8 } // https://ocean.defichain.com/v0/mainnet/poolpairs/8
      ]
    }, script)

    await TradingProgram.broadcast(txn)
  }

  /**
   * Get token balance from wallet with minBalance
   * @param {number} id of token to AddressToken
   */
  private async getAddressToken (id: number): Promise<AddressToken | undefined> {
    const address = await this.account.getAddress()
    const tokens = await client.address.listToken(address, 200)

    return tokens.find(token => {
      return token.id === `${id}`
    })
  }

  /**
   * @param {TransactionSegWit} txn to broadcast
   */
  private static async broadcast (txn: TransactionSegWit): Promise<void> {
    const hex: string = new CTransactionSegWit(txn).toHex()
    const txId: string = await client.rawtx.send({ hex: hex })

    console.log(`Send TxId: ${txId}`)
  }
}
