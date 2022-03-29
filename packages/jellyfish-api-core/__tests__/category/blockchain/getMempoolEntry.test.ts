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
      const txId = await client.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.002)
      const mempoolEntry: MempoolTx = await client.blockchain.getMempoolEntry(txId)
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

  it('should return error for invalid txId', async () => {
    const invalidTxIdErr = /RpcApiError: 'Transaction not in mempool', code: -5, method: getmempoolentry/
    await expect(client.blockchain.getMempoolEntry('6b1bac73bf8071e7edecef30081058f342ff35be12eb2dd3aa1d2ec4933ee798'))
      .rejects.toThrow(invalidTxIdErr)
  })

  it('should return error for txid of invalid length', async () => {
    const invalidtxidstring = "RpcApiError: 'parameter 1 must be of length 64 (not 17, for 'invalidtxidstring')', code: -8, method: getmempoolentry"
    await expect(client.blockchain.getMempoolEntry('invalidtxidstring')).rejects.toThrow(invalidtxidstring)
  })
})
