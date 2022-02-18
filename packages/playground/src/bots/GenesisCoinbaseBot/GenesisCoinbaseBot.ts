import { AbstractBot } from '../../AbstractBot'
import { RegTestFoundationKeys, RegTest } from '@defichain/jellyfish-network'
import { CoinbaseProviders } from './__providers'
import { P2WPKHTransactionBuilder } from '@defichain/jellyfish-transaction-builder'
import { CTransactionSegWit, TransactionSegWit } from '@defichain/jellyfish-transaction'
import { SmartBuffer } from 'smart-buffer'

export abstract class GenesisCoinbaseBot<Each> extends AbstractBot {
  static MN_KEY = RegTestFoundationKeys[RegTestFoundationKeys.length - 1]

  providers = new CoinbaseProviders(this.apiClient)

  builder = new P2WPKHTransactionBuilder(
    this.providers.fee,
    this.providers.prevout,
    this.providers.elliptic,
    RegTest
  )

  /**
   * @return {string} address that should be used for everything
   */
  static get address (): string {
    return GenesisCoinbaseBot.MN_KEY.owner.address
  }

  /**
   * @return {string} privKey that should be used for everything
   */
  static get privKey (): string {
    return GenesisCoinbaseBot.MN_KEY.owner.privKey
  }

  async bootstrap (): Promise<void> {
    await this.setup()
  }

  /**
   * Run the setup process
   */
  async setup (): Promise<void> {
    const list = this.list()
    await this.before(list)

    for (const each of list) {
      if (await this.has(each)) {
        continue
      }

      await this.create(each)
    }

    await this.after(list)
  }

  /**
   * Before creating each, optionally execute something
   */
  protected async before (list: Each[]): Promise<void> {
  }

  /**
   * After creating each, optionally execute something
   */
  protected async after (list: Each[]): Promise<void> {
    await this.generate()
  }

  /**
   * @return {Each[]} to setup
   */
  abstract list (): Each[]

  /**
   * @param {Each} each to check if it already exist so that it won't be setup again.
   */
  abstract has (each: Each): Promise<boolean>

  /**
   * @param {Each} each to create
   */
  abstract create (each: Each): Promise<void>

  protected async fund (amount: number): Promise<void> {
    await this.apiClient.wallet.sendToAddress(GenesisCoinbaseBot.address, amount)
    await this.generate()

    const unspent: any[] = await this.apiClient.wallet.listUnspent(
      1, 9999999, { addresses: [GenesisCoinbaseBot.address] }
    )
    if (unspent.length === 0) {
      await this.fund(amount)
    }
  }

  protected async generate (n = 1): Promise<void> {
    await this.apiClient.call('generatetoaddress', [n, GenesisCoinbaseBot.address, 1], 'number')
  }

  protected async sendTransaction (transaction: TransactionSegWit): Promise<string> {
    const buffer = new SmartBuffer()
    new CTransactionSegWit(transaction).toBuffer(buffer)
    const hex = buffer.toBuffer().toString('hex')
    return await this.apiClient.rawtx.sendRawTransaction(hex)
  }
}
