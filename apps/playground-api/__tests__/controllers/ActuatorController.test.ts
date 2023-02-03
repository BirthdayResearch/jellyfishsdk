import { PlaygroundApiTesting } from '../../testing/PlaygroundApiTesting'
import { TestingGroup } from '@defichain/jellyfish-testing'

describe('no peers', () => {
  const apiTesting = PlaygroundApiTesting.create()

  beforeAll(async () => {
    await apiTesting.start()
  })

  afterAll(async () => {
    await apiTesting.stop()
  })

  it('/_actuator/probes/liveness healthy', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/_actuator/probes/liveness'
    })

    expect(res.json()).toStrictEqual({
      data: {
        details: {
          blockchain: {
            status: 'up'
          },
          playground: {
            status: 'up'
          }
        },
        error: {},
        info: {
          blockchain: {
            status: 'up'
          },
          playground: {
            status: 'up'
          }
        },
        status: 'ok'
      }
    })
    expect(res.statusCode).toStrictEqual(200)
  })

  it('/_actuator/probes/readiness unhealthy', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/_actuator/probes/readiness'
    })

    expect(res.json()).toStrictEqual({
      data: {
        details: {
          blockchain: {
            blocks: expect.any(Number),
            headers: expect.any(Number),
            initialBlockDownload: expect.any(Boolean),
            peers: 0,
            status: 'down'
          },
          playground: {
            status: 'up'
          }
        },
        error: {
          blockchain: {
            blocks: expect.any(Number),
            headers: expect.any(Number),
            initialBlockDownload: expect.any(Boolean),
            peers: 0,
            status: 'down'
          }
        },
        info: {
          playground: {
            status: 'up'
          }
        },
        status: 'error'
      },
      error: {
        at: expect.any(Number),
        code: 503,
        message: 'Service Unavailable Exception',
        type: 'ServiceUnavailable',
        url: '/_actuator/probes/readiness'
      }
    })
    expect(res.statusCode).toStrictEqual(503)
  })
})

describe('with peers', () => {
  const apiTesting = PlaygroundApiTesting.create(TestingGroup.create(2))

  beforeAll(async () => {
    await apiTesting.start()
    await apiTesting.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await apiTesting.stop()
  })

  it('/_actuator/probes/liveness healthy', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/_actuator/probes/liveness'
    })

    expect(res.json()).toStrictEqual({
      data: {
        details: {
          blockchain: {
            status: 'up'
          },
          playground: {
            status: 'up'
          }
        },
        error: {},
        info: {
          blockchain: {
            status: 'up'
          },
          playground: {
            status: 'up'
          }
        },
        status: 'ok'
      }
    })
    expect(res.statusCode).toStrictEqual(200)
  })

  it('/_actuator/probes/readiness healthy', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/_actuator/probes/readiness'
    })

    expect(res.json()).toStrictEqual({
      data: {
        details: {
          blockchain: {
            blocks: expect.any(Number),
            headers: expect.any(Number),
            initialBlockDownload: false,
            peers: 1,
            status: 'up'
          },
          playground: {
            status: 'up'
          }
        },
        error: {},
        info: {
          blockchain: {
            blocks: expect.any(Number),
            headers: expect.any(Number),
            initialBlockDownload: false,
            peers: 1,
            status: 'up'
          },
          playground: {
            status: 'up'
          }
        },
        status: 'ok'
      }
    })
    expect(res.statusCode).toStrictEqual(200)
  })
})
