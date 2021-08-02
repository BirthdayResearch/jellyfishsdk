import { GenesisKeys, MasterNodeRegTestContainer } from '../../src'

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

    await container.setDeFiConf(['masternode_operator=' + address])
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
