import { LegacyApiTesting } from '../../testing/LegacyApiTesting'
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens'

const apiTesting = LegacyApiTesting.create()

beforeAll(async () => {
  await apiTesting.start()
})

afterAll(async () => {
  await apiTesting.stop()
})

it('/v1/gettoken?id=1', async () => {
  const res = await apiTesting.app.inject({
    method: 'GET',
    url: '/v1/gettoken?id=1'
  })

  expect(Object.entries(res.json()).length).toStrictEqual(1)
  for (const [key, token] of Object.entries(res.json())) {
    const data = { collateralAddress: 'TESTAddress', ...(token as TokenData) }

    expect(key).toStrictEqual('1')
    expect(data).toStrictEqual({
      symbol: expect.any(String),
      symbolKey: expect.any(String),
      name: expect.any(String),
      decimal: expect.any(Number),
      limit: expect.any(Number),
      mintable: expect.any(Boolean),
      tradeable: expect.any(Boolean),
      isDAT: expect.any(Boolean),
      isLPS: expect.any(Boolean),
      finalized: expect.any(Boolean),
      isLoanToken: expect.any(Boolean),
      minted: expect.any(Number),
      creationTx: expect.any(String),
      creationHeight: expect.any(Number),
      destructionTx: expect.any(String),
      destructionHeight: expect.any(Number),
      collateralAddress: expect.any(String)
    })
  }
})

it('/v1/listtokens', async () => {
  const res = await apiTesting.app.inject({
    method: 'GET',
    url: '/v1/listtokens'
  })
  const tokens: TokenData[] = res.json()

  expect(Object.entries(tokens).length).toBeGreaterThan(0)
  for (const [key, token] of Object.entries(tokens)) {
    const data = { collateralAddress: 'TESTAddress', ...token }

    expect(key).toStrictEqual(expect.any(String))
    expect(data).toStrictEqual({
      symbol: expect.any(String),
      symbolKey: expect.any(String),
      name: expect.any(String),
      decimal: expect.any(Number),
      limit: expect.any(Number),
      mintable: expect.any(Boolean),
      tradeable: expect.any(Boolean),
      isDAT: expect.any(Boolean),
      isLPS: expect.any(Boolean),
      finalized: expect.any(Boolean),
      isLoanToken: expect.any(Boolean),
      minted: expect.any(Number),
      creationTx: expect.any(String),
      creationHeight: expect.any(Number),
      destructionTx: expect.any(String),
      destructionHeight: expect.any(Number),
      collateralAddress: expect.any(String)
    })
  }
})
