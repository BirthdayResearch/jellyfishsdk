import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'

export class TestingMisc {
  constructor (
    private readonly container: MasterNodeRegTestContainer,
    private readonly rpc: JsonRpcClient
  ) {
  }

  /**
   * Offset time hourly
   * @param {number} offsetBy can be positive/negative value to determine offset into future or past
   * @return {Promise<void>}
   */
  async offsetTimeHourly (offsetBy: number): Promise<void> {
    const offset = Date.now() + (offsetBy * 60 * 60 * 1000)
    await this.rpc.misc.setMockTime(offset)
  }

  /**
   * Wait for block hash to reach a certain height
   */
  async waitForBlockHash (height: number): Promise<string> {
    await this.container.waitForBlockHeight(height)
    return await this.rpc.blockchain.getBlockHash(height)
  }
}
