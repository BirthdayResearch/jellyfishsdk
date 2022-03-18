import waitForExpect from 'wait-for-expect'
import { CentralisedIndexerTesting } from '../../testing/CentralisedIndexerTesting'
import * as AWS from 'aws-sdk'
import { DynamoDbContainer } from '../../testing/containers/DynamoDbContainer'

const unmarshall = AWS.DynamoDB.Converter.unmarshall

const testsuite = CentralisedIndexerTesting.create()
const container = testsuite.container
const testing = testsuite.testing
let dynamoContainer: DynamoDbContainer

beforeAll(async () => {
  await testsuite.start()
  dynamoContainer = testsuite.dbContainer

  await container.waitForWalletCoinbaseMaturity()
  await waitForExpect(async () => {
    const info = await container.getMiningInfo()
    expect(info.blocks).toBeGreaterThan(100)
  })
})

afterAll(async () => {
  await testsuite.stop()
})

it('should read blocks from blockchain and write to db', async () => {
  // Then database has a Block table
  expect(
    (await testsuite.dbContainer.listTables()).TableNames)
    .toContain('Block')

  // And Block table contains correct rows
  await waitForExpect(async () => {
    // Check number of blocks in DB is correct
    const blockTable = await testsuite.dbContainer.dynamoDb.describeTable({ TableName: 'Block' }).promise()
    expect(blockTable.Table!.ItemCount).toStrictEqual(102)

    // Check genesis block is in DB
    const genesisBlockHash = await testing.rpc.blockchain.getBlockHash(0)
    const genesisBlock = await testing.rpc.blockchain.getBlock(genesisBlockHash, 2)
    const genesisBlockInDb = await testsuite.dbContainer.dynamoDb.getItem({
      TableName: 'Block',
      Key: {
        id: {
          S: genesisBlockHash
        }
      }
    }).promise()
    expect(unmarshall(genesisBlockInDb.Item!)).toStrictEqual({
      id: genesisBlock.hash,
      height: genesisBlock.height,
      difficulty: genesisBlock.difficulty,
      medianTime: genesisBlock.mediantime,
      merkleroot: genesisBlock.merkleroot,
      minterBlockCount: genesisBlock.mintedBlocks,
      reward: genesisBlock.tx[0].vout[0].value.toFixed(8),
      size: genesisBlock.size,
      sizeStripped: genesisBlock.strippedsize,
      stakeModifier: genesisBlock.stakeModifier,
      time: genesisBlock.time,
      transactionCount: genesisBlock.nTx,
      version: genesisBlock.version,
      weight: genesisBlock.weight,
      txns: expect.any(Array),
      _fixedPartitionKey: 0
    })

    // Check best block is in DB
    const bestBlockHash = await testing.container.getBestBlockHash()
    const bestBlock = await testing.rpc.blockchain.getBlock(bestBlockHash, 2)
    const bestBlockInDb = await testsuite.dbContainer.dynamoDb.getItem({
      TableName: 'Block',
      Key: {
        id: {
          S: bestBlockHash
        }
      }
    }).promise()
    expect(unmarshall(bestBlockInDb.Item!))
      .toStrictEqual({
        id: bestBlock.hash,
        height: bestBlock.height,
        difficulty: bestBlock.difficulty,
        masternode: bestBlock.masternode,
        medianTime: bestBlock.mediantime,
        merkleroot: bestBlock.merkleroot,
        minter: bestBlock.minter,
        minterBlockCount: bestBlock.mintedBlocks,
        previousHash: bestBlock.previousblockhash,
        reward: bestBlock.tx[0].vout[0].value.toFixed(8),
        size: bestBlock.size,
        sizeStripped: bestBlock.strippedsize,
        stakeModifier: bestBlock.stakeModifier,
        time: bestBlock.time,
        transactionCount: bestBlock.nTx,
        version: bestBlock.version,
        weight: bestBlock.weight,
        txns: expect.any(Array),
        _fixedPartitionKey: 0
      })
  })
})

it('should index best chain and invalidate old blocks', async () => {
  const height = await container.getBlockCount()
  const bestBlockHash = await container.getBestBlockHash()
  await testsuite.waitForIndexedHeight(height)

  // Get first block
  const block = (await dynamoContainer.getItem({
    TableName: 'Block',
    Key: {
      id: {
        S: bestBlockHash
      }
    }
  }))!

  expect(block.id).toStrictEqual(bestBlockHash)
  expect(block.height).toStrictEqual(height)

  // Invalidate block, then wait for indexer to catch up
  await testsuite.invalidateFromHeight(height)
  await testsuite.waitForIndexedHeight(height)

  const newBlock = (await dynamoContainer.getItem({
    TableName: 'Block',
    Key: {
      id: {
        S: await container.getBestBlockHash()
      }
    }
  }))!

  // New block should be different from the invalidated one, but have the same height
  await waitForExpect(async () => {
    expect(block).toBeDefined()
    expect(newBlock).toBeDefined()
    expect(newBlock.id).not.toStrictEqual(block.hash)
    expect(newBlock.height).toStrictEqual((block.height as number) + 1)
  })
})
