import { OceanApiTesting } from '../../../testing/OceanApiTesting'
import { Elliptic } from '@defichain/jellyfish-crypto'
import { ApiException } from '@defichain/ocean-api-client'

const apiTesting = OceanApiTesting.create()
const privA = Elliptic.fromPrivKey(Buffer.from('619c335025c7f4012e556c2a58b2506e30b8511b53ade95ea316fd8c3286feb9', 'hex'))
const privB = Elliptic.fromPrivKey(Buffer.from('557c4bdff86e59015987c1c7f3328a1fb4c2177b5e834f09c8cd10fae51af93b', 'hex'))

beforeAll(async () => {
  await apiTesting.start()
  await apiTesting.testing.container.waitForWalletCoinbaseMaturity()
})

afterAll(async () => {
  await apiTesting.stop()
})

it('should accept valid txn', async () => {
  const { hex: { signed } } = await apiTesting.testing.rawtx.fund({
    a: { amount: 10, ellipticPair: privA },
    b: { amount: 9.9999, ellipticPair: privB }
  })

  await apiTesting.client.rawtx.test({
    hex: signed
  })
})

it('should accept valid txn with given maxFeeRate', async () => {
  const { hex: { signed } } = await apiTesting.testing.rawtx.fund({
    a: { amount: 10, ellipticPair: privA },
    b: { amount: 9.9999, ellipticPair: privB }
  })
  await apiTesting.client.rawtx.test({
    hex: signed,
    maxFeeRate: 0.05
  })
})

it('should reject due to invalid txn', async () => {
  expect.assertions(2)
  try {
    await apiTesting.client.rawtx.test({ hex: '0400000100881133bb11aa00cc' })
  } catch (err: any) {
    expect(err).toBeInstanceOf(ApiException)
    expect(err.error).toStrictEqual({
      code: 400,
      type: 'BadRequest',
      message: '400 - BadRequest  : Transaction decode failed',
      at: expect.any(Number),
      url: '/v1/regtest/rawtx/test'
    })
  }
})

it('should reject due to high fees', async () => {
  const { hex: { signed } } = await apiTesting.testing.rawtx.fund({
    a: { amount: 10, ellipticPair: privA },
    b: { amount: 9, ellipticPair: privB }
  })
  expect.assertions(2)
  try {
    await apiTesting.client.rawtx.test({
      hex: signed,
      maxFeeRate: 1
    })
  } catch (err: any) {
    expect(err).toBeInstanceOf(ApiException)
    expect(err.error).toStrictEqual({
      code: 400,
      type: 'BadRequest',
      at: expect.any(Number),
      message: '400 - BadRequest  : Transaction is not allowed to be inserted',
      url: '/v1/regtest/rawtx/test'
    })
  }
})
