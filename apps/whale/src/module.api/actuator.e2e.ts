import { ContainerGroup, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, waitForIndexedHeight } from '../e2e.module'

describe('no peers', () => {
  const container = new MasterNodeRegTestContainer()
  let app: NestFastifyApplication

  beforeAll(async () => {
    await container.start()
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
})

describe('with peers', () => {
  const group = new ContainerGroup([
    new MasterNodeRegTestContainer(),
    new MasterNodeRegTestContainer()
  ])
  const container = group.get(0)
  let app: NestFastifyApplication

  beforeAll(async () => {
    await group.start()
    app = await createTestingApp(container)

    await container.generate(10)
    await group.waitForSync()
    await waitForIndexedHeight(app, 9)
  })

  afterAll(async () => {
    try {
      await app.close()
    } finally {
      await group.stop()
    }
  })

  it('/_actuator/probes/liveness healthy', async () => {
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

  it('/_actuator/probes/readiness healthy', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/_actuator/probes/readiness'
    })

    expect(res.statusCode).toStrictEqual(200)
    expect(res.json()).toStrictEqual({
      details: {
        defid: {
          blocks: expect.any(Number),
          headers: expect.any(Number),
          initialBlockDownload: false,
          peers: 1,
          status: 'up'
        },
        model: {
          count: {
            defid: expect.any(Number),
            index: expect.any(Number)
          },
          status: 'up'
        }
      },
      error: {},
      info: {
        defid: {
          blocks: expect.any(Number),
          headers: expect.any(Number),
          initialBlockDownload: false,
          peers: 1,
          status: 'up'
        },
        model: {
          count: {
            defid: expect.any(Number),
            index: expect.any(Number)
          },
          status: 'up'
        }
      },
      status: 'ok'
    })
  })
})
