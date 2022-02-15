import { PlaygroundTesting } from '../e2e.module'

const testing = new PlaygroundTesting()

beforeAll(async () => {
  await testing.start()
})

afterAll(async () => {
  await testing.stop()
})

describe('/_actuator/probes/liveness', () => {
  it('should wait until liveness', async () => {
    const res = await testing.app.inject({
      method: 'GET',
      url: '/_actuator/probes/liveness'
    })

    expect(res.statusCode).toStrictEqual(200)
    expect(res.json()).toStrictEqual({
      details: {
        defid: {
          status: 'up'
        },
        playground: {
          status: 'up'
        }
      },
      error: {},
      info: {
        defid: {
          status: 'up'
        },
        playground: {
          status: 'up'
        }
      },
      status: 'ok'
    })
  })
})

describe('/_actuator/probes/readiness', () => {
  it('should wait until readiness', async () => {
    const res = await testing.app.inject({
      method: 'GET',
      url: '/_actuator/probes/readiness'
    })

    expect(res.statusCode).toStrictEqual(200)
  })
})
