import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RichListCore } from '../src/RichListCore'
import { RichListCoreTest, waitForCatchingUp } from '../test/RichListCoreTest'

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

  describe('startOrResume - should start crawl blocks and push active addresses', () => {
    it('should extract all addresses from transactions and push into queue', async () => {
      richListCore.start()
      await waitForCatchingUp(richListCore)

      const queue = await richListCore.queueClient.createQueueIfNotExist('RichListCore_ACTIVE_ADDRESSES', 'LIFO')
      const queuedItem = await queue.receive(Number.MAX_SAFE_INTEGER)

      // reproducible results, mn always derive new addresses following same HD paths in sequence
      expect(queuedItem).toStrictEqual([
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
      ])
    })
  })
})
