import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'

describe('transactions without ancestors', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should return empty array for transaction id without ancestors', async () => {
    const txId = await testing.rpc.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.003)
    const mempoolEntry = await testing.rpc.blockchain.getMempoolAncestors(txId)

    expect(mempoolEntry.length).toStrictEqual(0)
  })

  it('should return error if transaction is not in mempool', async () => {
    const txId = '9fb9c46b1d12dae8a4a35558f7ef4b047df3b444b1ead61d334e4f187f5f58b7'
    await expect(testing.rpc.blockchain.getMempoolAncestors(txId))
      .rejects
      .toThrowError('RpcApiError: \'Transaction not in mempool\', code: -5, method: getmempoolancestors')
  })

  it('should return error if transaction id has an invalid length', async () => {
    await expect(testing.rpc.blockchain.getMempoolAncestors('invalidtxidstring'))
      .rejects
      .toThrow('RpcApiError: \'parameter 1 must be of length 64 (not 17, for \'invalidtxidstring\')\', code: -8, method: getmempoolancestors')
  })
})

describe('transactions with ancestors', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    for (let i = 0; i < 3; i++) {
      await testing.rpc.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.003)
    }
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should return JSON object if verbose is true', async () => {
    const txId = await testing.rpc.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.003)
    const mempoolAncestors = await testing.rpc.blockchain.getMempoolAncestors(txId, true)
    const keys = Object.keys(mempoolAncestors)
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(mempoolAncestors[key]).toStrictEqual({
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
    const txId = await testing.rpc.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.003)
    const mempoolAncestors = await testing.rpc.blockchain.getMempoolAncestors(txId, false)
    expect(mempoolAncestors.length).toBeGreaterThan(0)
    for (const ancestorId of mempoolAncestors) {
      expect(ancestorId).toStrictEqual(expect.stringMatching(/^[0-9a-f]{64}$/))
    }
  })

  it('should return array of transaction ids if verbose is undefined', async () => {
    const txId = await testing.rpc.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.003)
    const mempoolAncestors = await testing.rpc.blockchain.getMempoolAncestors(txId)
    expect(mempoolAncestors.length).toBeGreaterThan(0)
    for (const ancestorId of mempoolAncestors) {
      expect(ancestorId).toStrictEqual(expect.stringMatching(/^[0-9a-f]{64}$/))
    }
  })
})
