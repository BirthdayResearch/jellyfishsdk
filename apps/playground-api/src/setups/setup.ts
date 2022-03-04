import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { Injectable, Logger } from '@nestjs/common'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

@Injectable()
export abstract class PlaygroundSetup<Each> {
  static MN_KEY = RegTestFoundationKeys[0]

  /**
   * @return {string} address that should be used for everything
   */
  static get address (): string {
    return PlaygroundSetup.MN_KEY.operator.address
  }

  /**
   * @return {string} privKey that should be used for everything
   */
  static get privKey (): string {
    return PlaygroundSetup.MN_KEY.operator.privKey
  }

  private readonly logger = new Logger(PlaygroundSetup.name)

  constructor (protected readonly client: JsonRpcClient) {
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
    await this.generate(1)
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

  /**
   * @param {number} count of blocks to generate
   */
  protected async generate (count: number): Promise<void> {
    let current = await this.client.blockchain.getBlockCount()
    const target = current + count
    while (current < target) {
      this.logger.log(`current block: ${current}, generate +${count} block`)
      await this.generateToAddress()
      current = await this.client.blockchain.getBlockCount()
    }
  }

  /**
   * @param {number} balance to wait for wallet to reach
   */
  protected async waitForBalance (balance: number): Promise<void> {
    let current = await this.client.wallet.getBalance()
    while (current.lt(balance)) {
      this.logger.log(`current balance: ${current.toFixed(8)}, generate to balance: ${balance}`)
      await this.generateToAddress()
      current = await this.client.wallet.getBalance()
    }
  }

  private async generateToAddress (): Promise<void> {
    await this.client.call('generatetoaddress', [1, PlaygroundSetup.address, 1], 'number')
    await this.wait(200)
  }

  private async wait (millis: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(_ => resolve(0), millis)
    })
  }
}
