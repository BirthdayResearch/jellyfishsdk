import { Test, TestingModule } from '@nestjs/testing'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTestContainer } from '@defichain/testcontainers'
import { RpcController } from './rpc.controller'

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

it('should getrawtransaction via JSON RPC 1.0', async () => {
  const hash = await controller.post({ method: 'getblockhash', params: [1] })
  expect(hash.result.length).toStrictEqual(64)

  const block = await controller.post({ method: 'getblock', params: [hash.result] })
  expect(Array.isArray(block.result.tx)).toStrictEqual(true)

  const hex = await controller.post({
    method: 'getrawtransaction',
    params: [block.result.tx[0]]
  })
  expect(typeof hex.result).toStrictEqual('string')
})
