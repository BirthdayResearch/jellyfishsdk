import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { MempoolTx } from '../../../src/category/blockchain'
import waitForExpect from 'wait-for-expect'
import { Testing } from '@defichain/jellyfish-testing'

describe('getMempoolDescendants', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should return no descendant ids for tx without descendants', async () => {
    const txId = await testing.rpc.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.0003)
    const mempoolEntry: string[] = await testing.rpc.blockchain.getMempoolDescendants(txId, false)
    expect(mempoolEntry.length).toStrictEqual(0)
  })

  it('should return JSON object if verbose is true', async () => {
    const ancestorTxId = await testing.rpc.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.0003)
    await waitForExpect(async () => {
      await testing.rpc.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.0003)
      const mempoolEntry: MempoolTx = await testing.rpc.blockchain.getMempoolDescendants(ancestorTxId, true)
      expect(mempoolEntry.length).toBeGreaterThan(0)
    }, 10000)

    const entryKey = Object.keys(mempoolEntry)[0]
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
  })

  it('should return array of txids if verbose is false', async () => {
    const ancestorTxId = await testing.rpc.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.0003)
    await waitForExpect(async () => {
      await testing.rpc.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.0003)
      const mempoolEntry: string[] = await testing.rpc.blockchain.getMempoolDescendants(ancestorTxId, false)
      expect(mempoolEntry.length).toBeGreaterThan(0)
    }, 10000)
  })

  it('should return error if tx not in mempool', async () => {
    const txId = '9fb9c46b1d12dae8a4a35558f7ef4b047df3b444b1ead61d334e4f187f5f58b7'
    await waitForExpect(async () => {
      await expect(testing.rpc.blockchain.getMempoolDescendants(txId, false)).rejects
        .toThrow('RpcApiError: \'Transaction not in mempool\', code: -5, method: getmempooldescendants')
    }, 10000)
  })
})
