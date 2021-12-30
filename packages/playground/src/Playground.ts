import { ApiClient } from '@defichain/jellyfish-api-core'
import { BotLogger } from './BotLogger'
import { AbstractBot } from './AbstractBot'
import { BlockGenerateBot } from './bots/BlockGenerateBot'
import { FoundationBot } from './bots/FoundationBot'

/**
 * Playground Root Bot with all subsequent bot configured to run at boostrap and at each cycle.
 */
export class Playground {
  private readonly bots: AbstractBot[] = []
  private readonly generate: BlockGenerateBot

  constructor (private readonly apiClient: ApiClient, logger: BotLogger) {
    this.bots = [
      new FoundationBot(apiClient, logger)
    ]
    this.generate = new BlockGenerateBot(apiClient, logger)
  }

  /**
   * Bootstrapping of all bots
   */
  async bootstrap (): Promise<void> {
    for (const bot of this.bots) {
      await bot.bootstrap()
    }
  }

  /**
   * Cycle through all bots, generate will always be cycled last.
   */
  async cycle (): Promise<void> {
    const count = await this.apiClient.blockchain.getBlockCount()
    const next = count + 1

    for (const bot of this.bots) {
      await bot.cycle(next)
    }
    await this.generate.cycle(next)
  }
}
