import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers/dist/index'
import { net } from '../../../src'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Network without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getNetTotals', async () => {
    const info: net.NetTotals = await client.net.getNetTotals()

    expect(info).toStrictEqual({
      totalbytesrecv: expect.any(Number),
      totalbytessent: expect.any(Number),
      timemillis: expect.any(Number),
      uploadtarget: {
        timeframe: expect.any(Number),
        target: expect.any(Number),
        target_reached: expect.any(Boolean),
        serve_historical_blocks: expect.any(Boolean),
        bytes_left_in_cycle: expect.any(Number),
        time_left_in_cycle: expect.any(Number)
      }
    })
  })
})

describe('Network on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getNetTotals', async () => {
    const info: net.NetTotals = await client.net.getNetTotals()

    expect(info).toStrictEqual({
      totalbytesrecv: expect.any(Number),
      totalbytessent: expect.any(Number),
      timemillis: expect.any(Number),
      uploadtarget: {
        timeframe: expect.any(Number),
        target: expect.any(Number),
        target_reached: expect.any(Boolean),
        serve_historical_blocks: expect.any(Boolean),
        bytes_left_in_cycle: expect.any(Number),
        time_left_in_cycle: expect.any(Number)
      }
    })
  })
})
