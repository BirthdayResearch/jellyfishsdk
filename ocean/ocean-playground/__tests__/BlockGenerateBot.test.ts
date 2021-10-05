import { PlaygroundTesting } from '../testing/PlaygroundTesting'

const playgroundTesting = PlaygroundTesting.create()

beforeAll(async () => {
  await playgroundTesting.start()
  await playgroundTesting.bootstrap()
})

afterAll(async () => {
  await playgroundTesting.stop()
})

it('should block generate when cycle', async () => {
  const initial = await playgroundTesting.rpc.blockchain.getBlockCount()
  expect(initial).toStrictEqual(0)

  await playgroundTesting.cycle()

  const next = await playgroundTesting.rpc.blockchain.getBlockCount()
  expect(next).toStrictEqual(1)
})
