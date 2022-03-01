import { PoolPairsResult } from '@defichain/jellyfish-api-core/src/category/poolpair'
import { TokenResult } from '@defichain/jellyfish-api-core/src/category/token'
import { CollateralTokenDetail, LoanSchemeResult, LoanTokenResult } from 'packages/jellyfish-api-core/src/category/loan'
import { MasternodeResult } from 'packages/jellyfish-api-core/src/category/masternode'
import { MasternodeInfo } from 'packages/jellyfish-api-core/src/category/mining'
import { PlaygroundApiTesting } from '../../testing/PlaygroundApiTesting'

const testing = PlaygroundApiTesting.create()

beforeAll(async () => {
  await testing.start()
})

afterAll(async () => {
  await testing.stop()
})

it('should have pool pairs setup', async () => {
  const pairs: PoolPairsResult[] = await testing.client.rpc.call('listpoolpairs', [], 'bignumber')
  expect(Object.values(pairs).length).toBe(12)
})

it('should have tokens setup', async () => {
  const tokens: TokenResult[] = await testing.client.rpc.call('listtokens', [], 'bignumber')
  expect(Object.values(tokens).length).toBe(29)
})

it('should have oracles setup', async () => {
  const oracles: string[] = await testing.client.rpc.call('listoracles', [], 'bignumber')
  expect(Object.values(oracles).length).toBe(3)
})

it('should have masternode setup', async () => {
  const oracles: MasternodeResult<MasternodeInfo> = await testing.client.rpc.call('listmasternodes', [], 'bignumber')

  expect(Object.values(oracles).length).toBe(10)
})

it('should not have minted more than 200 blocks', async () => {
  const { value: count } = await testing.client.rpc.call('getblockcount', [], 'number')
  expect(Number(count)).toBeLessThanOrEqual(200)
})

it('should have at least 10 million in balance', async () => {
  const balances: any = await testing.client.rpc.call('getbalances', [false], 'bignumber')
  expect(Number(balances.mine.trusted.value)).toBeGreaterThanOrEqual(10_000_000)
})

it('should have loan schemes', async () => {
  const results: LoanSchemeResult[] = await testing.client.rpc.call('listloanschemes', [], 'bignumber')
  expect(results.length).toBe(6)
})

it('should have loan tokens', async () => {
  const results: LoanTokenResult[] = await testing.client.rpc.call('listloantokens', [], 'bignumber')
  expect(results.length).toBe(5)
})

it('should have loan collateral tokens', async () => {
  const results: CollateralTokenDetail[] = await testing.client.rpc.call('listcollateraltokens', [], 'bignumber')
  expect(results.length).toBe(12)
})

it('should have gov set', async () => {
  const dusdInfo: TokenResult = await testing.client.rpc.call('gettoken', ['DUSD'], 'bignumber')
  const dusdId = Object.keys(dusdInfo)[0]
  const gov: Record<string, any> = await testing.client.rpc.call('getgov', ['ATTRIBUTES'], 'bignumber')
  expect(gov).toStrictEqual({
    ATTRIBUTES: {
      [`v0/token/${dusdId}/payback_dfi`]: 'true'
    }
  })
})
