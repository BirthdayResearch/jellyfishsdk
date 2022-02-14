import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'

describe('ChainTxStats', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getChainTxStats for selected interval', async () => {
    const blockHash = await testing.misc.waitForBlockHash(3)
    const stats = await testing.rpc.blockchain.getChainTxStats(2, blockHash)

    expect(stats.time).toBeGreaterThan(1550000000)
    expect(stats.txcount).toStrictEqual(12)
    expect(stats.window_final_block_hash.length).toStrictEqual(64)
    expect(stats.window_final_block_height).toStrictEqual(3)
    expect(stats.window_block_count).toStrictEqual(2)
    expect(stats.window_tx_count).toStrictEqual(2)
    expect(stats.window_interval).toStrictEqual(2)
    expect(stats.txrate).toStrictEqual(1)

    expect(typeof stats.time).toStrictEqual('number')
    expect(typeof stats.txcount).toStrictEqual('number')
    expect(typeof stats.window_final_block_hash).toStrictEqual('string')
    expect(typeof stats.window_final_block_height).toStrictEqual('number')
    expect(typeof stats.window_block_count).toStrictEqual('number')
    expect(typeof stats.window_tx_count).toStrictEqual('number')
    expect(typeof stats.window_interval).toStrictEqual('number')
    expect(typeof stats.txrate).toStrictEqual('number')
  })

  it('should getChainTxStats for all blocks excl. genesis when called with default arguments', async () => {
    await testing.misc.waitForBlockHash(4)
    const tipHash = await testing.rpc.blockchain.getBlockHash(5)

    const stats = await testing.rpc.blockchain.getChainTxStats() // all 4 blocks excl genesis
    const statsFromTipHash = await testing.rpc.blockchain.getChainTxStats(4, tipHash) // equivalent
    expect(stats).toStrictEqual(statsFromTipHash)

    expect(stats.txcount).toStrictEqual(14)
    expect(stats.window_final_block_height).toStrictEqual(5)
    expect(stats.window_block_count).toStrictEqual(4)
    expect(stats.window_tx_count).toStrictEqual(4)
    expect(stats.window_interval).toStrictEqual(2)
    expect(stats.txrate).toStrictEqual(2)
    expect(stats.time).toBeGreaterThan(1550000000)
    expect(stats.window_final_block_hash.length).toStrictEqual(64)
  })

  it('should getChainTxStats for blocks referencing chain tip when called with nBlocks', async () => {
    await testing.misc.waitForBlockHash(4)
    const tipHash = await testing.rpc.blockchain.getBlockHash(5)

    const stats = await testing.rpc.blockchain.getChainTxStats(3)
    const statsFromTipHash = await testing.rpc.blockchain.getChainTxStats(3, tipHash) // equivalent
    expect(stats).toStrictEqual(statsFromTipHash)

    expect(stats.txcount).toStrictEqual(14)
    expect(stats.window_final_block_height).toStrictEqual(5)
    expect(stats.window_block_count).toStrictEqual(3)
    expect(stats.window_tx_count).toStrictEqual(3)
    expect(stats.window_interval).toStrictEqual(2)
    expect(stats.txrate).toStrictEqual(1.5)
    expect(stats.time).toBeGreaterThan(1550000000)
    expect(stats.window_final_block_hash.length).toStrictEqual(64)
  })

  it('should getChainTxStats for block and all ancestor blocks when called with blockHash', async () => {
    const blockHash = await testing.misc.waitForBlockHash(4)

    const stats = await testing.rpc.blockchain.getChainTxStats(undefined, blockHash)
    const statsWithNBlocks = await testing.rpc.blockchain.getChainTxStats(3, blockHash) // equivalent
    expect(stats).toStrictEqual(statsWithNBlocks)

    expect(stats.txcount).toStrictEqual(13)
    expect(stats.window_final_block_height).toStrictEqual(4)
    expect(stats.window_block_count).toStrictEqual(3)
    expect(stats.window_tx_count).toStrictEqual(3)
    expect(stats.window_interval).toStrictEqual(2)
    expect(stats.txrate).toStrictEqual(1.5)
    expect(stats.time).toBeGreaterThan(1550000000)
    expect(stats.window_final_block_hash.length).toStrictEqual(64)
  })
})
