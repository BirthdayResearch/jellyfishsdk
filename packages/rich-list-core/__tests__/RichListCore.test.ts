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
      console.log(queuedItem)
    })
  })
})
