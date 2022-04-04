import { WhaleSanityContainer } from '../../../src/containers/SanityContainer/WhaleSanityContainer'

const container = new WhaleSanityContainer()

beforeAll(async () => {
  await container.start()
})

afterAll(async () => {
  await container.stop()
})

it('should spin up a valid whale container', async () => {
  const url = await container.getUrl()
  expect(url).toBeDefined()
})

describe('/_actuator/probes/liveness', () => {
  it('should wait until liveness', async () => {
    const res = await container.get('/_actuator/probes/liveness')

    console.log(res)

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
