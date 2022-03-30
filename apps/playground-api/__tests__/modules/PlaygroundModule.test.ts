import { PlaygroundApiTesting } from '../../testing/PlaygroundApiTesting'

const testing = PlaygroundApiTesting.create()

beforeAll(async () => {
  await testing.start()
})

afterAll(async () => {
  await testing.stop()
})

it('should have pool pairs setup', async () => {
  const pairs = await testing.container.call('listpoolpairs')
  expect(Object.values(pairs).length).toBe(12)
})

it('should have tokens setup', async () => {
  const tokens = await testing.container.call('listtokens')
  expect(Object.values(tokens).length).toBe(29)
})

it('should have oracles setup', async () => {
  const oracles = await testing.container.call('listoracles')
  expect(Object.values(oracles).length).toBe(3)
})

it('should have masternode setup', async () => {
  const oracles = await testing.container.call('listmasternodes')

  expect(Object.values(oracles).length).toBe(10)
})

it('should not have minted more than 200 blocks', async () => {
  const count = await testing.container.call('getblockcount')
  expect(count).toBeLessThanOrEqual(200)
})

it('should have at least 10 million in balance', async () => {
  const balances = await testing.container.call('getbalances')
  expect(balances.mine.trusted).toBeGreaterThanOrEqual(10_000_000)
})

it('should have loan schemes', async () => {
  const results = await testing.container.call('listloanschemes')
  expect(results.length).toBe(6)
})

it('should have loan tokens', async () => {
  const results = await testing.container.call('listloantokens')
  expect(results.length).toBe(5)
})

it('should have loan collateral tokens', async () => {
  const results = await testing.container.call('listcollateraltokens')
  expect(results.length).toBe(12)
})
