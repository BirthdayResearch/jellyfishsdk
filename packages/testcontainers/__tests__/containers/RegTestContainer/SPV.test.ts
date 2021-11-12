import { RegTestContainer } from '../../../src'

describe('regtest', () => {
  const container = new RegTestContainer()

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should fundAddress', async () => {
    const address = await container.call('spv_getnewaddress')
    const txid = await container.spv.fundAddress(address)
    expect(typeof txid).toStrictEqual('string')

    const addressBalance = await container.call('spv_getbalance')
    expect(addressBalance).toStrictEqual(1)
  })

  it('should setLastHeight', async () => {
    const blockHeight = 10
    await container.spv.setLastHeight(blockHeight)

    const status = await container.call('spv_syncstatus')
    expect(status.current).toStrictEqual(blockHeight)
  })
})
