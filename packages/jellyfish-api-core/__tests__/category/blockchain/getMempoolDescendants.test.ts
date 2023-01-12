import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'

describe('Transactions without descendants', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should return empty array for transaction id without descendants', async () => {
    const txId = await testing.rpc.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.003)
    const mempoolDescendants = await testing.rpc.blockchain.getMempoolDescendants(txId)

    expect(mempoolDescendants.length).toStrictEqual(0)
  })

  it('should return error if transaction is not in mempool', async () => {
    const nonExistingTxId = 'a'.repeat(64)
    const promise = testing.rpc.blockchain.getMempoolDescendants(nonExistingTxId)

    await expect(promise)
      .rejects
      .toThrowError('RpcApiError: \'Transaction not in mempool\', code: -5, method: getmempooldescendants')
  })

  it('should return error if transaction id has an invalid length', async () => {
    const invalidLengthTxid = 'a'.repeat(5)
    const promise = testing.rpc.blockchain.getMempoolDescendants(invalidLengthTxid)

    await expect(promise)
      .rejects
      .toThrow(`RpcApiError: 'parameter 1 must be of length 64 (not ${invalidLengthTxid.length}, for '${invalidLengthTxid}')', code: -8, method: getmempooldescendants`)
  })
})

describe('Transactions with descendants', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  async function getTxIdWithDescendants (): Promise<string> {
    const txId = await testing.rpc.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.003)
    for (let i = 0; i < 10; i++) {
      await testing.rpc.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.003)
    }
    return txId
  }

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should return JSON object if verbose is true', async () => {
    const txIdWithDescendants = await getTxIdWithDescendants()
    const mempoolDescendants = await testing.rpc.blockchain.getMempoolDescendants(txIdWithDescendants, true)

    const keys = Object.keys(mempoolDescendants)
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(mempoolDescendants[key]).toStrictEqual({
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
    }
  })

  it('should return array of transaction ids if verbose is false', async () => {
    const txIdWithDescendants = await getTxIdWithDescendants()
    const mempoolDescendants = await testing.rpc.blockchain.getMempoolDescendants(txIdWithDescendants, false)
    expect(mempoolDescendants.length).toBeGreaterThan(0)
    for (const descendantId of mempoolDescendants) {
      expect(descendantId).toStrictEqual(expect.stringMatching(/^[0-9a-f]{64}$/))
    }
  })

  it('should return array of transaction ids if verbose is undefined', async () => {
    const txIdWithDescendants = await getTxIdWithDescendants()
    const mempoolDescendants = await testing.rpc.blockchain.getMempoolDescendants(txIdWithDescendants)
    expect(mempoolDescendants.length).toBeGreaterThan(0)
    for (const descendantId of mempoolDescendants) {
      expect(descendantId).toStrictEqual(expect.stringMatching(/^[0-9a-f]{64}$/))
    }
  })
})
