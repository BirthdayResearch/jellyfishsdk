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

it('', async () => {
  const tokens = await playgroundTesting.rpc.token.listTokens()
  console.log('tokens: ', tokens)
})
