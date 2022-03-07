import { Test } from '@nestjs/testing'
import { BlockService } from '../../src/models/block'
import { DynamoDbContainer } from '../../testing/containers/DynamoDbContainer'
import { ModelModule } from '../../src/models/_module'
import { ConfigService } from '@nestjs/config'

describe('BlockService', () => {
  let blockService: BlockService
  const dynamoDbContainer = new DynamoDbContainer()

  beforeAll(async () => {
    await dynamoDbContainer.start()
    const hostPort = await dynamoDbContainer.getHostPort()

    const module = await Test.createTestingModule({
      imports: [ModelModule]
    }).overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          const DYNAMO_DB_TESTING_CONFIGS: Record<string, string> = {
            INDEXER_DYNAMODB_ENDPOINT: `http://localhost:${hostPort}`,
            INDEXER_DYNAMODB_REGION: 'dummy',
            INDEXER_DYNAMODB_ACCESSKEYID: 'dummy',
            INDEXER_DYNAMODB_SECRETACCESSKEY: 'dummy'
          }
          return DYNAMO_DB_TESTING_CONFIGS[key]
        })
      }).compile()

    await module.init()
    blockService = module.get(BlockService)
  })

  afterAll(async () => {
    await dynamoDbContainer.stop()
  })

  it('should create and read', async () => {
    const block = {
      hash: 'abc',
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
      weight: 1
    }

    await blockService.upsert(block)
    const savedBlock = await blockService.getByHash('abc')

    expect({ ...savedBlock })
      .toStrictEqual(expect.objectContaining(block))
  })

  it('should update', async () => {
    const block = {
      hash: 'def',
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
      weight: 0
    }

    await blockService.upsert(block)

    const blockUpdate = {
      hash: 'def',
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
      weight: 1000
    }

    await blockService.upsert(blockUpdate)

    const savedBlock = await blockService.getByHash('def')
    expect({ ...savedBlock })
      .toStrictEqual(expect.objectContaining(blockUpdate))
  })

  it('should delete', async () => {
    await blockService.upsert({
      hash: 'ghi',
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
      weight: 0
    })
    await blockService.delete('ghi')
    const savedBlock = await blockService.getByHash('ghi')
    expect(savedBlock).toStrictEqual(undefined)
  })

  it('should get highest block', async () => {
    const highestBlock = {
      hash: 'ccc',
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
      weight: 0
    }
    await blockService.upsert(highestBlock)
    await blockService.upsert({
      hash: 'bbb',
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
      weight: 0
    })
    expect({ ...await blockService.getHighest() })
      .toStrictEqual(expect.objectContaining(highestBlock))
  })

  it('should get by height', async () => {
    const block = {
      hash: 'aaa',
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
      weight: 0
    }
    await blockService.upsert(block)
    expect({ ...await blockService.getByHeight(10) })
      .toStrictEqual(expect.objectContaining(block))
  })
})
