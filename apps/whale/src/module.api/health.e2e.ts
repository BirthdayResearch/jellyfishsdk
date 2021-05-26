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
  try {
    await app.close()
  } finally {
    await container.stop()
  }
})

describe('/_health/probes/liveness', () => {
  it('should wait until liveness', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/_health/probes/liveness'
    })

    expect(res.statusCode).toStrictEqual(200)
    expect(res.json()).toStrictEqual({
      details: {
        defid: {
          status: 'up'
        }
      },
      error: {},
      info: {
        defid: {
          status: 'up'
        }
      },
      status: 'ok'
    })
  })
})

describe('/_health/probes/readiness', () => {
  // TODO(fuxingloh): /_health/probes/readiness tests for it to be ready

  it('should wait until readiness, but never will be as it lacks connections', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/_health/probes/readiness'
    })

    expect(res.statusCode).toStrictEqual(503)
    expect(res.json()).toStrictEqual({
      details: {
        defid: {
          blocks: expect.any(Number),
          headers: expect.any(Number),
          initialBlockDownload: expect.any(Boolean),
          peers: 0,
          status: 'down'
        }
      },
      error: {
        defid: {
          blocks: expect.any(Number),
          headers: expect.any(Number),
          initialBlockDownload: expect.any(Boolean),
          peers: 0,
          status: 'down'
        }
      },
      info: {},
      status: 'error'
    })
  })
})
