import { PlaygroundApiTesting } from '../testing/PlaygroundApiTesting'
import waitForExpect from 'wait-for-expect'
import { PlaygroundProbeIndicator } from '../src/PlaygroundIndicator'
import { PlaygroundBlock } from '../src/PlaygroundBlock'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { StartOptions, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { mining } from '@defichain/jellyfish-api-core'

class PlaygroundApiMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  protected getCmd (opts: StartOptions): string[] {
    // set multiple masternodes to the defid instance to increase probability minting blocks by multiple masternodes
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

async function wait (millis: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(_ => resolve(0), millis)
  })
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
    const blockCount = await testing.container.getBlockCount()
    const playgroundBlock = testing.app.get(PlaygroundBlock)
    // generate next 20 block to confirm multiple masternodes are mining the blocks
    for (let i = 0; i < 20; i++) {
      await playgroundBlock.generate()
      await wait(3000)
    }
    const updatedBlockCount = await testing.container.getBlockCount()
    expect(updatedBlockCount).toBeGreaterThan(blockCount)
    const { masternodes }: mining.MiningInfo = await testing.container.call('getmininginfo', [])
    expect(masternodes.length).toStrictEqual(8)
    // check each masternode minted blocks
    masternodes.forEach((eachNode) => {
      expect(eachNode.mintedblocks).toBeGreaterThan(0)
    })
  })
})
