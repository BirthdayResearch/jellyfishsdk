import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { createToken, createPoolPair } from '@defichain/testing'
import { TokenData } from '../../src/api/tokens'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()
  await createToken(container, 'DBTC')
  await createToken(container, 'DETH')
  await createPoolPair(container, 'DBTC', 'DETH')
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('client.tokens.list()', () => {
  it('should listTokens', async () => {
    const result = await client.tokens.list()
    expect(result.length).toStrictEqual(4)

    expect(result[0]).toStrictEqual({
      id: '0',
      symbol: 'DFI',
      symbolKey: 'DFI',
      name: 'Default Defi token',
      decimal: 8,
      limit: 0,
      mintable: false,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      finalized: true,
      minted: 0,
      creation: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: 0
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: ''
    })
  })

  it('should listTokens with pagination', async () => {
    const first = await client.tokens.list(2)

    expect(first.length).toStrictEqual(2)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual('1')

    expect(first[0]).toStrictEqual(expect.objectContaining({ id: '0', symbol: 'DFI', symbolKey: 'DFI' }))
    expect(first[1]).toStrictEqual(expect.objectContaining({ id: '1', symbol: 'DBTC', symbolKey: 'DBTC' }))

    const next = await client.paginate(first)

    expect(next.length).toStrictEqual(2)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual('3')

    expect(next[0]).toStrictEqual(expect.objectContaining({ id: '2', symbol: 'DETH', symbolKey: 'DETH' }))
    expect(next[1]).toStrictEqual(expect.objectContaining({ id: '3', symbol: 'DBTC-DET', symbolKey: 'DBTC-DET' }))

    const last = await client.paginate(next)

    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()
  })
})

describe('client.tokens.get()', () => {
  it('should return DFI coin with id as param', async () => {
    const data = await client.tokens.get('0')
    expect(data).toStrictEqual({
      id: '0',
      symbol: 'DFI',
      symbolKey: 'DFI',
      name: 'Default Defi token',
      decimal: 8,
      limit: 0,
      mintable: false,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      finalized: true,
      minted: 0,
      creation: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: 0
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: ''
    })
  })

  it('should fail due to id is not found', async () => {
    const call = async (): Promise<TokenData> => await client.tokens.get('4')
    await expect(call).rejects
      .toThrow('404 - NotFound (/v1/regtest/tokens/4): Unable to find token')
  })

  it('should fail due to id is malformed', async () => {
    const call = async (): Promise<TokenData> => await client.tokens.get('$*@')
    await expect(call).rejects
      .toThrow('400 - BadRequest (/v1/regtest/tokens/$*@): Validation failed (numeric string is expected)')
  })
})
