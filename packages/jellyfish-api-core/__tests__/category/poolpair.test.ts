import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { ContainerAdapterClient } from '../container_adapter_client'

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

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

  async function mintTokens (symbol: string): Promise<void> {
    const address = await container.call('getnewaddress')

    // NOTE(canonbrother): using `minttokens` on DFI is an error as DFI is not mintable
    // await container.call('minttokens', ['1000@DFI'])
    const payload: { [key: string]: string } = {}
    payload[address] = '2000@0'
    await container.call('utxostoaccount', [payload])
    await container.call('minttokens', [`2000@${symbol}`])

    await container.generate(25)
  }

  describe('createPoolPair', () => {
    beforeAll(async () => {
      await createToken('DBTC')
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

      await container.generate(1)

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

      await createPoolPair('DETH', { commission: 0.001 })
      await createPoolPair('DXRP', { commission: 0.003 })
      await createPoolPair('DUSDT', { status: false })
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
      await createPoolPair('DBCH')
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

    // it.skip('should be failed as getting non-existent pair', async () => {
    //   const promise = client.poolpair.getPoolPair('DFI-NONEXIST')
    //   expect(promise).rejects.toThrow('RpcApiError: \'Pool not found\', code: -5')
    // })
  })

  describe('addPoolLiquidity', () => {
    beforeAll(async () => {
      await container.generate(100)

      await createToken('DDAI')

      await mintTokens('DDAI')

      await createPoolPair('DDAI')
    })

    it('should addPoolLiquidity', async () => {
      const shareAddress = await container.call('getnewaddress')
      const data = await client.poolpair.addPoolLiquidity({
        '*': ['100@DFI', '200@DDAI']
      }, shareAddress)

      expect(typeof data).toBe('string')
    })

    it.skip('should addPoolLiquidity with specific input token address', async () => {
      const tokenAAddress = await container.call('getnewaddress')
      const tokenBAddress = await container.call('getnewaddress')
      await container.call('sendtokenstoaddress', [{}, { [tokenAAddress]: ['100@DFI'] }])
      await container.call('sendtokenstoaddress', [{}, { [tokenBAddress]: ['200@DDAI'] }])
      await container.generate(25)

      const shareAddress = await container.call('getnewaddress')
      const data = await client.poolpair.addPoolLiquidity({
        [tokenAAddress]: '50@DFI',
        [tokenBAddress]: '100@DDAI'
      }, shareAddress)

      expect(typeof data).toBe('string')
    })

    it.skip('should addPoolLiquidity with utxos', async () => {
      const utxos = await container.call('listunspent')

      const shareAddress = await container.call('getnewaddress')
      const data = await client.poolpair.addPoolLiquidity({
        '*': ['100@DFI', '200@DDAI']
      }, shareAddress, { utxos: [{ txid: utxos[0].txid, vout: 0 }] })

      expect(typeof data).toBe('string')
    })
  })

  describe('listPoolShares', () => {
    async function addPoolLiquidity (): Promise<void> {
      const shareAddress = await container.call('getnewaddress')
      const data = await client.poolpair.addPoolLiquidity({
        '*': ['100@DFI', '200@DSWAP']
      }, shareAddress)

      expect(typeof data).toBe('string')

      await container.generate(1)
    }

    beforeAll(async () => {
      await container.generate(100)

      await createToken('DSWAP')

      await mintTokens('DSWAP')

      await createPoolPair('DSWAP')

      await addPoolLiquidity()
      await addPoolLiquidity()
      await addPoolLiquidity()
    })

    it('should listPoolShares', async () => {
      const poolShares = await client.poolpair.listPoolShares()

      for (const k in poolShares) {
        const data = poolShares[k]
        expect(typeof data.poolID).toBe('string')
        expect(typeof data.owner).toBe('string')
        expect(data['%'] instanceof BigNumber).toBe(true)
        expect(data.amount instanceof BigNumber).toBe(true)
        expect(data.totalLiquidity instanceof BigNumber).toBe(true)
      }
    })

    it('should listPoolShares with pagination and return an empty object as out of range', async () => {
      const pagination = {
        start: 300,
        including_start: true,
        limit: 100
      }
      const poolShares = await client.poolpair.listPoolShares(pagination)

      expect(Object.keys(poolShares).length).toBe(0)
    })

    it('should listPoolShares with pagination limit', async () => {
      const pagination = {
        start: 0,
        including_start: true,
        limit: 2
      }
      const poolShares = await client.poolpair.listPoolShares(pagination)

      expect(Object.keys(poolShares).length).toBe(2)
    })

    it('should listPoolPairs with verbose false', async () => {
      const pagination = {
        start: 0,
        including_start: true,
        limit: 100
      }
      const poolShares = await client.poolpair.listPoolShares(pagination, false)

      for (const k in poolShares) {
        const data = poolShares[k]
        expect(typeof data.poolID).toBe('string')
        expect(typeof data.owner).toBe('string')
        expect(data['%'] instanceof BigNumber).toBe(true)
      }
    })

    it('should listPoolPairs with isMineOnly true', async () => {
      const pagination = {
        start: 0,
        including_start: true,
        limit: 100
      }
      const poolShares = await client.poolpair.listPoolShares(pagination, true, { isMineOnly: true })

      for (const k in poolShares) {
        const data = poolShares[k]
        expect(typeof data.poolID).toBe('string')
        expect(typeof data.owner).toBe('string')
        expect(data['%'] instanceof BigNumber).toBe(true)
        expect(data.amount instanceof BigNumber).toBe(true)
        expect(data.totalLiquidity instanceof BigNumber).toBe(true)
      }
    })
  })
})
