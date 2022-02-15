import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { Injectable } from '@nestjs/common'
import { GenesisKeys } from '@defichain/testcontainers'
import { Interval } from '@nestjs/schedule'

@Injectable()
export abstract class PlaygroundBot<Each> {
  static MN_KEY = GenesisKeys[0]

  /**
   * @return {string} address that should be used for everything
   */
  static get address (): string {
    return PlaygroundBot.MN_KEY.operator.address
  }

  /**
   * @return {string} privKey that should be used for everything
   */
  static get privKey (): string {
    return PlaygroundBot.MN_KEY.operator.privKey
  }

  constructor (protected readonly client: JsonRpcClient) {
  }

  @Interval(5000)
  async runAll (): Promise<void> {
    const list = this.list()
    for (const each of list) {
      if (!await this.has(each)) {
        continue
      }

      await this.run(each)
    }
  }

  /**
   * @return {Each[]} to run
   */
  abstract list (): Each[]

  /**
   * @param {Each} each to run
   */
  abstract run (each: Each): Promise<void>

  /**
   * @param {Each} each to check if it exists so we can run.
   */
  abstract has (each: Each): Promise<boolean>
}
