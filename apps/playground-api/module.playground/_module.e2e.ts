import { PlaygroundTesting } from '../e2e.module'

const testing = new PlaygroundTesting()

beforeAll(async () => {
  await testing.start()
})

afterAll(async () => {
  await testing.stop()
})

it('should have pool pairs setup', async () => {
  const pairs = await testing.client.poolpair.listPoolPairs()
  expect(Object.values(pairs).length).toBe(11)
})

it('should have tokens setup', async () => {
  const tokens = await testing.client.token.listTokens()
  expect(Object.values(tokens).length).toBe(27)
})

it('should have oracles setup', async () => {
  const oracles = await testing.client.oracle.listOracles()
  expect(Object.values(oracles).length).toBe(3)
})

it('should have masternode setup', async () => {
  const oracles = await testing.client.masternode.listMasternodes()
  expect(Object.values(oracles).length).toBe(10)
})

it('should not have minted more than 200 blocks', async () => {
  const count = await testing.client.blockchain.getBlockCount()
  expect(count).toBeLessThanOrEqual(200)
})

it('should have at least 10 million in balance', async () => {
  const balances = await testing.client.wallet.getBalances()
  expect(balances.mine.trusted.toNumber()).toBeGreaterThanOrEqual(10_000_000)
})

it('should have loan schemes', async () => {
  const results = await testing.client.loan.listLoanSchemes()
  expect(results.length).toBe(6)
})

it('should have loan tokens', async () => {
  const results = await testing.client.loan.listLoanTokens()
  expect(results.length).toBe(5)
})

it('should have loan collateral tokens', async () => {
  const results = await testing.client.loan.listCollateralTokens()
  expect(results.length).toBe(11)
})

it('should have gov set', async () => {
  const dusdInfo = await testing.client.token.getToken('DUSD')
  const dusdId = Object.keys(dusdInfo)[0]
  const gov = await testing.client.masternode.getGov('ATTRIBUTES')
  expect(gov).toStrictEqual({
    ATTRIBUTES: {
      [`v0/token/${dusdId}/payback_dfi`]: 'true'
    }
  })
})
