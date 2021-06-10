import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BigNumber } from '../../../src'

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
    expect(mempoolInfo.size).toBeInstanceOf(BigNumber)
    expect(mempoolInfo.bytes).toBeInstanceOf(BigNumber)
    expect(mempoolInfo.usage).toBeInstanceOf(BigNumber)
    expect(mempoolInfo.maxmempool).toBeInstanceOf(BigNumber)
    expect(mempoolInfo.mempoolminfee).toBeInstanceOf(BigNumber)
    expect(mempoolInfo.minrelaytxfee).toBeInstanceOf(BigNumber)
  })
})
