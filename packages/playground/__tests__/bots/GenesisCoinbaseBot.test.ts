import { PlaygroundTesting } from '../../testing/PlaygroundTesting'

const playgroundTesting = PlaygroundTesting.create()

beforeAll(async () => {
  await playgroundTesting.start()
  await playgroundTesting.container.waitForWalletCoinbaseMaturity()
  await playgroundTesting.bootstrap()
})

afterAll(async () => {
  await playgroundTesting.stop()
})

it('should have tokens setup', async () => {
  const tokens = await playgroundTesting.rpc.token.listTokens()
  expect(Object.keys(tokens).length).toStrictEqual(10)
})
