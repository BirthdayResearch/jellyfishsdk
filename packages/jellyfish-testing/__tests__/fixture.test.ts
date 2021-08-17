import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
})

afterAll(async () => {
  await container.stop()
})

it('should createPoolPair with DFI-USDC', async () => {
  const pair = await testing.fixture.createPoolPair({
    a: { amount: '10', symbol: 'DFI' },
    b: { amount: '100', symbol: 'USDC' }
  })

  expect(pair.symbol).toStrictEqual('DFI-USDC')
  expect(pair.reserveA).toStrictEqual(new BigNumber('10'))
  expect(pair.reserveB).toStrictEqual(new BigNumber('100'))
})

it('should createPoolPair with CAT-DOG', async () => {
  const pair = await testing.fixture.createPoolPair({
    a: { amount: 100, symbol: 'CAT' },
    b: { amount: 299.12345678, symbol: 'DOG' }
  })

  expect(pair.symbol).toStrictEqual('CAT-DOG')
  expect(pair.reserveA).toStrictEqual(new BigNumber('100'))
  expect(pair.reserveB).toStrictEqual(new BigNumber('299.12345678'))
})
