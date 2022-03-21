import { PlaygroundApiTesting } from '../../testing/PlaygroundApiTesting'

const apiTesting = PlaygroundApiTesting.create()

beforeAll(async () => {
  await apiTesting.start()
  await apiTesting.container.waitForWalletCoinbaseMaturity()
})

afterAll(async () => {
  await apiTesting.stop()
})

it('should be able to get playground info', async () => {
  const res = await apiTesting.client.playground.info()
  expect(res.block.count).toBeGreaterThanOrEqual(101)
})
