import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'

describe('clear mempool', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should clear mempool and return the removed transaction ids', async () => {
    const createdTxId = await testing.rpc.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.003)

    const txIdsInMempoolBefore = await testing.rpc.blockchain.getRawMempool(false)
    expect(txIdsInMempoolBefore.length).toBe(1)

    const removedTxIds = await testing.rpc.masternode.clearMempool()

    expect(removedTxIds).toContain(createdTxId)

    const txIdsInMempoolAfter = await testing.rpc.blockchain.getRawMempool(false)
    expect(txIdsInMempoolAfter.length).toBe(0)
  })
})
