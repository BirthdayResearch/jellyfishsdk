import { ApiClient } from '@defichain/jellyfish-api-core'
import { AbstractBot, BotLogger } from './AbstractBot'
import { BlockGenerateBot } from './BlockGenerateBot'
import { FoundationBot } from './FoundationBot'

export { BotLogger }

/**
 * Playground Root Bot with all subsequent bot configured to run at boostrap and at each cycle.
 */
export class Playground {
  private readonly bots: AbstractBot[] = []
  private counter: number = 0

  constructor (apiClient: ApiClient, logger: BotLogger) {
    this.bots = [
      new FoundationBot(apiClient, logger),
      new BlockGenerateBot(apiClient, logger)
    ]
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
   * Cycle through all bots
   */
  async cycle (): Promise<void> {
    for (const bot of this.bots) {
      await bot.cycle(this.counter)
    }
    this.counter++
  }
}
