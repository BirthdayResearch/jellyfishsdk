import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'

describe('BlockStats', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should get blockchain stats and return all values', async () => {
    const blockHash = await testing.misc.waitForBlockHash(1)
    const stats = await testing.rpc.blockchain.getBlockStats(blockHash)

    expect(stats.height).toStrictEqual(1)
    expect(stats.minfee).toBeLessThanOrEqual(stats.medianfee)
    expect(stats.medianfee).toBeLessThanOrEqual(stats.maxfee)
    expect(stats.mediantxsize).toBeLessThanOrEqual(stats.maxtxsize)
    expect(stats.avgfeerate).toBeLessThanOrEqual(stats.maxfeerate)
    expect(stats.minfeerate).toBeLessThanOrEqual(stats.maxfeerate)
    expect(stats.mintxsize).toBeLessThanOrEqual(stats.mediantxsize)
    expect(stats.utxo_increase).toStrictEqual(stats.outs - stats.ins)

    expect(typeof stats.utxo_size_inc).toStrictEqual('number')
    expect(typeof stats.avgfee).toStrictEqual('number')
    expect(typeof stats.avgtxsize).toStrictEqual('number')
    expect(typeof stats.blockhash).toStrictEqual('string')
    expect(typeof stats.outs).toStrictEqual('number')
    expect(typeof stats.totalfee).toStrictEqual('number')
    expect(typeof stats.total_out).toStrictEqual('number')
    expect(typeof stats.total_size).toStrictEqual('number')
    expect(typeof stats.total_weight).toStrictEqual('number')
    expect(typeof stats.time).toStrictEqual('number')
    expect(typeof stats.swtotal_size).toStrictEqual('number')
    expect(typeof stats.swtxs).toStrictEqual('number')
    expect(typeof stats.swtxs).toStrictEqual('number')
    expect(typeof stats.swtotal_weight).toStrictEqual('number')
    expect(typeof stats.subsidy).toStrictEqual('number')
    expect(typeof stats.txs).toStrictEqual('number')
    expect(typeof stats.minfeerate).toStrictEqual('number')

    expect(stats.feerate_percentiles.length).toStrictEqual(5)
    expect(stats.feerate_percentiles[0]).toBeLessThanOrEqual(stats.feerate_percentiles[1])
    expect(stats.feerate_percentiles[1]).toBeLessThanOrEqual(stats.feerate_percentiles[2])
    expect(stats.feerate_percentiles[2]).toBeLessThanOrEqual(stats.feerate_percentiles[3])
    expect(stats.feerate_percentiles[3]).toBeLessThanOrEqual(stats.feerate_percentiles[4])
  })

  it('should get blockchain stats with specific values', async () => {
    const blockHash = await testing.misc.waitForBlockHash(1)
    const stats = await testing.rpc.blockchain.getBlockStats(blockHash, ['avgfee', 'height'])

    expect('height' in stats).toStrictEqual(true)
    expect('avgfee' in stats).toStrictEqual(true)
    expect(stats.height).toStrictEqual(1)
    expect(Object.keys(stats).length).toStrictEqual(2)
  })

  it('should fail when a negative height is provided', async () => {
    const promise = testing.rpc.blockchain.getBlockStats(-1, ['avgfee', 'height'])
    await expect(promise).rejects.toThrow('Target block height -1 is negative')
  })
})
