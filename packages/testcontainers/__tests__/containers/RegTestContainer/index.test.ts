import { RegTestContainer } from '../../../src'

describe('regtest', () => {
  const container = new RegTestContainer()

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should be block 0 for getmininginfo rpc', async () => {
    const info = await container.getMiningInfo()
    expect(info.blocks).toStrictEqual(0)
    expect(info.chain).toStrictEqual('regtest')
  })

  it('should be block 0 for getblockcount rpc', async () => {
    const count = await container.getBlockCount()
    expect(count).toStrictEqual(0)
  })

  describe('address', () => {
    it('should be able to getnewaddress', async () => {
      const address = await container.getNewAddress()
      expect(address.length).toStrictEqual(44)
    })

    it('should be able to getnewaddress with label and as p2sh-segwit', async () => {
      const address = await container.getNewAddress('not-default', 'p2sh-segwit')
      expect(address.length).toStrictEqual(35)
    })

    it('should be able to getnewaddress with label and as legacy', async () => {
      const address = await container.getNewAddress('not-default', 'legacy')
      expect(address.length).toStrictEqual(34)
    })

    it('should be able to getnewaddress with label and as eth', async () => {
      const address = await container.getNewAddress('not-default', 'eth')
      // NOTE(canonbrother): eth addr validation refers to
      // https://github.com/ethers-io/ethers.js/blob/5210b68a7837654c6b84207a45e1e573d9472d1a/src.ts/address/address.ts#L123
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/gm)
      expect(address.length).toStrictEqual(42)
    })
  })
})
