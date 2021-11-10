import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

describe('Poolpair', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await container.stop()
  })

  async function setup (): Promise<void> {
    await createToken('DETH')
    await createToken('DXRP')
    await createToken('DUSDT')
    await createPoolPair('DETH', { commission: 0.001 })
    await createPoolPair('DXRP', { commission: 0.003 })
    await createPoolPair('DUSDT', { status: false })
  }

  async function createToken (symbol: string): Promise<void> {
    const address = await container.call('getnewaddress')
    const metadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await container.call('createtoken', [metadata])
    await container.generate(1)
  }

  async function createPoolPair (tokenB: string, metadata?: any): Promise<void> {
    const address = await container.call('getnewaddress')
    const defaultMetadata = {
      tokenA: 'DFI',
      tokenB,
      commission: 0,
      status: true,
      ownerAddress: address
    }
    await client.poolpair.createPoolPair({ ...defaultMetadata, ...metadata })
    await container.generate(1)
  }

  it('should listPoolPairs', async () => {
    let assertions = 0
    const poolpairs = await client.poolpair.listPoolPairs()

    for (const k in poolpairs) {
      const poolpair = poolpairs[k]

      if (poolpair.symbol === 'DFI-DETH') {
        expect(poolpair.name).toStrictEqual('Default Defi token-DETH')
        expect(poolpair.status).toStrictEqual(true)
        expect(poolpair.commission.toString()).toStrictEqual(new BigNumber(0.001).toString())
        assertions += 1
      }

      if (poolpair.symbol === 'DFI-DXRP') {
        expect(poolpair.name).toStrictEqual('Default Defi token-DXRP')
        expect(poolpair.status).toStrictEqual(true)
        expect(poolpair.commission.toString()).toStrictEqual(new BigNumber(0.003).toString())
        assertions += 1
      }

      if (poolpair.symbol === 'DFI-DUSDT') {
        expect(poolpair.name).toStrictEqual('Default Defi token-DUSDT')
        expect(poolpair.status).toStrictEqual(false)
        expect(poolpair.commission.toString()).toStrictEqual(new BigNumber(0).toString())
        assertions += 1
      }

      expect(poolpair.totalLiquidity instanceof BigNumber).toStrictEqual(true)
      expect(typeof poolpair.ownerAddress).toStrictEqual('string')
      expect(typeof poolpair.idTokenA).toStrictEqual('string')
      expect(typeof poolpair.idTokenB).toStrictEqual('string')
      expect(poolpair.reserveA instanceof BigNumber).toStrictEqual(true)
      expect(poolpair.reserveB instanceof BigNumber).toStrictEqual(true)

      if (poolpair['reserveA/reserveB'] instanceof BigNumber && poolpair['reserveB/reserveA'] instanceof BigNumber) {
        expect(poolpair.tradeEnabled).toStrictEqual(true)
      } else {
        expect(poolpair['reserveA/reserveB']).toStrictEqual('0')
        expect(poolpair['reserveB/reserveA']).toStrictEqual('0')
        expect(poolpair.tradeEnabled).toStrictEqual(false)
      }

      expect(poolpair.blockCommissionA instanceof BigNumber).toStrictEqual(true)
      expect(poolpair.blockCommissionB instanceof BigNumber).toStrictEqual(true)
      expect(poolpair.rewardPct instanceof BigNumber).toStrictEqual(true)
      expect(typeof poolpair.creationTx).toStrictEqual('string')
      expect(poolpair.creationHeight instanceof BigNumber).toStrictEqual(true)
    }

    expect(assertions).toStrictEqual(3)
  })

  it('should listPoolPairs with pagination and return an empty object as out of range', async () => {
    const pagination = {
      start: 300,
      including_start: true,
      limit: 100
    }
    const poolpairs = await client.poolpair.listPoolPairs(pagination)

    expect(Object.keys(poolpairs).length).toStrictEqual(0)
  })

  it('should listPoolPairs with pagination limit', async () => {
    const pagination = {
      start: 0,
      including_start: true,
      limit: 2
    }
    const poolpairs = await client.poolpair.listPoolPairs(pagination)

    expect(Object.keys(poolpairs).length).toStrictEqual(2)
  })

  it('should listPoolPairs with verbose false', async () => {
    const pagination = {
      start: 0,
      including_start: true,
      limit: 100
    }
    const poolpairs = await client.poolpair.listPoolPairs(pagination, false)

    for (const k in poolpairs) {
      const poolpair = poolpairs[k]

      expect(typeof poolpair.symbol).toStrictEqual('string')
      expect(typeof poolpair.name).toStrictEqual('string')
      expect(typeof poolpair.status).toStrictEqual('boolean')
      expect(typeof poolpair.idTokenA).toStrictEqual('string')
      expect(typeof poolpair.idTokenB).toStrictEqual('string')
    }
  })
})
