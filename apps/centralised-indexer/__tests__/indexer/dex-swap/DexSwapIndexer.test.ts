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

it('should read dex swaps from blockchain and write to db', async () => {
  // Given some poolPairs
  await testing.token.create({ symbol: 'ABC' })
  await testing.token.dfi({ amount: 10 })
  await testing.generate(1)

  await testing.poolpair.create({
    tokenA: 'ABC',
    tokenB: 'DFI'
  })
  await testing.token.mint({
    symbol: 'ABC',
    amount: '1000'
  })
  await testing.generate(1)

  await testing.poolpair.add({
    a: {
      amount: '10',
      symbol: 'DFI'
    },
    b: {
      amount: '100',
      symbol: 'ABC'
    },
    address: await testing.address('my')
  })
  await testing.generate(1)

  await testing.poolpair.remove({
    address: await testing.address('my'),
    amount: '2',
    symbol: 'ABC-DFI'
  })
  await testing.generate(1)

  // When multiple swaps occur across blocks
  const block1Swap1 = await testing.poolpair.swap({
    from: await testing.address('my'),
    tokenFrom: 'ABC',
    amountFrom: 1,
    to: await testing.address('my'),
    tokenTo: 'DFI'
  })
  const block1Swap2 = await testing.poolpair.swap({
    from: await testing.address('my'),
    tokenFrom: 'ABC',
    amountFrom: 2,
    to: await testing.address('my'),
    tokenTo: 'DFI'
  })
  await testing.generate(1)

  const block2Swap = await testing.poolpair.swap({
    from: await testing.address('my'),
    tokenFrom: 'ABC',
    amountFrom: 3,
    to: await testing.address('my'),
    tokenTo: 'DFI'
  })
  await testing.generate(2)

  const account = await testing.rpc.account.getAccount(await testing.address('my'))
  expect(account).toStrictEqual(expect.objectContaining([
    '1.19633829@DFI',
    '0.32455532@ABC',
    '29.62276660@ABC-DFI'
  ]))

  // Then database has a DexSwap table
  expect(
    (await testsuite.dbContainer.listTables()).TableNames)
    .toContain('DexSwap')

  // And DexSwap table contains correct rows
  await waitForExpect(async () => {
    // Check number of swaps in DB is correct
    const dexSwapTable = await testsuite.dbContainer.dynamoDb.describeTable({ TableName: 'DexSwap' }).promise()
    expect(dexSwapTable.Table!.ItemCount).toStrictEqual(3)

    // Check indexed swap has correct values
    { // Block 1, Swap 1
      const indexedDexSwap = await testsuite.dbContainer.dynamoDb.getItem({
        TableName: 'DexSwap',
        Key: { id: { S: block1Swap1 } }
      }).promise()
      expect(AWS.DynamoDB.Converter.unmarshall(indexedDexSwap.Item!)).toStrictEqual({
        block: {
          hash: expect.any(String),
          height: 106,
          medianTime: expect.any(Number),
          time: expect.any(Number)
        },
        fromAmount: '1.00000000',
        fromSymbol: 'ABC',
        id: expect.any(String),
        timestamp: expect.any(String),
        toAmount: expect.stringMatching(/0\.09894375|0\.09487130/), // swap1 and swap2 order is not guaranteed
        toSymbol: 'DFI',
        txno: expect.any(Number),
        _fixedPartitionKey: 0
      })
    }
    { // Block 1, Swap 2
      const indexedDexSwap = await testsuite.dbContainer.dynamoDb.getItem({
        TableName: 'DexSwap',
        Key: { id: { S: block1Swap2 } }
      }).promise()
      expect(AWS.DynamoDB.Converter.unmarshall(indexedDexSwap.Item!)).toStrictEqual({
        block: {
          hash: expect.any(String),
          height: 106,
          medianTime: expect.any(Number),
          time: expect.any(Number)
        },
        fromAmount: '2.00000000',
        fromSymbol: 'ABC',
        id: expect.any(String),
        timestamp: expect.any(String),
        toAmount: expect.stringMatching(/0\.19174674|0\.19581919/), // swap1 and swap2 order is not guaranteed
        toSymbol: 'DFI',
        txno: expect.any(Number),
        _fixedPartitionKey: 0
      })
    }
    { // Block 2, Swap 1
      const indexedDexSwap = await testsuite.dbContainer.dynamoDb.getItem({
        TableName: 'DexSwap',
        Key: { id: { S: block2Swap } }
      }).promise()
      expect(AWS.DynamoDB.Converter.unmarshall(indexedDexSwap.Item!)).toStrictEqual({
        block: {
          hash: expect.any(String),
          height: 107,
          medianTime: expect.any(Number),
          time: expect.any(Number)
        },
        fromAmount: '3.00000000',
        fromSymbol: 'ABC',
        id: expect.any(String),
        timestamp: expect.any(String),
        toAmount: '0.27319227',
        toSymbol: 'DFI',
        txno: 1,
        _fixedPartitionKey: 0
      })
    }
  })
})
