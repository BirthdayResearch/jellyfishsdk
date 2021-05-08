import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Database } from '@src/module.database/database'
import { Test } from '@nestjs/testing'
import { MemoryDatabaseModule } from '@src/module.database/provider.memory/module'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { RawBlockMapper } from '@src/module.model/raw.block'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let database: Database
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

  database = app.get<Database>(Database)
  mapper = app.get<RawBlockMapper>(RawBlockMapper)
})

afterAll(async () => {
  await (database as LevelDatabase).close()
  await container.stop()
})

it('should put from defid and get back same object from mapper', async () => {
  const hash = await client.blockchain.getBlockHash(1)
  const block = await client.blockchain.getBlock(hash, 2)
  await mapper.put(block)

  const saved = await mapper.get(hash)
  expect(saved).toEqual(block)
})

it('should delete and be deleted', async () => {
  const hash = await client.blockchain.getBlockHash(2)
  const block = await client.blockchain.getBlock(hash, 2)
  await mapper.put(block)
  await mapper.delete(hash)

  const deleted = await mapper.get(hash)
  expect(deleted).toBeUndefined()
})
