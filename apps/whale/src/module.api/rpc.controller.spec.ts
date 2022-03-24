import { Test, TestingModule } from '@nestjs/testing'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTestContainer } from '@defichain/testcontainers'
import { RpcController } from '../module.api/rpc.controller'

const container = new RegTestContainer()
let client: JsonRpcClient
let controller: RpcController

beforeAll(async () => {
  await container.start()
  client = new JsonRpcClient(await container.getCachedRpcUrl())
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  const app: TestingModule = await Test.createTestingModule({
    controllers: [RpcController],
    providers: [{
      provide: JsonRpcClient,
      useValue: client
    }]
  }).compile()

  controller = app.get<RpcController>(RpcController)
})

it('should getblockchaininfo via deprecated endpoint', async () => {
  const result = await controller.call('getblockchaininfo', undefined)
  expect(result.chain).toStrictEqual('regtest')
})

it('should getblockchaininfo via JSON RPC 1.0', async () => {
  const result = await controller.post({
    method: 'getblockchaininfo'
  })
  expect(result.result.chain).toStrictEqual('regtest')
})
