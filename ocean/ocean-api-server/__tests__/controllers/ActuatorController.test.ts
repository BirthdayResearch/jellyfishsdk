import { OceanApiTesting } from '../../testing/OceanApiTesting'
import { TestingGroup } from '@defichain/jellyfish-testing'

describe('no peers', () => {
  const apiTesting = OceanApiTesting.create()

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
          ain: {
            status: 'up'
          }
        },
        error: {},
        info: {
          ain: {
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
          ain: {
            blocks: expect.any(Number),
            headers: expect.any(Number),
            initialBlockDownload: expect.any(Boolean),
            peers: 0,
            status: 'down'
          }
        },
        error: {
          ain: {
            blocks: expect.any(Number),
            headers: expect.any(Number),
            initialBlockDownload: expect.any(Boolean),
            peers: 0,
            status: 'down'
          }
        },
        info: {},
        status: 'error'
      },
      error: {
        at: expect.any(Number),
        code: 503,
        message: 'Service Unavailable Exception',
        type: 'BadGateway',
        url: '/_actuator/probes/readiness'
      }
    })
    expect(res.statusCode).toStrictEqual(503)
  })
})

describe('with peers', () => {
  const apiTesting = OceanApiTesting.create(TestingGroup.create(2))

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
          ain: {
            status: 'up'
          }
        },
        error: {},
        info: {
          ain: {
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
          ain: {
            blocks: expect.any(Number),
            headers: expect.any(Number),
            initialBlockDownload: false,
            peers: 1,
            status: 'up'
          }

        },
        error: {},
        info: {
          ain: {
            blocks: expect.any(Number),
            headers: expect.any(Number),
            initialBlockDownload: false,
            peers: 1,
            status: 'up'
          }
        },
        status: 'ok'
      }
    })
    expect(res.statusCode).toStrictEqual(200)
  })
})
