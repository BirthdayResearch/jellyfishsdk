import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RichListController } from '../../src/controllers/RichList'
import { RichListCoreTest } from '@defichain/rich-list-core'

describe('RichListController', () => {
  const container = new MasterNodeRegTestContainer()
  let richListController!: RichListController

  beforeAll(async () => {
    await container.start()
    const rpc = new JsonRpcClient(await container.getCachedRpcUrl())
    const core = RichListCoreTest(rpc)
    richListController = new RichListController(core)
    await core.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should reject invalid number as token id', async () => {
    await expect(richListController.get(NaN)).rejects.toThrow('Not Found')
  })

  it('should reject token id not found in defid', async () => {
    await expect(richListController.get(88888)).rejects.toThrow('Not Found')
  })

  it('should retrieve rich list', async () => {
    await richListController.get(-1)
    // TODO: more comprehensive e2e
  })
})
