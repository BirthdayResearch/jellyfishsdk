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
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })
  it('should getMempoolAncestors and return JSON object if verbose is true', async () => {
    await waitForExpect(async () => {
      const txId = await client.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.00003)
      const mempoolEntry: MempoolTx = await client.blockchain.getMempoolAncestors(txId, true)
      console.log(mempoolEntry)
      console.log('=------BREAK0-000---------=')
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

  it('should getMempoolAncestors and return array of txids if verbose is false', async () => {
    await waitForExpect(async () => {
      const txId = await client.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.00003)
      const mempoolEntry: string[] = await client.blockchain.getMempoolAncestors(txId, false)
      expect(mempoolEntry.length).toBeGreaterThan(0)
    }, 10000)
  })
})
