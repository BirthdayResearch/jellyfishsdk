import { PlaygroundApiTesting } from '../testing/PlaygroundApiTesting'
import waitForExpect from 'wait-for-expect'
import { PlaygroundProbeIndicator } from '../src/PlaygroundIndicator'
import { PlaygroundBlock } from '../src/PlaygroundBlock'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { StartOptions, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { MiningInfo } from '@defichain/jellyfish-api-core/dist/category/mining'

class PlaygroundApiMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      `-masternode_operator=${RegTestFoundationKeys[1].operator.address}`,
      `-masternode_operator=${RegTestFoundationKeys[2].operator.address}`,
      `-masternode_operator=${RegTestFoundationKeys[3].operator.address}`,
      `-masternode_operator=${RegTestFoundationKeys[4].operator.address}`,
      `-masternode_operator=${RegTestFoundationKeys[5].operator.address}`,
      `-masternode_operator=${RegTestFoundationKeys[6].operator.address}`,
      `-masternode_operator=${RegTestFoundationKeys[7].operator.address}`
    ]
  }
}
const testing = PlaygroundApiTesting.create(TestingGroup.create(1, index => new PlaygroundApiMasterNodeRegTestContainer(RegTestFoundationKeys[index])))

beforeAll(async () => {
  await testing.start()

  await waitForExpect(() => {
    expect(testing.app.get(PlaygroundProbeIndicator).ready).toBeTruthy()
  })
})

afterAll(async () => {
  await testing.stop()
})

describe('playgroundBlock', () => {
  it('should be able to mint blocks using multiple nodes', async () => {
    const count = await testing.container.getBlockCount()
    const { masternodes }: MiningInfo = await testing.container.call('getmininginfo', [])
    const playgroundBlock = testing.app.get(PlaygroundBlock)
    for (let i = 0; i < 50; i++) {
      await playgroundBlock.generate()
      await testing.container.generate(1)
    }
    const updatedCount = await testing.container.getBlockCount()
    expect(updatedCount).toBeGreaterThan(count)
    const { masternodes: updatedMasterNodes }: MiningInfo = await testing.container.call('getmininginfo', [])
    updatedMasterNodes.forEach((eachNode) => {
      const currentNode = masternodes.find((each) => each.operator === eachNode.operator)
      expect(eachNode.mintedblocks).toBeGreaterThan(currentNode?.mintedblocks ?? 0)
    })
  })
})
