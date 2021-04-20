import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

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
  }

  async function createPoolPair (tokenB: string, metadata?: any): Promise<string> {
    const address = await container.call('getnewaddress')
    const defaultMetadata = {
      tokenA: 'DFI',
      tokenB,
      commission: 0,
      status: true,
      ownerAddress: address
    }
    await client.poolpair.createPoolPair({ ...defaultMetadata, ...metadata })

    return address
  }

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  describe('createPoolPair', () => {
    beforeAll(async () => {
      await createToken('DBTC')
      await container.waitForWalletCoinbaseMaturity()
    })

    it('should createPoolPair', async () => {
      const poolpairsBefore = await client.poolpair.listPoolPairs()
      expect(Object.keys(poolpairsBefore).length).toBe(0)

      const address = await container.call('getnewaddress')
      const metadata = {
        tokenA: 'DFI',
        tokenB: 'DBTC',
        commission: 0,
        status: true,
        ownerAddress: address
      }
      const data = await client.poolpair.createPoolPair(metadata)
      expect(typeof data).toBe('string')

      await container.waitForWalletCoinbaseMaturity()

      const poolpairsAfter = await client.poolpair.listPoolPairs()
      expect(Object.keys(poolpairsAfter).length).toBe(1)
      for (const k in poolpairsAfter) {
        const poolpair = poolpairsAfter[k]
        expect(poolpair.name).toBe('Default Defi token-DBTC')
        expect(poolpair.symbol).toBe(`${metadata.tokenA}-${metadata.tokenB}`)
        expect(poolpair.status).toBe(metadata.status)
        expect(poolpair.commission).toBe(metadata.commission)
        expect(poolpair.ownerAddress).toBe(metadata.ownerAddress)
        expect(poolpair.totalLiquidity).toBe(0)
        expect(typeof poolpair.idTokenA).toBe('string')
        expect(typeof poolpair.idTokenB).toBe('string')
        expect(typeof poolpair.reserveA).toBe('number')
        expect(typeof poolpair.reserveB).toBe('number')
        expect(typeof poolpair['reserveA/reserveB']).toBe('string')
        expect(typeof poolpair['reserveB/reserveA']).toBe('string')
        expect(poolpair.tradeEnabled).toBe(false)
        expect(typeof poolpair.blockCommissionA).toBe('number')
        expect(typeof poolpair.blockCommissionB).toBe('number')
        expect(typeof poolpair.rewardPct).toBe('number')
        expect(typeof poolpair.creationTx).toBe('string')
        expect(typeof poolpair.creationHeight).toBe('number')
      }
    })
  })

  describe('listPoolPairs', () => {
    beforeAll(async () => {
      await createToken('DETH')
      await createToken('DXRP')
      await createToken('DUSDT')
      await container.waitForWalletCoinbaseMaturity()

      await createPoolPair('DETH', { commission: 0.001 })
      await createPoolPair('DXRP', { commission: 0.003 })
      await createPoolPair('DUSDT', { status: false })
      await container.waitForWalletCoinbaseMaturity()
    })

    it('should listPoolPairs', async () => {
      let points = 0
      const poolpairs = await client.poolpair.listPoolPairs()

      for (const k in poolpairs) {
        const poolpair = poolpairs[k]

        if (poolpair.symbol === 'DFI-DETH') {
          expect(poolpair.name).toBe('Default Defi token-DETH')
          expect(poolpair.status).toBe(true)
          expect(poolpair.commission).toBe(0.001)
          points += 1
        }

        if (poolpair.symbol === 'DFI-DXRP') {
          expect(poolpair.name).toBe('Default Defi token-DXRP')
          expect(poolpair.status).toBe(true)
          expect(poolpair.commission).toBe(0.003)
          points += 1
        }

        if (poolpair.symbol === 'DFI-DUSD') {
          expect(poolpair.name).toBe('Default Defi token-DUSDT')
          expect(poolpair.status).toBe(false)
          expect(poolpair.commission).toBe(0)
          points += 1
        }

        expect(poolpair.totalLiquidity).toBe(0)
        expect(typeof poolpair.ownerAddress).toBe('string')
        expect(typeof poolpair.idTokenA).toBe('string')
        expect(typeof poolpair.idTokenB).toBe('string')
        expect(typeof poolpair.reserveA).toBe('number')
        expect(typeof poolpair.reserveB).toBe('number')
        expect(typeof poolpair['reserveA/reserveB']).toBe('string')
        expect(typeof poolpair['reserveB/reserveA']).toBe('string')
        expect(poolpair.tradeEnabled).toBe(false)
        expect(typeof poolpair.blockCommissionA).toBe('number')
        expect(typeof poolpair.blockCommissionB).toBe('number')
        expect(typeof poolpair.rewardPct).toBe('number')
        expect(typeof poolpair.creationTx).toBe('string')
        expect(typeof poolpair.creationHeight).toBe('number')
      }

      expect(points).toBe(3)
    })

    it('should listPoolPairs with pagination and return an empty object as out of range', async () => {
      const pagination = {
        start: 300,
        including_start: true,
        limit: 100
      }
      const poolpairs = await client.poolpair.listPoolPairs(pagination)

      expect(Object.keys(poolpairs).length).toBe(0)
    })

    it('should listPoolPairs with pagination limit', async () => {
      const pagination = {
        start: 0,
        including_start: true,
        limit: 2
      }
      const poolpairs = await client.poolpair.listPoolPairs(pagination)

      expect(Object.keys(poolpairs).length).toBe(2)
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

        expect(typeof poolpair.symbol).toBe('string')
        expect(typeof poolpair.name).toBe('string')
        expect(typeof poolpair.status).toBe('boolean')
        expect(typeof poolpair.idTokenA).toBe('string')
        expect(typeof poolpair.idTokenB).toBe('string')
      }
    })
  })

  describe('getPoolPair', () => {
    beforeAll(async () => {
      await createToken('DBCH')
      await container.waitForWalletCoinbaseMaturity()

      await createPoolPair('DBCH')
      await container.waitForWalletCoinbaseMaturity()
    })

    it('should getPoolPair', async () => {
      const poolpair = await client.poolpair.getPoolPair('DFI-DBCH')

      for (const k in poolpair) {
        const data = poolpair[k]
        expect(data.symbol).toBe('DFI-DBCH')
        expect(data.name).toBe('Default Defi token-DBCH')
        expect(data.status).toBe(true)
        expect(typeof data.idTokenA).toBe('string')
        expect(typeof data.idTokenB).toBe('string')
        expect(typeof data.reserveA).toBe('number')
        expect(typeof data.reserveB).toBe('number')
        expect(typeof data['reserveA/reserveB']).toBe('string')
        expect(typeof data['reserveB/reserveA']).toBe('string')
        expect(data.tradeEnabled).toBe(false)
        expect(typeof data.blockCommissionA).toBe('number')
        expect(typeof data.blockCommissionB).toBe('number')
        expect(typeof data.rewardPct).toBe('number')
        expect(typeof data.creationTx).toBe('string')
        expect(typeof data.creationHeight).toBe('number')
      }
    })

    it('should getPoolPair with verbose false', async () => {
      const poolpair = await client.poolpair.getPoolPair('DFI-DBCH', false)

      for (const k in poolpair) {
        const data = poolpair[k]
        expect(data.symbol).toBe('DFI-DBCH')
        expect(data.name).toBe('Default Defi token-DBCH')
        expect(data.status).toBe(true)
        expect(typeof data.idTokenA).toBe('string')
        expect(typeof data.idTokenB).toBe('string')
      }
    })
  })

  describe.only('addPoolLiquidity', () => {
    let DDAI_ADDRESS = ''

    beforeAll(async () => {
      await createToken('DDAI')
      await container.waitForWalletCoinbaseMaturity()

      DDAI_ADDRESS = await createPoolPair('DDAI')
      await container.waitForWalletCoinbaseMaturity()
    })

    it('should addPoolLiquidity', async () => {
      const aliceAddress = await container.call('getnewaddress')
      const bobAddress = await container.call('getnewaddress')
      console.log('addr: ', aliceAddress, bobAddress, DDAI_ADDRESS)

      const data = await client.poolpair.addPoolLiquidity({
        [aliceAddress]: '300000000@DFI',
        [bobAddress]: '30000000000000000@DDAI'
      }, DDAI_ADDRESS)

      // const data = await client.poolpair.addPoolLiquidity({'*': [
      //   '300000000@DFI', '30000000000000000@DDAI',
      // ]}, DDAI_ADDRESS)

      console.log('data: ', data)
    })
  })

  describe('listPoolShares', () => {
    it('should listPoolShares', async () => {
      const poolShares = await client.poolpair.listPoolShares()
      console.log('poolShares: ', poolShares)
    })
  })
})
