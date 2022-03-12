import waitForExpect from 'wait-for-expect'
import { CentralisedIndexerTesting } from '../../../testing/CentralisedIndexerTesting'
import * as AWS from 'aws-sdk'

const testsuite = CentralisedIndexerTesting.create()
const container = testsuite.container
const testing = testsuite.testing

beforeAll(async () => {
  await testsuite.start()

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
        hash: {
          S: genesisBlockHash
        }
      }
    }).promise()
    expect(AWS.DynamoDB.Converter.unmarshall(genesisBlockInDb.Item!)).toStrictEqual({
      hash: genesisBlock.hash,
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
      _fixedPartitionKey: 0
    })

    // Check best block is in DB
    const bestBlockHash = await testing.container.getBestBlockHash()
    const bestBlock = await testing.rpc.blockchain.getBlock(bestBlockHash, 2)
    const bestBlockInDb = await testsuite.dbContainer.dynamoDb.getItem({
      TableName: 'Block',
      Key: {
        hash: {
          S: bestBlockHash
        }
      }
    }).promise()
    expect(AWS.DynamoDB.Converter.unmarshall(bestBlockInDb.Item!))
      .toStrictEqual({
        hash: bestBlock.hash,
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
        _fixedPartitionKey: 0
      })
  })
})

it('should be able to recover', async () => {
  // If the node is killed, it should pick up from where it left off
})
