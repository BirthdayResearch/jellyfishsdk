import { TestingModule } from '@nestjs/testing'
import { Block, BlockMapper } from '../../src/models/block/Block'
import { DynamoDbContainer } from '../../testing/containers/DynamoDbContainer'
import { modelModuleTesting } from './ModelModuleTesting'

let blockMapper: BlockMapper
const ddbContainer = new DynamoDbContainer()
let testingModule: TestingModule

const DUMMY_TXNS = [
  {
    txid: 'abc123',
    hash: 'abc123',
    version: 1,
    size: 1,
    vsize: 1,
    weight: 1,
    locktime: 1,
    vin: [],
    vout: [],
    hex: 'a'
  }
]

beforeAll(async () => {
  await ddbContainer.start()

  testingModule = await modelModuleTesting(
    await ddbContainer.getHostPort()
  ).compile()

  await testingModule.init()
  blockMapper = testingModule.get(BlockMapper)
})

afterAll(async () => {
  await ddbContainer.stop()
  await testingModule.close()
})

it('should create and read', async () => {
  const block = {
    id: 'abc',
    height: 1,
    difficulty: 100,
    masternode: '',
    medianTime: 1,
    merkleroot: '',
    minter: '',
    minterBlockCount: 1,
    previousHash: '',
    reward: '',
    size: 1,
    sizeStripped: 1,
    stakeModifier: '',
    time: 1,
    transactionCount: 1,
    version: 1,
    weight: 1,
    txns: DUMMY_TXNS
  }

  await blockMapper.put(block)
  const savedBlock = await blockMapper.getByHash('abc')

  expect({ ...savedBlock })
    .toStrictEqual(expect.objectContaining(block))
})

it('should update', async () => {
  const block: Block = {
    id: 'def',
    height: 0,
    difficulty: 0,
    masternode: '',
    medianTime: 0,
    merkleroot: '',
    minter: '',
    minterBlockCount: 0,
    previousHash: '',
    reward: '',
    size: 0,
    sizeStripped: 0,
    stakeModifier: '',
    time: 0,
    transactionCount: 0,
    version: 0,
    weight: 0,
    txns: DUMMY_TXNS
  }

  await blockMapper.put(block)

  const blockUpdate = {
    id: 'def',
    height: 0,
    difficulty: 1000,
    masternode: '',
    medianTime: 1000,
    merkleroot: '',
    minter: '',
    minterBlockCount: 1000,
    previousHash: '',
    reward: '',
    size: 1000,
    sizeStripped: 1000,
    stakeModifier: '',
    time: 1000,
    transactionCount: 1000,
    version: 1000,
    weight: 1000,
    txns: DUMMY_TXNS
  }

  await blockMapper.put(blockUpdate)

  const savedBlock = await blockMapper.getByHash('def')
  expect({ ...savedBlock })
    .toStrictEqual(expect.objectContaining(blockUpdate))
})

it('should delete', async () => {
  await blockMapper.put({
    id: 'ghi',
    height: 0,
    difficulty: 0,
    masternode: '',
    medianTime: 0,
    merkleroot: '',
    minter: '',
    minterBlockCount: 0,
    previousHash: '',
    reward: '',
    size: 0,
    sizeStripped: 0,
    stakeModifier: '',
    time: 0,
    transactionCount: 0,
    version: 0,
    weight: 0,
    txns: DUMMY_TXNS
  })
  await blockMapper.delete('ghi')
  const savedBlock = await blockMapper.getByHash('ghi')
  expect(savedBlock).toStrictEqual(undefined)
})

it('should get highest block', async () => {
  const highestBlock = {
    id: 'ccc',
    height: 100,
    difficulty: 0,
    masternode: '',
    medianTime: 0,
    merkleroot: '',
    minter: '',
    minterBlockCount: 0,
    previousHash: '',
    reward: '',
    size: 0,
    sizeStripped: 0,
    stakeModifier: '',
    time: 0,
    transactionCount: 0,
    version: 0,
    weight: 0,
    txns: DUMMY_TXNS
  }
  await blockMapper.put(highestBlock)
  await blockMapper.put({
    id: 'bbb',
    height: 1,
    difficulty: 0,
    masternode: '',
    medianTime: 0,
    merkleroot: '',
    minter: '',
    minterBlockCount: 0,
    previousHash: '',
    reward: '',
    size: 0,
    sizeStripped: 0,
    stakeModifier: '',
    time: 0,
    transactionCount: 0,
    version: 0,
    weight: 0,
    txns: DUMMY_TXNS
  })
  expect({ ...await blockMapper.getHighest() })
    .toStrictEqual(expect.objectContaining(highestBlock))
})

it('should get by height', async () => {
  const block = {
    id: 'aaa',
    height: 10,
    difficulty: 0,
    masternode: '',
    medianTime: 0,
    merkleroot: '',
    minter: '',
    minterBlockCount: 0,
    previousHash: '',
    reward: '',
    size: 0,
    sizeStripped: 0,
    stakeModifier: '',
    time: 0,
    transactionCount: 0,
    version: 0,
    weight: 0,
    txns: DUMMY_TXNS
  }
  await blockMapper.put(block)
  expect({ ...await blockMapper.getByHeight(10) })
    .toStrictEqual(expect.objectContaining(block))
})
