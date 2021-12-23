import { ApiClient } from '@defichain/jellyfish-api-core'

export interface BotLogger {
  info: (action: string, message: string) => void
}

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
   * PlaygroundBot is configured to cycle every block generation.
   * Configured at upstream implementation, currently default to 3 second.
   *
   * @param {number} counter that increment per block increment
   */
  async cycle (counter: number): Promise<void> {

  }
}
