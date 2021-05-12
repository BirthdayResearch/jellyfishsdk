import { Test, TestingModule } from '@nestjs/testing'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTestContainer } from '@defichain/testcontainers'
import { RpcController } from '@src/module.api/rpc.controller'
import { ConfigModule } from '@nestjs/config'

const container = new RegTestContainer()
let client: JsonRpcClient
let controller: RpcController

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
    imports: [ConfigModule.forRoot({
      load: [() => ({ network: 'regtest' })]
    })],
    controllers: [RpcController],
    providers: [{ provide: JsonRpcClient, useFactory: () => client }]
  }).compile()

  controller = app.get<RpcController>(RpcController)
})

it('should getblockchaininfo', async () => {
  const result = await controller.call('getblockchaininfo', undefined)
  expect(result.chain).toBe('regtest')
})
