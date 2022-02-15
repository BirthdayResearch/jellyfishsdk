import { PlaygroundTesting } from '../../e2e.module'
import waitForExpect from 'wait-for-expect'
import { PlaygroundProbeIndicator } from '../../module.playground/playground.indicator'

const testing = new PlaygroundTesting()

/* eslint-disable @typescript-eslint/no-non-null-assertion */

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
    const vaults = await testing.jsonRpcClient!.loan.listVaults()
    expect(vaults.length).toBeGreaterThan(0)
  }, 90000)
})

it('should have liquidity in DUSD-DFI pool', async () => {
  await waitForExpect(async () => {
    const pairsResult = await testing.jsonRpcClient!.poolpair.getPoolPair('DUSD-DFI')
    expect(Object.values(pairsResult)[0].reserveA.gt(0)).toBeTruthy()
    expect(Object.values(pairsResult)[0].reserveB.gt(0)).toBeTruthy()
  }, 90000)
})

it('should have liquidity in TU10-DUSD pool', async () => {
  await waitForExpect(async () => {
    const pairsResult = await testing.jsonRpcClient!.poolpair.getPoolPair('TU10-DUSD')
    expect(Object.values(pairsResult)[0].reserveA.gt(0)).toBeTruthy()
    expect(Object.values(pairsResult)[0].reserveB.gt(0)).toBeTruthy()
  }, 90000)
})

it('should have liquidity in TD10-DUSD pool', async () => {
  await waitForExpect(async () => {
    const pairsResult = await testing.jsonRpcClient!.poolpair.getPoolPair('TD10-DUSD')
    expect(Object.values(pairsResult)[0].reserveA.gt(0)).toBeTruthy()
    expect(Object.values(pairsResult)[0].reserveB.gt(0)).toBeTruthy()
  }, 90000)
})

it('should have liquidity in TS25-DUSD pool', async () => {
  await waitForExpect(async () => {
    const pairsResult = await testing.jsonRpcClient!.poolpair.getPoolPair('TS25-DUSD')
    expect(Object.values(pairsResult)[0].reserveA.gt(0)).toBeTruthy()
    expect(Object.values(pairsResult)[0].reserveB.gt(0)).toBeTruthy()
  }, 90000)
})

it('should have liquidity in TR50-DUSD pool', async () => {
  await waitForExpect(async () => {
    const pairsResult = await testing.jsonRpcClient!.poolpair.getPoolPair('TR50-DUSD')
    expect(Object.values(pairsResult)[0].reserveA.gt(0)).toBeTruthy()
    expect(Object.values(pairsResult)[0].reserveB.gt(0)).toBeTruthy()
  }, 90000)
})
