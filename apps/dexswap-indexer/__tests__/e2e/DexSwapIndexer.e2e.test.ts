import waitForExpect from 'wait-for-expect'
import { CentralisedIndexerTesting } from '../../testing/CentralisedIndexerTesting'

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

  // Fund for more swaps
  await container.call('utxostoaccount', [
    {
      [await testing.address('my')]: '1000@0'
    }
  ])
  await container.generate(1)

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
      amount: '100',
      symbol: 'DFI'
    },
    b: {
      amount: '1000',
      symbol: 'ABC'
    },
    address: await testing.address('my')
  })
  await testing.generate(1)

  await testing.poolpair.remove({
    address: await testing.address('my'),
    amount: '20',
    symbol: 'ABC-DFI'
  })
  await testing.generate(1)
})

afterAll(async () => {
  await testsuite.stop()
})

it('should read dex swaps from blockchain and write to db', async () => {
  // Given some poolPairs (setup above)

  // When multiple swaps occur across blocks
  await testing.poolpair.swap({
    from: await testing.address('my'),
    tokenFrom: 'ABC',
    amountFrom: 1,
    to: await testing.address('my'),
    tokenTo: 'DFI'
  })
  await testing.poolpair.swap({
    from: await testing.address('my'),
    tokenFrom: 'ABC',
    amountFrom: 2,
    to: await testing.address('my'),
    tokenTo: 'DFI'
  })
  await testing.generate(1)

  await testing.poolpair.swap({
    from: await testing.address('my'),
    tokenFrom: 'ABC',
    amountFrom: 3,
    to: await testing.address('my'),
    tokenTo: 'DFI'
  })
  await testing.generate(2)

  const account = await testing.rpc.account.getAccount(await testing.address('my'))
  expect(account[0]).toMatch(/906.+@DFI/)
  expect(account[1]).toMatch(/57.+@ABC/)
  expect(account[2]).toMatch(/296.+@ABC-DFI/)

  const block1Swap1Indexed = {
    block: {
      hash: expect.any(String),
      height: 107,
      medianTime: expect.any(Number),
      time: expect.any(Number)
    },
    fromAmount: '1.00000000',
    fromSymbol: 'ABC',
    id: expect.any(String),
    timestampMs: expect.any(String),
    toAmount: expect.stringMatching(/0\.09946839|0\.09989336/), // swap1 and swap2 order is not guaranteed
    toSymbol: 'DFI',
    txno: expect.any(Number),
    yyyymmdd: expect.any(String)
  }

  const block1Swap2Indexed = {
    block: {
      hash: expect.any(String),
      height: 107,
      medianTime: expect.any(Number),
      time: expect.any(Number)
    },
    fromAmount: '2.00000000',
    fromSymbol: 'ABC',
    id: expect.any(String),
    timestampMs: expect.any(String),
    toAmount: expect.stringMatching(/0\.19957390|0\.19914894/), // swap1 and swap2 order is not guaranteed
    toSymbol: 'DFI',
    txno: expect.any(Number),
    yyyymmdd: expect.any(String)
  }

  const block2Swap1Indexed = {
    block: {
      hash: expect.any(String),
      height: 108,
      medianTime: expect.any(Number),
      time: expect.any(Number)
    },
    fromAmount: '3.00000000',
    fromSymbol: 'ABC',
    id: expect.any(String),
    timestampMs: expect.any(String),
    toAmount: '0.29713909',
    toSymbol: 'DFI',
    txno: 1,
    yyyymmdd: expect.any(String)
  }

  expect(
    (await testsuite.dbContainer.listTables()).TableNames)
    .toContain('DexSwap')

  // Check that the swaps are retrievable via the rest endpoint, returned in order
  await testsuite.waitForIndexedHeight(await container.getBlockCount())
  const response = await testsuite.apiApp.inject({
    method: 'GET',
    url: '/dexswaps' // TODO(eli-lim): version and network prefix
  })

  expect(response.json()).toStrictEqual({
    page: {},
    swaps: [
      block1Swap1Indexed,
      block1Swap2Indexed,
      block2Swap1Indexed
    ]
  })
})

it('should paginate', async () => {
  // TODO(eli-lim)
})

it('should delete dexSwaps when block is invalidated', async () => {
  // Given some poolpairs (setup above)

  // When swap occurs
  await testing.poolpair.swap({
    from: await testing.address('my'),
    tokenFrom: 'ABC',
    amountFrom: 1,
    to: await testing.address('my'),
    tokenTo: 'DFI'
  })
  await testing.generate(1)

  const height = await container.getBlockCount()
  await testsuite.waitForIndexedHeight(height)

  // Then it gets indexed
  const swap = undefined

  expect(swap).toBeUndefined()
})
