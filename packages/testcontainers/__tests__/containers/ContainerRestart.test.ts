import { GenesisKeys, MasterNodeRegTestContainer } from '../../src'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { TestingGroup } from '@defichain/jellyfish-testing'

describe('container restart with setDeFiConf', () => {
  const container = new MasterNodeRegTestContainer()

  beforeEach(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should create a masternode and mint some blocks with setDeFiConf masternode_operator=', async () => {
    const masternodeCount1 = await container.call('getactivemasternodecount', [])
    expect(masternodeCount1).toBeLessThan(2)

    const address = await container.getNewAddress('', 'legacy')
    await container.call('createmasternode', [address])
    await container.generate(1)

    await container.setDeFiConf([`masternode_operator=${address}`])
    await container.restart()

    await container.generate(20)

    // generate blocks for new masternode address
    await container.generate(20, address)

    const masternodeCount2 = await container.call('getactivemasternodecount', [])
    expect(masternodeCount2).toBeGreaterThan(1)

    const masternodes: Record<string, any> = await container.call('listmasternodes', [])
    Object.entries(masternodes).forEach(([, value]) => {
      if (value.operatorAuthAddress === address || value.operatorAuthAddress === GenesisKeys[0].operator.address) {
        expect(value.mintedBlocks).toBeGreaterThan(0)
      }
    })
  })
})

describe('container group restart', () => {
  const tGroup = TestingGroup.create(2, i => new MasterNodeRegTestContainer(RegTestFoundationKeys[i]))
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)

  beforeAll(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('test container group restart', async () => {
    {
      const mnAddr = await alice.container.getNewAddress('', 'legacy')
      const mnId1 = await alice.container.call('createmasternode', [mnAddr])
      await alice.container.generate(1)

      await alice.container.setDeFiConf([`masternode_operator=${mnAddr}`])
      await alice.container.restart()
      await tGroup.link()
      await tGroup.waitForSync()

      await alice.generate(20)
      await alice.container.generate(5, mnAddr)

      await alice.container.call('getmasternodeblocks', [{ id: mnId1 }])
      await alice.container.call('getmasternodeblocks', [{ id: mnId1 }, 1])
      await tGroup.waitForSync()
    }

    {
      const mnAddr = await bob.container.getNewAddress('', 'legacy')
      const mnId1 = await bob.container.call('createmasternode', [mnAddr])
      await bob.container.generate(1)
      await tGroup.waitForSync()

      await bob.container.setDeFiConf([`masternode_operator=${mnAddr}`])
      await bob.container.restart()
      await tGroup.link()

      await bob.generate(20)
      await tGroup.waitForSync()
      await bob.container.generate(5, mnAddr)

      await bob.container.call('getmasternodeblocks', [{ id: mnId1 }])
      await bob.container.call('getmasternodeblocks', [{ id: mnId1 }, 1])
    }
  })
})
