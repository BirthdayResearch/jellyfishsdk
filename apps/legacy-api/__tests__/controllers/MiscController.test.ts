import { LegacyApiTesting } from '../../testing/LegacyApiTesting'

const apiTesting = LegacyApiTesting.create()

beforeAll(async () => {
  await apiTesting.start()
})

afterAll(async () => {
  await apiTesting.stop()
})

describe('MiscController', () => {
  it('/v1/getblockcount', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/getblockcount'
    })

    expect(res.json()).toStrictEqual({
      data: expect.any(Number)
    })
  })

  it('/v1/validateaddress - valid address', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/validateaddress?address=8VPSYCX6K2svJFM1994jF46iAo982AP7mM'
    })

    expect(res.json()).toStrictEqual({
      data: {
        address: '8VPSYCX6K2svJFM1994jF46iAo982AP7mM',
        isscript: false,
        isvalid: true,
        iswitness: false,
        scriptPubKey: '76a9149ce50f2da09678b80b8a5bf3898ae4f2a010b15188ac'
      }
    })
  })

  it('/v1/validateaddress - invalid address', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/validateaddress?address=abcdefg'
    })

    expect(res.json()).toStrictEqual({
      data: {
        isvalid: false
      }
    })
  })

  it('/v1/getgov?name=LP_DAILY_DFI_REWARD - valid', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/getgov?name=LP_DAILY_DFI_REWARD'
    })

    expect(res.json()).toStrictEqual({
      LP_DAILY_DFI_REWARD: expect.any(String)
    })
    expect(res.statusCode).toStrictEqual(200)
  })

  it('/v1/getgov?name=LP_SPLITS - valid', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/getgov?name=LP_SPLITS'
    })

    expect(res.json()).toStrictEqual({
      LP_SPLITS: expect.any(Object)
    })
    expect(res.statusCode).toStrictEqual(200)
  })

  it('/v1/getgov - invalid name', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/getgov?name=abc'
    })

    expect(res.json()).toStrictEqual({
      statusCode: 404,
      message: 'Not Found'
    })
    expect(res.statusCode).toStrictEqual(404)
  })
})
