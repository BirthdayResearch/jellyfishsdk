import { Test, TestingModule } from '@nestjs/testing'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { CallController } from '@src/module-api/controller.call'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let controller: CallController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  client = new JsonRpcClient(await container.getCachedRpcUrl())
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  const app: TestingModule = await Test.createTestingModule({
    controllers: [CallController],
    providers: [{ provide: JsonRpcClient, useFactory: () => client }]
  }).compile()

  controller = app.get<CallController>(CallController)
})

it('should getblockchaininfo', async () => {
  const result = await controller.call('getblockchaininfo', undefined)
  expect(result.chain).toBe('regtest')
})
