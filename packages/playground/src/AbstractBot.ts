import { ApiClient } from '@defichain/jellyfish-api-core'
import { BotLogger } from './BotLogger'

/**
 * Abstract Playground with bootstrap and cycle ability.
 */
export abstract class AbstractBot {
  constructor (
    protected readonly apiClient: ApiClient,
    protected readonly logger: BotLogger
  ) {
  }

  /**
   * Bootstrap the bot at the start
   */
  async bootstrap (): Promise<void> {
  }

  /**
   * Configured and ran on upstream.
   *
   * @param {number} nextBlockCount
   */
  async cycle (nextBlockCount: number): Promise<void> {
  }
}
