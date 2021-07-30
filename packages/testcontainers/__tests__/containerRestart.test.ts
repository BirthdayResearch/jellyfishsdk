import { MasterNodeRegTestContainer, StartOptions } from '../src'

class CustomMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  // NOTE(surangap): defid command line args has priority over args from defi.conf
  protected getCmd (opts: StartOptions): string[] {
    const cmd = super.getCmd(opts).filter(cmd => cmd !== '-dummypos=1') // remove -dummypos=1
    return [
      ...cmd,
      '-dummypos=0'
    ]
  }
}

describe('container restart', () => {
  const container = new CustomMasterNodeRegTestContainer()

  beforeEach(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should create a masternode and mint some blocks', async () => {
    const masternodeCount1 = await container.call('getactivemasternodecount', [])
    expect(masternodeCount1).toBeLessThan(2)

    const address = await container.getNewAddress('', 'legacy')
    await container.call('createmasternode', [address])
    await container.generate(1)

    await container.restart(['masternode_operator=' + address])
    await container.generate(20)

    // generate blocks for new masternode address
    await container.generate(20, address)

    const masternodeCount2 = await container.call('getactivemasternodecount', [])
    expect(masternodeCount2).toBeGreaterThan(1)
  })
})
