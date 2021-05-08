import { Database } from '@src/module.database/database'
import { Test } from '@nestjs/testing'
import { MemoryDatabaseModule } from '@src/module.database/provider.memory/module'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { BlockMapper } from '@src/module.model/block'
import assert from 'assert'

let database: Database
let mapper: BlockMapper

beforeAll(async () => {
  const app = await Test.createTestingModule({
    imports: [MemoryDatabaseModule],
    providers: [BlockMapper]
  }).compile()

  database = app.get<Database>(Database)
  mapper = app.get<BlockMapper>(BlockMapper)
})

afterAll(async () => {
  await (database as LevelDatabase).close()
})

beforeEach(async () => {
  async function put (height: number, hash: string): Promise<void> {
    await mapper.put({
      difficulty: 0,
      id: hash,
      hash: hash,
      height: height,
      masternode: '',
      median_time: 0,
      merkleroot: '',
      minter: '',
      minter_block_count: 0,
      previous_hash: '',
      size: 0,
      size_stripped: 0,
      stake_modifier: '',
      time: 0,
      transaction_count: 0,
      version: 0,
      weight: 0
    })
  }

  await put(0, '0000000000000000000000000000000000000000000000000000000000000000')
  await put(1, '1000000000000000000000000000000000000000000000000000000000000000')
  await put(2, '1000000000000000000000000000000010000000000000000000000000000000')
})

afterEach(async () => {
  await (database as LevelDatabase).clear()
})

it('should getByHash', async () => {
  const block = await mapper.getByHash('1000000000000000000000000000000000000000000000000000000000000000')
  expect(block?.height).toBe(1)
})

it('should getByHeight', async () => {
  const block = await mapper.getByHeight(0)
  expect(block?.hash).toBe('0000000000000000000000000000000000000000000000000000000000000000')
})

it('should getHighest', async () => {
  const block = await mapper.getHighest()
  expect(block?.height).toBe(2)
  expect(block?.hash).toBe('1000000000000000000000000000000010000000000000000000000000000000')
})

it('should queryByHeight', async () => {
  const blocks = await mapper.queryByHeight(10)
  expect(blocks.length).toBe(3)

  expect(blocks[0].height).toBe(2)
  expect(blocks[1].height).toBe(1)
  expect(blocks[2].height).toBe(0)

  const after2 = await mapper.queryByHeight(10, 2)
  expect(after2[0].height).toBe(1)
  expect(after2[1].height).toBe(0)
})

it('should put', async () => {
  const block = await mapper.getByHeight(0)
  assert(block !== undefined)
  block.size = 100
  await mapper.put(block)

  const updated = await mapper.getByHeight(0)
  expect(updated?.size).toBe(100)
})

it('should put but deleted', async () => {
  const block = await mapper.getByHeight(0)
  assert(block !== undefined)

  block.height = 3
  await mapper.put(block)

  const deleted = await mapper.getByHeight(0)
  expect(deleted).toBeUndefined()

  const updated = await mapper.getByHeight(3)
  expect(updated).toBeTruthy()
})

it('should delete', async () => {
  await mapper.delete('0000000000000000000000000000000000000000000000000000000000000000')
  const deleted = await mapper.getByHeight(0)
  expect(deleted).toBeUndefined()
})
