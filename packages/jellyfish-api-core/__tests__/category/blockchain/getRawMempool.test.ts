import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { blockchain } from '../../../src'
import BigNumber from 'bignumber.js'

describe('RawMempool', () => {
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

  it('should getRawMempool and return array of transaction ids', async () => {
    await waitForExpect(async () => {
      await client.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.00001)

      const rawMempool: string[] = await client.blockchain.getRawMempool(false)
      expect(rawMempool.length > 0).toStrictEqual(true)
      expect(typeof rawMempool[0]).toStrictEqual('string')
    }, 10000)
  })

  it('should getRawMempool and return json object', async () => {
    await waitForExpect(async () => {
      const transactionId = await client.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.00001)
      const rawMempool: blockchain.MempoolTx = await client.blockchain.getRawMempool(true)

      const data = rawMempool[transactionId]
      expect(data.fees.base instanceof BigNumber).toStrictEqual(true)
      expect(data.fees.modified instanceof BigNumber).toStrictEqual(true)
      expect(data.fees.ancestor instanceof BigNumber).toStrictEqual(true)
      expect(data.fees.descendant instanceof BigNumber).toStrictEqual(true)
      expect(data.fees.base.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
      expect(data.fees.modified.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
      expect(data.fees.ancestor.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
      expect(data.fees.descendant.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)

      expect(data.fee instanceof BigNumber).toStrictEqual(true)
      expect(data.fee.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
      expect(data.modifiedfee instanceof BigNumber).toStrictEqual(true)
      expect(data.modifiedfee.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)

      expect(data.vsize instanceof BigNumber).toStrictEqual(true)
      expect(data.weight instanceof BigNumber).toStrictEqual(true)
      expect(data.height instanceof BigNumber).toStrictEqual(true)
      expect(data.time instanceof BigNumber).toStrictEqual(true)
      expect(data.vsize.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
      expect(data.weight.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
      expect(data.height.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
      expect(data.time.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)

      expect(typeof data.wtxid).toStrictEqual('string')
      expect(data.depends.length >= 0).toStrictEqual(true)
      expect(data.spentby.length >= 0).toStrictEqual(true)
      expect(data['bip125-replaceable']).toStrictEqual(false)

      expect(data.descendantcount instanceof BigNumber).toStrictEqual(true)
      expect(data.descendantsize instanceof BigNumber).toStrictEqual(true)
      expect(data.descendantfees instanceof BigNumber).toStrictEqual(true)
      expect(data.descendantcount.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
      expect(data.descendantsize.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
      expect(data.descendantfees.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)

      expect(data.ancestorcount instanceof BigNumber).toStrictEqual(true)
      expect(data.ancestorsize instanceof BigNumber).toStrictEqual(true)
      expect(data.ancestorfees instanceof BigNumber).toStrictEqual(true)
      expect(data.ancestorcount.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
      expect(data.ancestorsize.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
      expect(data.ancestorfees.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    })
  })
})
