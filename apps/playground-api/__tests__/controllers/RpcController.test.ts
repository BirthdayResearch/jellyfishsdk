import { PlaygroundApiTesting } from '../../testing/PlaygroundApiTesting'

const apiTesting = PlaygroundApiTesting.create()

beforeAll(async () => {
  await apiTesting.start()
  await apiTesting.container.waitForBlockHeight(100)
})

afterAll(async () => {
  await apiTesting.stop()
})

it('should be able call rpc getblockcount', async () => {
  const res: any = await apiTesting.client.rpc.call('getblockcount', [], 'number')
  expect(Number(res.value)).toBeGreaterThanOrEqual(100)
})

it('should be blacklisted', async () => {
  const promise = apiTesting.client.rpc.call('importprivkey', ['0'.repeat(52)], 'number')
  await expect(promise).rejects.toThrow('RPC method is blacklisted')
})
