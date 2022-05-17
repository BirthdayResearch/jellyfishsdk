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

describe('/rpc', () => {
  it('/rpc/getblockchaininfo', async () => {
    const response = await whale.call('/v0.0/regtest/rpc', 'getblockchaininfo')
    expect(response.status).toStrictEqual(201)

    const jsonData = await response.json()
    expect(jsonData).toStrictEqual({
      error: null,
      id: null,
      result: {
        bestblockhash: expect.stringMatching(/[0-f]{64}/),
        blocks: 101,
        chain: 'regtest',
        chainwork: '00000000000000000000000000000000000000000000000000000000000000cc',
        difficulty: expect.any(Number),
        headers: 101,
        initialblockdownload: false,
        mediantime: expect.any(Number),
        pruned: false,
        size_on_disk: expect.any(Number),
        softforks: expect.any(Object),
        verificationprogress: 1,
        warnings: ''
      }
    })
  })

  it('/rpc/getblockhash', async () => {
    const response = await whale.call('/v0.0/regtest/rpc', 'getblockhash', [0])
    expect(response.status).toStrictEqual(201)

    const jsonData = await response.json()
    expect(jsonData).toStrictEqual({
      error: null,
      id: null,
      result: 'd744db74fb70ed42767ae028a129365fb4d7de54ba1b6575fb047490554f8a7b'
    })
  })

  it('/rpc/getblock', async () => {
    const response = await whale.call(
      '/v0.0/regtest/rpc',
      'getblock',
      ['d744db74fb70ed42767ae028a129365fb4d7de54ba1b6575fb047490554f8a7b', 2]
    )
    expect(response.status).toStrictEqual(201)

    const jsonData = await response.json()
    expect(jsonData).toStrictEqual({
      error: null,
      id: null,
      result: {
        bits: '207fffff',
        chainwork: '0000000000000000000000000000000000000000000000000000000000000002',
        confirmations: 102,
        difficulty: 4.656542373906925e-10,
        hash: 'd744db74fb70ed42767ae028a129365fb4d7de54ba1b6575fb047490554f8a7b',
        height: 0,
        mediantime: 1579045065,
        merkleroot: '5615dbbb379da893dd694e02d25a7955e1b7471db55f42bbd82b5d3f5bdb8d38',
        mintedBlocks: 0,
        nTx: 9,
        nextblockhash: 'e9e8b4a016f31e4f292da95076be91314904481c681d4b643b14e49d127e3e2e',
        nonutxo: [
          {
            AnchorReward: 0.2,
            IncentiveFunding: 20
          }
        ],
        size: 1424,
        stakeModifier: '0000000000000000000000000000000000000000000000000000000000000000',
        strippedsize: 1424,
        time: 1579045065,
        tx: expect.any(Array),
        version: 1,
        versionHex: '00000001',
        weight: 5696
      }
    })
  })
})

describe('/tokens', () => {
  it('/tokens', async () => {
    const response = await whale.get('/v0.0/regtest/tokens')
    expect(response.status).toStrictEqual(200)

    const jsonData = await response.json()

    expect(jsonData).toStrictEqual({
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
  })
})

describe('/poolpairs', () => {
  it('/poolpairs', async () => {
    const response = await whale.get('/v0.0/regtest/poolpairs')
    expect(response.status).toStrictEqual(200)

    const jsonData = await response.json()
    expect(jsonData).toStrictEqual({
      data: []
    })
  })
})
