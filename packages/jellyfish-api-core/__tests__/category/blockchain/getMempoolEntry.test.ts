import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import { MempoolTx } from '../../../src/category/blockchain'
import waitForExpect from 'wait-for-expect'

describe('getMempoolEntry', () => {
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
      expect(mempoolEntry).toStrictEqual({
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

  it('should return error for invalid txId', async () => {
    await expect(client.blockchain.getMempoolEntry('6b1bac73bf8071e7edecef30081058f342ff35be12eb2dd3aa1d2ec4933ee798'))
      .rejects.toThrow('RpcApiError: \'Transaction not in mempool\', code: -5, method: getmempoolentry')
  })

  it('should return error for txid of invalid length', async () => {
    await expect(client.blockchain.getMempoolEntry('invalidtxidstring'))
      .rejects.toThrow('RpcApiError: \'parameter 1 must be of length 64 (not 17, for \'invalidtxidstring\')\', code: -8, method: getmempoolentry')
  })
})
