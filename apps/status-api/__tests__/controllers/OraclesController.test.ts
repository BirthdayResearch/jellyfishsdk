import { StatusApiTesting } from '../../testing/StatusApiTesting'

const apiTesting = StatusApiTesting.create()

beforeAll(async () => {
  await apiTesting.start()
})

afterAll(async () => {
  await apiTesting.stop()
})

describe('/oracles', () => {
  it('/oracles?address=<address> - limited to 30', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/oracles?address=df1q02jh2rkymd6ncl75ql3f267u3guja9nzqj2qmn'
    })
    expect(res.json()).toStrictEqual({
      status: 'operational'
    })
    expect(res.statusCode).toStrictEqual(200)
  })
})
