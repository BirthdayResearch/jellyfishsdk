import { MasterNodeRegTestContainer, RegTestContainer, GenesisKeys } from '../../src'
import waitForExpect from 'wait-for-expect'

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

describe('master node pos minting', () => {
  const container = new MasterNodeRegTestContainer()

  beforeEach(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should auto generate coin in master node mode', async () => {
    await waitForExpect(async () => {
      const info = await container.getMintingInfo()
      expect(info.blocks).toBeGreaterThan(3)
    })
  })

  it('should wait until coinbase maturity with spendable balance', async () => {
    const key = GenesisKeys[2].operator
    await container.waitForWalletCoinbaseMaturity()
    await container.generate(10, key.address)

    await waitForExpect(async () => {
      const info = await container.getMintingInfo()
      expect(info.blocks).toBeGreaterThan(100)
    })

    await container.generate(3)

    await waitForExpect(async () => {
      const balance = await container.call('getbalance')
      expect(balance).toBeGreaterThan(150)
    })
  })

  it('should be able to perform amk rpc feature', async () => {
    await container.generate(105)

    const address = await container.getNewAddress()
    const payload: { [key: string]: string } = {}
    payload[address] = '100@0'
    await container.call('utxostoaccount', [payload])
  })
})
