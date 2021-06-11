import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BigNumber } from '../../../src'
import { MempoolInfo } from '../../../src/category/blockchain'

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
    const mempoolInfo: MempoolInfo = await client.blockchain.getMempoolInfo()

    expect(typeof mempoolInfo.loaded).toStrictEqual('boolean')
    expect(mempoolInfo.size instanceof BigNumber).toStrictEqual(true)
    expect(mempoolInfo.bytes instanceof BigNumber).toStrictEqual(true)
    expect(mempoolInfo.usage instanceof BigNumber).toStrictEqual(true)
    expect(mempoolInfo.maxmempool instanceof BigNumber).toStrictEqual(true)
    expect(mempoolInfo.mempoolminfee instanceof BigNumber).toStrictEqual(true)
    expect(mempoolInfo.minrelaytxfee instanceof BigNumber).toStrictEqual(true)
  })
})
