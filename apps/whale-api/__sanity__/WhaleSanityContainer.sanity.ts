import { WhaleSanityContainer } from '@defichain/testcontainers'
import { WhaleApiClient } from '@defichain/whale-api-client'
import waitForExpect from 'wait-for-expect'

const whale = new WhaleSanityContainer()
let client: WhaleApiClient

beforeAll(async () => {
  await whale.start()
  client = new WhaleApiClient({
    url: await whale.getUrl(),
    version: 'v0.0',
    network: 'regtest'
  })

  async function mockRealisticState (): Promise<void> {
    await whale.blockchain.waitForWalletCoinbaseMaturity()
    await whale.blockchain.waitForWalletBalanceGTE(100)

    // Mock the time for so readiness healthcheck doesn't indicate tip is stale
    const nowInSeconds = Math.floor(Date.now() / 1000)
    await whale.blockchain.call('setmocktime', [nowInSeconds])
    await whale.blockchain.generate(1)
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
    it('should return "ok" status', async () => {
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
    it('should have status code 503 as defid has no peers', async () => {
      const response = await whale.get('/_actuator/probes/readiness')
      expect(response.status).toStrictEqual(503)
      expect(await response.json()).toStrictEqual({
        details: {
          defid: {
            blocks: expect.any(Number),
            headers: expect.any(Number),
            initialBlockDownload: false,
            peers: 0,
            status: 'down'
          },
          model: {
            count: {
              defid: expect.any(Number),
              index: expect.any(Number)
            },
            status: 'up'
          }
        },
        error: {
          defid: {
            blocks: expect.any(Number),
            headers: expect.any(Number),
            initialBlockDownload: false,
            peers: 0,
            status: 'down'
          }
        },
        info: {
          model: {
            count: {
              defid: expect.any(Number),
              index: expect.any(Number)
            },
            status: 'up'
          }
        },
        status: 'error'
      })
    })
  })
})

describe('/rpc/getblockchaininfo', () => {
  const expected = {
    bestblockhash: expect.stringMatching(/[0-f]{64}/),
    blocks: 102,
    chain: 'regtest',
    chainwork: '00000000000000000000000000000000000000000000000000000000000000ce',
    difficulty: expect.any(Number),
    headers: 102,
    initialblockdownload: false,
    mediantime: expect.any(Number),
    pruned: false,
    size_on_disk: expect.any(Number),
    softforks: expect.any(Object),
    verificationprogress: 1,
    warnings: expect.any(String)
  }

  it('should return correct data - request via raw http', async () => {
    const response = await whale.call('/v0.0/regtest/rpc', 'getblockchaininfo')

    expect(response.status).toStrictEqual(201)
    expect(await response.json()).toStrictEqual({
      error: null,
      id: null,
      result: expected
    })
  })

  it('should return correct data - request via WhaleApiClient', async () => {
    const info = await client.rpc.call('getblockchaininfo', [], 'number')
    expect(info).toStrictEqual(expected)
  })
})

describe('/rpc/getblockhash', () => {
  const expected = 'd744db74fb70ed42767ae028a129365fb4d7de54ba1b6575fb047490554f8a7b'

  it('should return correct data - request via raw http', async () => {
    const response = await whale.call('/v0.0/regtest/rpc', 'getblockhash', [0])

    expect(response.status).toStrictEqual(201)
    expect(await response.json()).toStrictEqual({
      error: null,
      id: null,
      result: expected
    })
  })

  it('should return correct data - request via WhaleApiClient', async () => {
    const hash = await client.rpc.call<string>('getblockhash', [0], 'number')
    expect(hash).toStrictEqual(expected)
  })
})

describe('/rpc/getblock', () => {
  const expected = {
    bits: '207fffff',
    chainwork: '0000000000000000000000000000000000000000000000000000000000000002',
    confirmations: 103,
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
        Burnt: 0,
        CommunityDevelopmentFunds: 0
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

  it('should return correct data - request via raw http', async () => {
    const response = await whale.call(
      '/v0.0/regtest/rpc',
      'getblock',
      ['d744db74fb70ed42767ae028a129365fb4d7de54ba1b6575fb047490554f8a7b', 2]
    )
    expect(response.status).toStrictEqual(201)
    expect(await response.json()).toStrictEqual({
      error: null,
      id: null,
      result: expected
    })
  })

  it('should return correct data - request via WhaleApiClient', async () => {
    const block = await client.rpc.call(
      'getblock',
      [
        'd744db74fb70ed42767ae028a129365fb4d7de54ba1b6575fb047490554f8a7b',
        2
      ],
      'number'
    )
    expect(block).toStrictEqual(expected)
  })
})

describe('/tokens', () => {
  const expected = [
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

  it('should return correct data - request via raw http', async () => {
    const response = await whale.get('/v0.0/regtest/tokens')

    expect(response.status).toStrictEqual(200)
    expect(await response.json()).toStrictEqual({
      data: expected
    })
  })

  it('should return correct data - request via WhaleApiClient', async () => {
    const tokens = await client.tokens.list()
    expect([...tokens]).toStrictEqual(expected)
  })
})

describe('/poolpairs', () => {
  const expected: any[] = []

  it('should return correct data - request via raw http', async () => {
    const response = await whale.get('/v0.0/regtest/poolpairs')
    expect(response.status).toStrictEqual(200)

    expect(await response.json()).toStrictEqual({
      data: expected
    })
  })

  it('should return correct data - request via WhaleApiClient', async () => {
    const poolpairs = await client.poolpairs.list()
    expect([...poolpairs]).toStrictEqual(expected)
  })
})
