import { WhaleSanityContainer } from '@defichain/testcontainers'
import waitForExpect from 'wait-for-expect'

const whale = new WhaleSanityContainer()

// TODO(kodemon/eli-lim):
//   would it make sense to use WhaleApiClient for sanity tests,
//   instead of raw http requests?

beforeAll(async () => {
  await whale.start()

  async function mockRealisticState (): Promise<void> {
    await whale.blockchain.waitForWalletCoinbaseMaturity()
    await whale.blockchain.waitForWalletBalanceGTE(100)

    // TODO(kodemon/eli-lim): Create tokens, pool pairs, etc. to sanity test the endpoints
  }
  await mockRealisticState()

  await waitForExpect(async () => {
    const response = await whale.get('/_actuator/probes/readiness')
    const json = await response.json()
    expect(json.details.model.status).toStrictEqual('up')
    expect(json.details.defid.blocks).toBeGreaterThanOrEqual(100)
  }, 60_000)
})

afterAll(async () => {
  await whale.stop()
})

describe('/_actuator', () => {
  describe('/_actuator/probes/liveness', () => {
    test('Status in JSON body is ok', async () => {
      const response = await whale.get('/_actuator/probes/liveness')
      expect(await response.json()).toStrictEqual({
        details: {
          defid: { status: 'up' },
          model: { status: 'up' }
        },
        error: {},
        info: {
          defid: { status: 'up' },
          model: { status: 'up' }
        },
        status: 'ok'
      })
      expect(response.status).toStrictEqual(200)
    })
  })

  describe('/_actuator/probes/readiness', () => {
    test('Status code is 503', async () => {
      const response = await whale.get('/_actuator/probes/readiness')
      expect(response.status).toStrictEqual(503)
    })
  })
})
