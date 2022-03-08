import { PlaygroundApiTesting } from '../../testing/PlaygroundApiTesting'
import waitForExpect from 'wait-for-expect'
import { PlaygroundProbeIndicator } from '../../src/PlaygroundIndicator'

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
    const vaults = await testing.container.call('listvaults')
    expect(vaults.length).toBeGreaterThan(0)
  }, 90000)
})

it('should have liquidity in DUSD-DFI pool', async () => {
  await waitForExpect(async () => {
    const pairsResult = await testing.container.call('getpoolpair', ['DUSD-DFI'])
    const poolId = Object.keys(pairsResult)[0]
    expect(pairsResult[poolId].reserveA > 0).toBeTruthy()
    expect(pairsResult[poolId].reserveB > 0).toBeTruthy()
  }, 90000)
})

it('should have liquidity in TU10-DUSD pool', async () => {
  await waitForExpect(async () => {
    const pairsResult = await testing.container.call('getpoolpair', ['TU10-DUSD'])
    const poolId = Object.keys(pairsResult)[0]
    expect(pairsResult[poolId].reserveA > 0).toBeTruthy()
    expect(pairsResult[poolId].reserveB > 0).toBeTruthy()
  }, 90000)
})

it('should have liquidity in TD10-DUSD pool', async () => {
  await waitForExpect(async () => {
    const pairsResult = await testing.container.call('getpoolpair', ['TD10-DUSD'])
    const poolId = Object.keys(pairsResult)[0]
    expect(pairsResult[poolId].reserveA > 0).toBeTruthy()
    expect(pairsResult[poolId].reserveB > 0).toBeTruthy()
  }, 90000)
})

it('should have liquidity in TS25-DUSD pool', async () => {
  await waitForExpect(async () => {
    const pairsResult = await testing.container.call('getpoolpair', ['TS25-DUSD'])
    const poolId = Object.keys(pairsResult)[0]
    expect(pairsResult[poolId].reserveA > 0).toBeTruthy()
    expect(pairsResult[poolId].reserveB > 0).toBeTruthy()
  }, 90000)
})

it('should have liquidity in TR50-DUSD pool', async () => {
  await waitForExpect(async () => {
    const pairsResult = await testing.container.call('getpoolpair', ['TR50-DUSD'])
    const poolId = Object.keys(pairsResult)[0]
    expect(pairsResult[poolId].reserveA > 0).toBeTruthy()
    expect(pairsResult[poolId].reserveB > 0).toBeTruthy()
  }, 90000)
})
