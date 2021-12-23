import { AbstractBot } from '../AbstractBot'
import { FoundationBot } from './FoundationBot'

/**
 * Generate a block every cycle
 */
export class BlockGenerateBot extends AbstractBot {
  private static randomNodeAddress (): string {
    const items = FoundationBot.Keys
    return items[Math.floor(Math.random() * items.length)].operator.address
  }

  /**
   * Generate a block every cycle into a random node address from the foundation keys list
   */
  async cycle (nextBlockCount: number): Promise<void> {
    await this.apiClient.call('generatetoaddress', [1, BlockGenerateBot.randomNodeAddress(), 1], 'number')
    this.logger.info('BlockGenerate', `height: ${nextBlockCount}`)
  }
}
