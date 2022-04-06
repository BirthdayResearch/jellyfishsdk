import { WhaleSanityContainer } from '../../../src/containers/SanityContainer/WhaleSanityContainer'
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

describe('/v0.0/regtest/rpc/getblockchaininfo', () => {
  test('returns correct response', async () => {
    const response = await whale.post('/v0.0/regtest/rpc/getblockchaininfo')
    expect(await response.json()).toStrictEqual({
      data: {
        bestblockhash: expect.stringMatching(/^[a-f0-9]{64}$/),
        blocks: expect.any(Number),
        chain: 'regtest',
        chainwork: '00000000000000000000000000000000000000000000000000000000000000cc',
        difficulty: expect.any(Number),
        headers: 101,
        initialblockdownload: false,
        mediantime: expect.any(Number),
        pruned: false,
        size_on_disk: expect.any(Number),
        softforks: {
          amk: {
            active: true,
            height: 0,
            type: 'buried'
          },
          bayfront: {
            active: true,
            height: 1,
            type: 'buried'
          },
          clarkequay: {
            active: true,
            height: 3,
            type: 'buried'
          },
          dakota: {
            active: true,
            height: 4,
            type: 'buried'
          },
          dakotacrescent: {
            active: true,
            height: 5,
            type: 'buried'
          },
          eunos: {
            active: true,
            height: 6,
            type: 'buried'
          },
          eunospaya: {
            active: true,
            height: 7,
            type: 'buried'
          },
          fortcanning: {
            active: true,
            height: 8,
            type: 'buried'
          },
          fortcanninghill: {
            active: true,
            height: 10,
            type: 'buried'
          },
          fortcanningmuseum: {
            active: true,
            height: 9,
            type: 'buried'
          },
          fortcanningpark: {
            active: false,
            height: 10000000,
            type: 'buried'
          },
          fortcanningroad: {
            active: true,
            height: 11,
            type: 'buried'
          },
          testdummy: {
            active: false,
            bip9: {
              since: 0,
              startTime: 0,
              status: 'defined',
              timeout: 9223372036854776000
            },
            type: 'bip9'
          }
        },
        verificationprogress: 1,
        warnings: ''
      }
    })
    expect(response.status).toStrictEqual(200)
  })
})

describe('/v0.0/regtest/rpc/getblockhash', () => {
  // FIXME
  test('regtest genesis block', async () => {
    await waitForExpect(async () => {
      const response = await whale.post('/v0.0/regtest/rpc/getblockhash', {
        params: [0]
      })
      expect(await response.json()).toStrictEqual({
        data: 'd744db74fb70ed42767ae028a129365fb4d7de54ba1b6575fb047490554f8a7b'
      })
      expect(response.status).toStrictEqual(200)
    })
  })

  test('best block (chain tip) hash matches defid', async () => {
    const bestBlockHash = await whale.blockchain.getBestBlockHash()

    const response = await whale.post('/v0.0/regtest/rpc/getblockhash', {
      params: [await whale.blockchain.getBlockCount()]
    })

    expect(await response.json()).toStrictEqual({ data: bestBlockHash })
    expect(response.status).toStrictEqual(200)
  })
})

describe('/v0.0/regtest/rpc/getblock', () => {
  test('regtest genesis block', async () => {
    // FIXME
    const response = await whale.post('/v0.0/regtest/rpc/getblock', {
      params: ['d744db74fb70ed42767ae028a129365fb4d7de54ba1b6575fb047490554f8a7b', 2]
    })
    expect(await response.json()).toStrictEqual({
    })
    expect(response.status).toStrictEqual(200)
  })
})

describe('/v0.0/regtest/tokens', () => {
  test('data is a hash', async () => {
    const response = await whale.get('/v0.0/regtest/tokens')
    expect(await response.json()).toStrictEqual({
      data: [
        {
          creation: {
            height: 0,
            tx: '0000000000000000000000000000000000000000000000000000000000000000'
          },
          decimal: 8,
          destruction: {
            height: -1,
            tx: '0000000000000000000000000000000000000000000000000000000000000000'
          },
          displaySymbol: 'DFI',
          finalized: true,
          id: '0',
          isDAT: true,
          isLPS: false,
          isLoanToken: false,
          limit: '0',
          mintable: false,
          minted: '0',
          name: 'Default Defi token',
          symbol: 'DFI',
          symbolKey: 'DFI',
          tradeable: true
        }
      ]
    })
    expect(response.status).toStrictEqual(200)
  })
})

describe('/v0.0/regtest/poolpairs', () => {
  test('poolpair format is correct', async () => {
    const response = await whale.get('/v0.0/regtest/poolpairs')
    expect(await response.json()).toStrictEqual({
      data: []
    })
    expect(response.status).toStrictEqual(200)
  })
})
