import { TestingGroup } from '@defichain/jellyfish-testing'
import { net } from '../../../src'

describe('Network without masternode', () => {
  const tgroup = TestingGroup.create(2)
  const { rpc: { net } } = tgroup.get(0)

  beforeAll(async () => {
    await tgroup.start()
  })

  afterAll(async () => {
    await tgroup.stop()
  })

  it('should getNetTotals', async () => {
    const info: net.NetTotals = await net.getNetTotals()

    expect(info).toStrictEqual({
      totalbytesrecv: expect.any(Number),
      totalbytessent: expect.any(Number),
      timemillis: expect.any(Number),
      uploadtarget: expect.any(Object)
    })

    expect(info.uploadtarget).toStrictEqual({
      timeframe: expect.any(Number),
      target: expect.any(Number),
      target_reached: expect.any(Boolean),
      serve_historical_blocks: expect.any(Boolean),
      bytes_left_in_cycle: expect.any(Number),
      time_left_in_cycle: expect.any(Number)
    })
  })
})
