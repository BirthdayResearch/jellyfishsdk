import { LegacyApiTesting } from '../../testing/LegacyApiTesting'

const apiTesting = LegacyApiTesting.create()

beforeAll(async () => {
  await apiTesting.start()
})

afterAll(async () => {
  await apiTesting.stop()
})

it('/v1/getblockcount', async () => {
  const res = await apiTesting.app.inject({
    method: 'GET',
    url: '/v1/getblockcount'
  })

  expect(res.json()).toStrictEqual({
    data: expect.any(Number)
  })
})
