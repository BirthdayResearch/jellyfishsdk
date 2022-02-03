import { LegacyApiTesting } from '../../testing/LegacyApiTesting'

const apiTesting = LegacyApiTesting.create()

beforeAll(async () => {
  await apiTesting.start()
})

afterAll(async () => {
  await apiTesting.stop()
})

it('/v1/listpoolpairs', async () => {
  const res = await apiTesting.app.inject({
    method: 'GET',
    url: '/v1/listpoolpairs'
  })

  expect(res.statusCode).toStrictEqual(200)
  expect(res.json()).toStrictEqual({

  })
})
