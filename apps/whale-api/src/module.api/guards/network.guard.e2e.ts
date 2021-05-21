import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp } from '@src/e2e.module'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  app = await createTestingApp(container)
})

afterAll(async () => {
  await container.stop()
})

it('should 404 with invalid network', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/mainnet/rpc/getblockchaininfo'
  })

  expect(res.statusCode).toStrictEqual(404)
  expect(res.json()).toStrictEqual({
    error: {
      code: 404,
      type: 'NotFound',
      at: expect.any(Number),
      message: 'Network not found',
      url: '/v1/mainnet/rpc/getblockchaininfo'
    }
  })
})
