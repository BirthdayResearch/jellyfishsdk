import { LegacyApiTesting } from '../../testing/LegacyApiTesting'
import { WhaleApiClientProvider } from '../../src/providers/WhaleApiClientProvider'
import { WhaleApiClient } from '@defichain/whale-api-client'

describe('connected to ocean', () => {
  const apiTesting = LegacyApiTesting.create()

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
      details: {
        whale: {
          status: 'up'
        }
      },
      error: {},
      info: {
        whale: {
          status: 'up'
        }
      },
      status: 'ok'
    })
    expect(res.statusCode).toStrictEqual(200)
  })

  it('/_actuator/probes/readiness healthy', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/_actuator/probes/readiness'
    })

    expect(res.json()).toStrictEqual({
      details: {
        whale: {
          blocks: expect.any(Number),
          headers: expect.any(Number),
          initialBlockDownload: false,
          status: 'up'
        }
      },
      error: {},
      info: {
        whale: {
          blocks: expect.any(Number),
          headers: expect.any(Number),
          initialBlockDownload: expect.any(Boolean),
          status: 'up'
        }
      },
      status: 'ok'
    })
    expect(res.statusCode).toStrictEqual(200)
  })
})

// TODO(eli-lim): simulate disconnection
describe.skip('disconnected from ocean', () => {
  const apiTesting = LegacyApiTesting.create()

  beforeAll(async () => {
    await apiTesting.start()
    jest.spyOn(apiTesting.app.get(WhaleApiClientProvider), 'getClient')
      .mockImplementation(() => new WhaleApiClient({
        version: 'v0',
        network: 'mainnet',
        url: 'https://wrongendpoint.defichain.com'
      }))
  })

  afterAll(async () => {
    await apiTesting.stop()
  })

  it('/_actuator/probes/liveness unhealthy', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/_actuator/probes/liveness'
    })
    expect(res.json()).toStrictEqual({
      details: {
        whale: {
          status: 'down'
        }
      },
      error: {
        whale: {
          status: 'down'
        }
      },
      info: {},
      status: 'error'
    })
    expect(res.statusCode).toStrictEqual(503)
  })

  it('/_actuator/probes/readiness unhealthy', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/_actuator/probes/readiness'
    })

    expect(res.json()).toStrictEqual({
      details: {
        whale: {
          status: 'down'
        }
      },
      error: {
        whale: {
          status: 'down'
        }
      },
      info: {},
      status: 'error'
    })
    expect(res.statusCode).toStrictEqual(503)
  })
})
