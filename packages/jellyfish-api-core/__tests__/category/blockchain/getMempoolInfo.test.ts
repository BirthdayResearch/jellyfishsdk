import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
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
    expect(typeof mempoolInfo.size).toStrictEqual('number')
    expect(typeof mempoolInfo.bytes).toStrictEqual('number')
    expect(typeof mempoolInfo.usage).toStrictEqual('number')
    expect(typeof mempoolInfo.maxmempool).toStrictEqual('number')
    expect(mempoolInfo.mempoolminfee instanceof BigNumber).toStrictEqual(true)
    expect(mempoolInfo.minrelaytxfee instanceof BigNumber).toStrictEqual(true)
  })
})
