import { StubPlaygroundApiClient } from '../stub.client'
import { StubService } from '../stub.service'

const service = new StubService()
const client = new StubPlaygroundApiClient(service)

beforeAll(async () => {
  await service.start()
  await service.container.waitForWalletCoinbaseMaturity()
})

afterAll(async () => {
  await service.stop()
})

it('should get info', async () => {
  const info = await client.playground.info()

  expect(info).toStrictEqual({
    block: {
      count: expect.any(Number),
      hash: expect.stringMatching(/[0-f]{64}/)
    }
  })
})
