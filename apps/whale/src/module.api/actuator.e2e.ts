import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, waitForIndexedHeight } from '@src/e2e.module'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  app = await createTestingApp(container)

  await container.generate(3)
  await waitForIndexedHeight(app, 2)
})

afterAll(async () => {
  try {
    await app.close()
  } finally {
    await container.stop()
  }
})

describe('/_actuator/probes/liveness', () => {
  it('should wait until liveness', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/_actuator/probes/liveness'
    })

    expect(res.statusCode).toStrictEqual(200)
    expect(res.json()).toStrictEqual({
      details: {
        defid: {
          status: 'up'
        },
        model: {
          status: 'up'
        }
      },
      error: {},
      info: {
        defid: {
          status: 'up'
        },
        model: {
          status: 'up'
        }
      },
      status: 'ok'
    })
  })
})

describe('/_actuator/probes/readiness', () => {
  // TODO(fuxingloh): /_actuator/probes/readiness tests for it to be ready

  it('should wait until readiness, but never will be as it lacks connections', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/_actuator/probes/readiness'
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
        },
        model: {
          count: {
            defid: expect.any(Number),
            index: expect.any(Number)
          },
          status: 'up'
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
      info: {
        model: {
          count: {
            defid: expect.any(Number),
            index: expect.any(Number)
          },
          status: 'up'
        }
      },
      status: 'error'
    })
  })
})
