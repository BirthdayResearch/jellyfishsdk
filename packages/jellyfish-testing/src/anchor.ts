import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingGroup } from './testing'

export class TestingAnchor {
  constructor (
    private readonly container: MasterNodeRegTestContainer,
    private readonly rpc: JsonRpcClient
  ) {
  }

  async generateAnchorAuths (tGroup: TestingGroup, numOfAuths: number, initOffsetHour: number): Promise<void> {
    for (let i = 1; i < 3 + numOfAuths + 1; i += 1) {
      await tGroup.exec(async testing => {
        await testing.misc.offsetTimeHourly(initOffsetHour + i)
      })
      await tGroup.get(0).generate(15)
      await tGroup.waitForSync()
    }
  }
}
