import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import waitForExpect from 'wait-for-expect'
import { RichListCore } from '../src/RichListCore'
import { RichListCoreTest, waitForCatchingUp } from '../test/RichListCoreTest'

// addresses used by MNRegTest (default elliptic pair), up to `waitForWalletCoinbaseMaturity()`
// reproducible results, mn always derive new addresses following same HD paths in sequence
const EXPECTED_RICH_LIST_ADDRESSES = [
  'mps7BdmwEF2vQ9DREDyNPibqsuSRZ8LuwQ',
  'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU',
  'msER9bmJjyEemRpQoS8YYVL21VyZZrSgQ7',
  'myF3aHuxtEuqqTw44EurtVs6mjyc1QnGUS',
  'mwyaBGGE7ka58F7aavH5hjMVdJENP9ZEVz',
  'mgsE1SqrcfUhvuYuRjqy6rQCKmcCVKNhMu',
  'mud4VMfbBqXNpbt8ur33KHKx8pk3npSq8c',
  'bcrt1qyrfrpadwgw7p5eh3e9h3jmu4kwlz4prx73cqny',
  'bcrt1qyeuu9rvq8a67j86pzvh5897afdmdjpyankp4mu',
  'mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy',
  '2NCWAKfEehP3qibkLKYQjXaWMK23k4EDMVS'
]

describe('RichListCore', () => {
  let container!: MasterNodeRegTestContainer
  let apiClient!: JsonRpcClient
  let richListCore!: RichListCore

  beforeEach(async () => {
    container = new MasterNodeRegTestContainer()
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    apiClient = new JsonRpcClient(await container.getCachedRpcUrl())
    richListCore = RichListCoreTest(apiClient)
  })

  afterEach(async () => {
    await container.stop()
  })

  describe('start() - should start crawl blocks and push active addresses', () => {
    it('should extract all addresses from transactions and push into queue', async () => {
      richListCore.start()
      await waitForCatchingUp(richListCore)

      const queue = await richListCore.queueClient.createQueueIfNotExist('RichListCore_ACTIVE_ADDRESSES', 'LIFO')
      const queuedItem = await queue.receive(Number.MAX_SAFE_INTEGER)
      expect(queuedItem).toStrictEqual(EXPECTED_RICH_LIST_ADDRESSES)
    })
  })

  describe('calculateNext() + get()', () => {
    it('should process queued up addresses and update rich list', async () => {
      richListCore.start()
      await waitForCatchingUp(richListCore)

      const beforeProcess = await richListCore.get('-1')
      expect(beforeProcess.length).toStrictEqual(0)

      await richListCore.calculateNext()

      const queue = await richListCore.queueClient.createQueueIfNotExist('RichListCore_ACTIVE_ADDRESSES', 'LIFO')
      const anythingRemainedInQ = await queue.receive(Number.MAX_SAFE_INTEGER)
      expect(anythingRemainedInQ.length).toStrictEqual(0)

      const richList = await richListCore.get('-1')
      expect(richList.length).toStrictEqual(EXPECTED_RICH_LIST_ADDRESSES.length)

      for (let i = 0; i < richList.length - 1; i++) {
        const current = richList[i]
        const next = richList[i + 1]
        expect(EXPECTED_RICH_LIST_ADDRESSES).toContain(current.address)
        expect(EXPECTED_RICH_LIST_ADDRESSES).toContain(next.address)
        expect(current.amount).toBeGreaterThanOrEqual(next.amount)
      }
    })
  })

  describe('invalidate', () => {
    async function rpcInvalidate (container: MasterNodeRegTestContainer, invalidateHeight: number): Promise<void> {
      const invalidateBlockHash = await container.call('getblockhash', [invalidateHeight])
      await container.call('invalidateblock', [invalidateBlockHash])
      await container.call('clearmempool')
    }

    it('should invalidate if is not best chain', async () => {
      const newAddr = await container.getNewAddress()
      await apiClient.wallet.sendToAddress(newAddr, 100)
      await container.generate(1)
      await apiClient.wallet.sendToAddress(newAddr, 100)
      await container.generate(1)
      richListCore.start()
      await waitForCatchingUp(richListCore)
      await richListCore.calculateNext()

      const richList = await richListCore.get('-1')
      expect(richList).toContainEqual({ address: newAddr, amount: 200 })
      for (let i = 0; i < richList.length - 1; i++) {
        const current = richList[i]
        const next = richList[i + 1]
        expect(current.amount).toBeGreaterThanOrEqual(next.amount)
      }

      const curHeight = await apiClient.blockchain.getBlockCount()
      await rpcInvalidate(container, curHeight)
      await waitForExpect(async () => {
        const newHeight = await apiClient.blockchain.getBlockCount()
        expect(newHeight).toBeLessThan(curHeight)
      }, 30000)
      await container.generate(2)

      richListCore.start()
      await waitForCatchingUp(richListCore)
      await richListCore.calculateNext()

      const newRichList = await richListCore.get('-1')
      expect(newRichList).toContainEqual({ address: newAddr, amount: 100 })
      // Should still keep the order.
      for (let i = 0; i < newRichList.length - 1; i++) {
        const current = newRichList[i]
        const next = newRichList[i + 1]
        expect(current.amount).toBeGreaterThanOrEqual(next.amount)
      }
    })
  })
})
