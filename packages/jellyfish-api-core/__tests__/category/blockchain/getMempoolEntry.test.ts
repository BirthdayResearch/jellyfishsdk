import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import { MempoolTx } from '../../../src/category/blockchain'
import waitForExpect from 'wait-for-expect'

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

  it('should getMempoolEntry and return MempoolTx', async () => {
    await waitForExpect(async () => {
      const txId = await client.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.00001)
      const mempoolEntry: MempoolTx = await client.blockchain.getMempoolEntry(txId)
      console.log(mempoolEntry)
      expect(mempoolEntry.vsize instanceof BigNumber).toStrictEqual(true)
      expect(mempoolEntry.weight instanceof BigNumber).toStrictEqual(true)
      expect(mempoolEntry.fee instanceof BigNumber).toStrictEqual(true)
      expect(mempoolEntry.modifiedfee instanceof BigNumber).toStrictEqual(true)
      expect(mempoolEntry.time instanceof BigNumber).toStrictEqual(true)
      expect(mempoolEntry.height instanceof BigNumber).toStrictEqual(true)
      expect(mempoolEntry.descendantcount instanceof BigNumber).toStrictEqual(true)
      expect(mempoolEntry.descendantsize instanceof BigNumber).toStrictEqual(true)
      expect(mempoolEntry.descendantfees instanceof BigNumber).toStrictEqual(true)
      expect(mempoolEntry.ancestorcount instanceof BigNumber).toStrictEqual(true)
      expect(mempoolEntry.ancestorsize instanceof BigNumber).toStrictEqual(true)
      expect(mempoolEntry.ancestorfees instanceof BigNumber).toStrictEqual(true)
      expect(typeof mempoolEntry.wtxid).toStrictEqual('string')
      expect(typeof mempoolEntry['bip125-replaceable']).toStrictEqual('boolean')
    }, 10000)
  })
})
