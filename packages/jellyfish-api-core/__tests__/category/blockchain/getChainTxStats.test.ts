import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { Block } from '../../../src/category/blockchain'

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

    expect(stats.txcount).toStrictEqual(12)
    expect(stats.window_final_block_hash).toStrictEqual(blockHash)
    expect(stats.window_final_block_height).toStrictEqual(3)
    expect(stats.window_block_count).toStrictEqual(2)
    expect(stats.window_tx_count).toStrictEqual(2)
    expect(stats.window_interval).toStrictEqual(2)
    expect(stats.txrate).toStrictEqual(1)

    const block: Block<string> = await testing.rpc.blockchain.getBlock(blockHash, 1)
    expect(stats.time).toStrictEqual(block.time)
  })

  it('should getChainTxStats for all blocks excl. genesis when called with default arguments', async () => {
    await testing.misc.waitForBlockHash(4)
    const bestHash = await testing.rpc.blockchain.getBestBlockHash()

    const stats = await testing.rpc.blockchain.getChainTxStats() // all 4 blocks excl genesis
    const statsFromBestHash = await testing.rpc.blockchain.getChainTxStats(4, bestHash) // equivalent
    expect(stats).toStrictEqual(statsFromBestHash)

    expect(stats.txcount).toStrictEqual(14)
    expect(stats.window_final_block_hash).toStrictEqual(bestHash)
    expect(stats.window_final_block_height).toStrictEqual(5)
    expect(stats.window_block_count).toStrictEqual(4)
    expect(stats.window_tx_count).toStrictEqual(4)
    expect(stats.window_interval).toStrictEqual(2)
    expect(stats.txrate).toStrictEqual(2)

    const bestBlock: Block<string> = await testing.rpc.blockchain.getBlock(bestHash, 1)
    expect(stats.time).toStrictEqual(bestBlock.time)
  })

  it('should getChainTxStats for blocks referencing chain tip when called with nBlocks', async () => {
    await testing.misc.waitForBlockHash(4)
    const bestHash = await testing.rpc.blockchain.getBestBlockHash()

    const stats = await testing.rpc.blockchain.getChainTxStats(3)
    const statsFromBestHash = await testing.rpc.blockchain.getChainTxStats(3, bestHash) // equivalent
    expect(stats).toStrictEqual(statsFromBestHash)

    expect(stats.txcount).toStrictEqual(14)
    expect(stats.window_final_block_hash).toStrictEqual(bestHash)
    expect(stats.window_final_block_height).toStrictEqual(5)
    expect(stats.window_block_count).toStrictEqual(3)
    expect(stats.window_tx_count).toStrictEqual(3)
    expect(stats.window_interval).toStrictEqual(2)
    expect(stats.txrate).toStrictEqual(1.5)

    const bestBlock: Block<string> = await testing.rpc.blockchain.getBlock(bestHash, 1)
    expect(stats.time).toStrictEqual(bestBlock.time)
  })

  it('should getChainTxStats for block and all ancestor blocks when called with blockHash', async () => {
    const blockHash = await testing.misc.waitForBlockHash(4)

    const stats = await testing.rpc.blockchain.getChainTxStats(undefined, blockHash)
    const statsFromNBlocks = await testing.rpc.blockchain.getChainTxStats(3, blockHash) // equivalent
    expect(stats).toStrictEqual(statsFromNBlocks)

    expect(stats.txcount).toStrictEqual(13)
    expect(stats.window_final_block_hash).toStrictEqual(blockHash)
    expect(stats.window_final_block_height).toStrictEqual(4)
    expect(stats.window_block_count).toStrictEqual(3)
    expect(stats.window_tx_count).toStrictEqual(3)
    expect(stats.window_interval).toStrictEqual(2)
    expect(stats.txrate).toStrictEqual(1.5)

    const block: Block<string> = await testing.rpc.blockchain.getBlock(blockHash, 1)
    expect(stats.time).toStrictEqual(block.time)
  })

  it('should not getChainTxStats if block count < 0 or >= block\'s height - 1', async () => {
    const blockHash = await testing.misc.waitForBlockHash(3)

    const expectedError = /RpcApiError: 'Invalid block count: should be between 0 and the block's height - 1', code: -8, method: getchaintxstats/
    await expect(testing.rpc.blockchain.getChainTxStats(-1, blockHash)).rejects.toThrowError(expectedError)
    await expect(testing.rpc.blockchain.getChainTxStats(3, blockHash)).rejects.toThrowError(expectedError)
    await expect(testing.rpc.blockchain.getChainTxStats(4, blockHash)).rejects.toThrowError(expectedError)

    await expect(testing.rpc.blockchain.getChainTxStats(0, blockHash)).resolves.toBeTruthy()
    await expect(testing.rpc.blockchain.getChainTxStats(1, blockHash)).resolves.toBeTruthy()
    await expect(testing.rpc.blockchain.getChainTxStats(2, blockHash)).resolves.toBeTruthy()
  })

  it('should not getChainTxStats if blockhash is not a valid hash', async () => {
    await testing.misc.waitForBlockHash(3)
    await expect(testing.rpc.blockchain.getChainTxStats(1, '0'))
      .rejects
      .toThrowError("RpcApiError: 'blockhash must be of length 64 (not 1, for '0')', code: -8, method: getchaintxstats")
  })

  it('should not getChainTxStats if blockhash doesnt exist', async () => {
    await testing.misc.waitForBlockHash(3)
    await expect(testing.rpc.blockchain.getChainTxStats(1, '0'.repeat(64)))
      .rejects
      .toThrowError(/RpcApiError: 'Block not found', code: -5, method: getchaintxstats/)
  })
})
