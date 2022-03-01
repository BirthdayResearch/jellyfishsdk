import { PlaygroundApiTesting } from '../../testing/PlaygroundApiTesting'
import waitForExpect from 'wait-for-expect'
import { PlaygroundProbeIndicator } from '../../src/PlaygroundIndicator'
import { Vault } from '@defichain/jellyfish-api-core/src/category/loan'
import { PoolPairsResult } from '@defichain/jellyfish-api-core/src/category/poolpair'

const testing = PlaygroundApiTesting.create()

beforeAll(async () => {
  await testing.start()

  await waitForExpect(() => {
    expect(testing.app.get(PlaygroundProbeIndicator).ready).toBeTruthy()
  })
})

afterAll(async () => {
  await testing.stop()
})

it('should have a vault', async () => {
  await waitForExpect(async () => {
    const vaults: Vault[] = await testing.client.rpc.call('listvaults', [], 'number')
    expect(vaults.length).toBeGreaterThan(0)
  }, 90000)
})

it('should have liquidity in DUSD-DFI pool', async () => {
  await waitForExpect(async () => {
    const pairsResult: PoolPairsResult = await testing.client.rpc.call('getpoolpair', ['DUSD-DFI'], 'bignumber')
    expect(Object.values(pairsResult)[0].reserveA.gt(0)).toBeTruthy()
    expect(Object.values(pairsResult)[0].reserveB.gt(0)).toBeTruthy()
  }, 90000)
})

it('should have liquidity in TU10-DUSD pool', async () => {
  await waitForExpect(async () => {
    const pairsResult: PoolPairsResult = await testing.client.rpc.call('getpoolpair', ['TU10-DUSD'], 'bignumber')
    expect(Object.values(pairsResult)[0].reserveA.gt(0)).toBeTruthy()
    expect(Object.values(pairsResult)[0].reserveB.gt(0)).toBeTruthy()
  }, 90000)
})

it('should have liquidity in TD10-DUSD pool', async () => {
  await waitForExpect(async () => {
    const pairsResult: PoolPairsResult = await testing.client.rpc.call('getpoolpair', ['TD10-DUSD'], 'bignumber')
    expect(Object.values(pairsResult)[0].reserveA.gt(0)).toBeTruthy()
    expect(Object.values(pairsResult)[0].reserveB.gt(0)).toBeTruthy()
  }, 90000)
})

it('should have liquidity in TS25-DUSD pool', async () => {
  await waitForExpect(async () => {
    const pairsResult: PoolPairsResult = await testing.client.rpc.call('getpoolpair', ['TS25-DUSD'], 'bignumber')

    expect(Object.values(pairsResult)[0].reserveA.gt(0)).toBeTruthy()
    expect(Object.values(pairsResult)[0].reserveB.gt(0)).toBeTruthy()
  }, 90000)
})

it('should have liquidity in TR50-DUSD pool', async () => {
  await waitForExpect(async () => {
    const pairsResult: PoolPairsResult = await testing.client.rpc.call('getpoolpair', ['TR50-DUSD'], 'bignumber')

    expect(Object.values(pairsResult)[0].reserveA.gt(0)).toBeTruthy()
    expect(Object.values(pairsResult)[0].reserveB.gt(0)).toBeTruthy()
  }, 90000)
})
