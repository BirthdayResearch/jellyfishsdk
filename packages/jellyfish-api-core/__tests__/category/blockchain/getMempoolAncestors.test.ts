import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import { MempoolTx } from '../../../src/category/blockchain'
import waitForExpect from 'wait-for-expect'

describe('getMempoolAncestors', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should return no ancestor ids for tx without ancestors', async () => {
    await waitForExpect(async () => {
      const txId = await client.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.0003)
      const mempoolEntry: string[] = await client.blockchain.getMempoolAncestors(txId, false)
      expect(mempoolEntry.length).toStrictEqual(0)
    }, 10000)
  })

  it('should return JSON object if verbose is true', async () => {
    await waitForExpect(async () => {
      const txId = await client.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.0003)
      const mempoolEntry: MempoolTx = await client.blockchain.getMempoolAncestors(txId, true)
      const entryKey = Object.keys(mempoolEntry)[0]
      expect(Object.keys(mempoolEntry).length).toBeGreaterThan(0)
      expect(mempoolEntry[entryKey]).toStrictEqual({
        fees: expect.any(Object),
        vsize: expect.any(BigNumber),
        weight: expect.any(BigNumber),
        fee: expect.any(BigNumber),
        modifiedfee: expect.any(BigNumber),
        time: expect.any(BigNumber),
        height: expect.any(BigNumber),
        descendantcount: expect.any(BigNumber),
        descendantsize: expect.any(BigNumber),
        descendantfees: expect.any(BigNumber),
        ancestorcount: expect.any(BigNumber),
        ancestorsize: expect.any(BigNumber),
        ancestorfees: expect.any(BigNumber),
        wtxid: expect.any(String),
        depends: expect.any(Array),
        spentby: expect.any(Array),
        'bip125-replaceable': expect.any(Boolean)
      })
    }, 10000)
  })

  it('should return array of txids if verbose is false', async () => {
    await waitForExpect(async () => {
      const txId = await client.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.0003)
      const mempoolEntry: string[] = await client.blockchain.getMempoolAncestors(txId, false)
      expect(mempoolEntry.length).toBeGreaterThan(0)
    }, 10000)
  })

  it('should return error if tx not in mempool', async () => {
    await waitForExpect(async () => {
      const txId = '9fb9c46b1d12dae8a4a35558f7ef4b047df3b444b1ead61d334e4f187f5f58b7'
      await expect(client.blockchain.getMempoolAncestors(txId, false)).rejects.toThrow('RpcApiError: \'Transaction not in mempool\', code: -5, method: getmempoolancestors')
    }, 10000)
  })
})
