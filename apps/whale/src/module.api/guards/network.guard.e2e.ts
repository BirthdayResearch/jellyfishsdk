import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp } from '../../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

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

  expect(res.statusCode).toBe(404)
  expect(res.json()).toEqual({
    error: {
      code: 404,
      type: 'NotFound',
      at: expect.any(Number),
      message: 'Network not found',
      url: '/v1/mainnet/rpc/getblockchaininfo'
    }
  })
})
