import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Test } from '@nestjs/testing'
import { MemoryDatabaseModule } from '../module.database/provider.memory/module'
import { RawBlockMapper } from '../module.model/raw.block'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let mapper: RawBlockMapper

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(3)
  client = new JsonRpcClient(await container.getCachedRpcUrl())

  const app = await Test.createTestingModule({
    imports: [MemoryDatabaseModule],
    providers: [RawBlockMapper]
  }).compile()

  mapper = app.get<RawBlockMapper>(RawBlockMapper)
})

afterAll(async () => {
  await container.stop()
})

it('should put from defid and get back same object from mapper', async () => {
  const hash = await client.blockchain.getBlockHash(1)
  const block = await client.blockchain.getBlock(hash, 2)
  await mapper.put(block)

  const saved = await mapper.get(hash)
  expect(saved).toStrictEqual(block)
})

it('should delete and be deleted', async () => {
  const hash = await client.blockchain.getBlockHash(2)
  const block = await client.blockchain.getBlock(hash, 2)
  await mapper.put(block)
  await mapper.delete(hash)

  const deleted = await mapper.get(hash)
  expect(deleted).toBeUndefined()
})
