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

beforeEach(async () => {
  async function put (height: number, hash: string): Promise<void> {
    await mapper.put({
      difficulty: 0,
      id: hash,
      hash: hash,
      height: height,
      masternode: '',
      medianTime: 0,
      merkleroot: '',
      minter: '',
      minterBlockCount: 0,
      previousHash: '',
      size: 0,
      sizeStripped: 0,
      stakeModifier: '',
      time: 0,
      transactionCount: 0,
      version: 0,
      weight: 0,
      reward: ''
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
  expect(block?.height).toStrictEqual(1)
})

it('should getByHeight', async () => {
  const block = await mapper.getByHeight(0)
  expect(block?.hash).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
})

it('should getHighest', async () => {
  const block = await mapper.getHighest()
  expect(block?.height).toStrictEqual(2)
  expect(block?.hash).toStrictEqual('1000000000000000000000000000000010000000000000000000000000000000')
})

it('should queryByHeight', async () => {
  const blocks = await mapper.queryByHeight(10)
  expect(blocks.length).toStrictEqual(3)

  expect(blocks[0].height).toStrictEqual(2)
  expect(blocks[1].height).toStrictEqual(1)
  expect(blocks[2].height).toStrictEqual(0)

  const after2 = await mapper.queryByHeight(10, 2)
  expect(after2[0].height).toStrictEqual(1)
  expect(after2[1].height).toStrictEqual(0)
})

it('should put', async () => {
  const block = await mapper.getByHeight(0)
  assert(block !== undefined)
  block.size = 100
  await mapper.put(block)

  const updated = await mapper.getByHeight(0)
  expect(updated?.size).toStrictEqual(100)
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
