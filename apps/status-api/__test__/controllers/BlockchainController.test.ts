import { StatusApiTesting } from '../../testing/StatusApiTesting'

describe('BlockchainController', () => {
  const apiTesting = StatusApiTesting.create()

  beforeAll(async () => {
    await apiTesting.start()
  })

  afterAll(async () => {
    await apiTesting.stop()
  })

  it('/blockchain/status - Operational', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/blockchain/status'
    })

    expect(res.statusCode).toStrictEqual(200)
    expect(res.body).toContain('operational')
  })
})
