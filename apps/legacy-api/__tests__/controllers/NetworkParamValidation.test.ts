import { LegacyApiTesting } from '../../testing/LegacyApiTesting'

const apiTesting = LegacyApiTesting.create()

describe('NetworkParamValidation', () => {
  beforeAll(async () => {
    await apiTesting.start()
  })

  afterAll(async () => {
    await apiTesting.stop()
  })

  it('all registered routes are guarded against invalid network param', async () => {
    // dummy call to trigger fastify hooks so that all routes are registered
    await apiTesting.app.inject({
      method: 'GET',
      url: '/v1'
    }).catch()

    const unprotectedRoutes = []
    const routes = apiTesting.getAllRoutes()
    for (const { url } of routes) {
      if (url === '*' || url.startsWith('/_')) {
        continue
      }

      const result = await apiTesting.app.inject({
        method: 'GET',
        url: `${url}?network=abc` // Query with some invalid network
      })

      const { message, statusCode } = result.json()
      if (message !== 'Not Found' || statusCode !== 404) {
        unprotectedRoutes.push(url)
      }
    }

    // All routes should use NetworkValidationPipe
    expect(unprotectedRoutes).toStrictEqual([])
  })
})
