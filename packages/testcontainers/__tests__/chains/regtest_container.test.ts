import { RegTestContainer } from '../../src'

describe('regtest', () => {
  const container = new RegTestContainer()

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should be block 0 for getmintinginfo rpc', async () => {
    const info = await container.getMintingInfo()
    expect(info.blocks).toBe(0)
    expect(info.chain).toBe('regtest')
  })

  it('should be block 0 for getblockcount rpc', async () => {
    const count = await container.getBlockCount()
    expect(count).toBe(0)
  })

  describe('address', () => {
    it('should be able to getnewaddress', async () => {
      const address = await container.getNewAddress()
      expect(address.length).toBe(44)
    })

    it('should be able to getnewaddress with label and as p2sh-segwit', async () => {
      const address = await container.getNewAddress('not-default', 'p2sh-segwit')
      expect(address.length).toBe(35)
    })

    it('should be able to getnewaddress with label and as legacy', async () => {
      const address = await container.getNewAddress('not-default', 'legacy')
      expect(address.length).toBe(34)
    })
  })
})
