import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('getMempoolInfo', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getMempoolInfo', async () => {
    const mempoolInfo = await client.blockchain.getMempoolInfo()

    expect(typeof mempoolInfo.loaded).toStrictEqual('boolean')
    expect(typeof mempoolInfo.size).toStrictEqual('number')
    expect(typeof mempoolInfo.bytes).toStrictEqual('number')
    expect(typeof mempoolInfo.usage).toStrictEqual('number')
    expect(typeof mempoolInfo.maxmempool).toStrictEqual('number')
    expect(typeof mempoolInfo.mempoolminfee).toStrictEqual('number')
    expect(typeof mempoolInfo.minrelaytxfee).toStrictEqual('number')
  })
})
