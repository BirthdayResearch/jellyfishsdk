import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(200)
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
    // await container.call('minttokens', ['100@DFI'])
    const payload: { [key: string]: string } = {}
    payload[address] = '100@0'
    await container.call('utxostoaccount', [payload])
    await container.call('minttokens', [`2000@${symbol}`])

    await container.generate(1)
  }

  describe('addPoolLiquidity', () => {
    beforeAll(async () => {
      await createToken('DDAI')

      await mintTokens('DDAI')

      await createPoolPair('DDAI')
    })

    it('should addPoolLiquidity', async () => {
      const shareAddress = await container.call('getnewaddress')
      const data = await client.poolpair.addPoolLiquidity({
        '*': ['10@DFI', '200@DDAI']
      }, shareAddress)

      expect(typeof data).toStrictEqual('string')
    })

    it('should addPoolLiquidity with specific input token address', async () => {
      const tokenAAddress = await container.call('getnewaddress')
      const tokenBAddress = await container.call('getnewaddress')
      await container.call('sendtokenstoaddress', [{}, { [tokenAAddress]: ['10@DFI'] }])
      await container.call('sendtokenstoaddress', [{}, { [tokenBAddress]: ['200@DDAI'] }])
      await container.generate(1)

      const shareAddress = await container.call('getnewaddress')
      const data = await client.poolpair.addPoolLiquidity({
        [tokenAAddress]: '5@DFI',
        [tokenBAddress]: '100@DDAI'
      }, shareAddress)

      expect(typeof data).toStrictEqual('string')
    })

    it('should addPoolLiquidity with utxos', async () => {
      const shareAddress = await container.call('getnewaddress')
      const tokenAAddress = await container.call('getnewaddress')
      const tokenBAddress = await container.call('getnewaddress')
      await container.call('sendtokenstoaddress', [{}, { [tokenAAddress]: ['10@DFI'] }])
      await container.call('sendtokenstoaddress', [{}, { [tokenBAddress]: ['200@DDAI'] }])
      await container.generate(1)

      const txid = await container.call('sendmany', ['', {
        [tokenAAddress]: 10,
        [tokenBAddress]: 20
      }])
      await container.generate(1)

      const utxos = await container.call('listunspent')
      const inputs = utxos.filter((utxo: any) => utxo.txid === txid).map((utxo: any) => {
        return {
          txid: utxo.txid,
          vout: utxo.vout
        }
      })

      const data = await client.poolpair.addPoolLiquidity({
        [tokenAAddress]: '5@DFI',
        [tokenBAddress]: '100@DDAI'
      }, shareAddress, { utxos: inputs })

      // NOTE(canonbrother): cannot use '*' (auto-selection) with providing utxos as mapping specific utxos in needed
      // const shareAddress = await container.call('getnewaddress')
      // const data = await client.poolpair.addPoolLiquidity({
      //   '*': ['10@DFI', '200@DDAI']
      // }, shareAddress, { utxos: [{ txid: utxo.txid, vout: 0 }] })

      expect(typeof data).toStrictEqual('string')
    })

    it('should fail while addPoolLiquidity with utxos which does not include account owner', async () => {
      const shareAddress = await container.call('getnewaddress')
      const tokenAAddress = await container.call('getnewaddress')
      const tokenBAddress = await container.call('getnewaddress')

      const utxos = await container.call('listunspent')
      const inputs = utxos.map((utxo: any) => {
        return {
          txid: utxo.txid,
          vout: utxo.vout
        }
      })

      const promise = client.poolpair.addPoolLiquidity({
        [tokenAAddress]: '5@DFI',
        [tokenBAddress]: '100@DDAI'
      }, shareAddress, { utxos: inputs })
      await expect(promise).rejects.toThrow('tx must have at least one input from account owner')
    })
  })

  describe('listPoolShares', () => {
    async function addPoolLiquidity (): Promise<void> {
      const shareAddress = await container.call('getnewaddress')
      const data = await client.poolpair.addPoolLiquidity({
        '*': ['10@DFI', '200@DSWAP']
      }, shareAddress)

      expect(typeof data).toStrictEqual('string')

      await container.generate(1)
    }

    beforeAll(async () => {
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
        expect(typeof data.poolID).toStrictEqual('string')
        expect(typeof data.owner).toStrictEqual('string')
        expect(data['%'] instanceof BigNumber).toStrictEqual(true)
        expect(data.amount instanceof BigNumber).toStrictEqual(true)
        expect(data.totalLiquidity instanceof BigNumber).toStrictEqual(true)
      }
    })

    it('should listPoolShares with pagination and return an empty object as out of range', async () => {
      const pagination = {
        start: 300,
        including_start: true,
        limit: 100
      }
      const poolShares = await client.poolpair.listPoolShares(pagination)

      expect(Object.keys(poolShares).length).toStrictEqual(0)
    })

    it('should listPoolShares with pagination limit', async () => {
      const pagination = {
        start: 0,
        including_start: true,
        limit: 2
      }
      const poolShares = await client.poolpair.listPoolShares(pagination)

      expect(Object.keys(poolShares).length).toStrictEqual(2)
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
        expect(typeof data.poolID).toStrictEqual('string')
        expect(typeof data.owner).toStrictEqual('string')
        expect(data['%'] instanceof BigNumber).toStrictEqual(true)
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
        expect(typeof data.poolID).toStrictEqual('string')
        expect(typeof data.owner).toStrictEqual('string')
        expect(data['%'] instanceof BigNumber).toStrictEqual(true)
        expect(data.amount instanceof BigNumber).toStrictEqual(true)
        expect(data.totalLiquidity instanceof BigNumber).toStrictEqual(true)
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
        expect(data.symbol).toStrictEqual('DFI-DBCH')
        expect(data.name).toStrictEqual('Default Defi token-DBCH')
        expect(data.status).toStrictEqual(true)
        expect(typeof data.idTokenA).toStrictEqual('string')
        expect(typeof data.idTokenB).toStrictEqual('string')
        expect(data.reserveA instanceof BigNumber).toStrictEqual(true)
        expect(data.reserveB instanceof BigNumber).toStrictEqual(true)
        expect(typeof data['reserveA/reserveB']).toStrictEqual('string')
        expect(typeof data['reserveB/reserveA']).toStrictEqual('string')
        expect(data.tradeEnabled).toStrictEqual(false)
        expect(data.blockCommissionA instanceof BigNumber).toStrictEqual(true)
        expect(data.blockCommissionB instanceof BigNumber).toStrictEqual(true)
        expect(data.rewardPct instanceof BigNumber).toStrictEqual(true)
        expect(typeof data.creationTx).toStrictEqual('string')
        expect(data.creationHeight instanceof BigNumber).toStrictEqual(true)
      }
    })

    it('should getPoolPair with verbose false', async () => {
      const poolpair = await client.poolpair.getPoolPair('DFI-DBCH', false)

      for (const k in poolpair) {
        const data = poolpair[k]
        expect(data.symbol).toStrictEqual('DFI-DBCH')
        expect(data.name).toStrictEqual('Default Defi token-DBCH')
        expect(data.status).toStrictEqual(true)
        expect(typeof data.idTokenA).toStrictEqual('string')
        expect(typeof data.idTokenB).toStrictEqual('string')
      }
    })

    it('should be failed as getting non-existent pair', async () => {
      const promise = client.poolpair.getPoolPair('DFI-NONEXIST')

      await expect(promise).rejects.toThrow('Pool not found')
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

        if (poolpair.symbol === 'DFI-DUSD') {
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

  describe('createPoolPair', () => {
    beforeAll(async () => {
      await createToken('DBTC')
    })

    it('should createPoolPair', async () => {
      let assertions = 0
      const poolpairsBefore = await client.poolpair.listPoolPairs()
      const poolpairsLengthBefore = Object.keys(poolpairsBefore).length

      const address = await container.call('getnewaddress')
      const metadata = {
        tokenA: 'DFI',
        tokenB: 'DBTC',
        commission: 1,
        status: true,
        ownerAddress: address
      }
      const data = await client.poolpair.createPoolPair(metadata)
      expect(typeof data).toStrictEqual('string')

      await container.generate(1)

      const poolpairsAfter = await client.poolpair.listPoolPairs()
      expect(Object.keys(poolpairsAfter).length).toStrictEqual(poolpairsLengthBefore + 1)

      for (const k in poolpairsAfter) {
        const poolpair = poolpairsAfter[k]
        if (poolpair.name === 'Default Defi token-DBTC') {
          expect(poolpair.symbol).toStrictEqual(`${metadata.tokenA}-${metadata.tokenB}`)
          expect(poolpair.status).toStrictEqual(metadata.status)
          expect(poolpair.commission.toString()).toStrictEqual(new BigNumber(metadata.commission).toString())
          expect(poolpair.ownerAddress).toStrictEqual(metadata.ownerAddress)
          expect(poolpair.totalLiquidity instanceof BigNumber).toStrictEqual(true)
          expect(typeof poolpair.idTokenA).toStrictEqual('string')
          expect(typeof poolpair.idTokenB).toStrictEqual('string')
          expect(poolpair.reserveA instanceof BigNumber).toStrictEqual(true)
          expect(poolpair.reserveB instanceof BigNumber).toStrictEqual(true)
          expect(typeof poolpair['reserveA/reserveB']).toStrictEqual('string')
          expect(typeof poolpair['reserveB/reserveA']).toStrictEqual('string')
          expect(poolpair.tradeEnabled).toStrictEqual(false)
          expect(poolpair.blockCommissionA instanceof BigNumber).toStrictEqual(true)
          expect(poolpair.blockCommissionB instanceof BigNumber).toStrictEqual(true)
          expect(poolpair.rewardPct instanceof BigNumber).toStrictEqual(true)
          expect(typeof poolpair.creationTx).toStrictEqual('string')
          expect(poolpair.creationHeight instanceof BigNumber).toStrictEqual(true)
          assertions += 1
        }
      }
      expect(assertions).toStrictEqual(1)
    })
  })
})
