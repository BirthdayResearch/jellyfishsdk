import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('non masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  describe('listTokens', () => {
    it('should listTokens', async () => {
      await waitForExpect(async () => {
        const tokens = await client.token.listTokens()
        expect(Object.keys(tokens).length).toBeGreaterThan(0)
      })

      const token = await client.token.listTokens()
      const data = token['0']

      expect(data.symbol).toBe('DFI')
      expect(data.symbolKey).toBe('DFI')
      expect(data.name).toBe('Default Defi token')
      expect(data.decimal).toBe(8)
      expect(data.limit).toBe(0)
      expect(data.mintable).toBe(false)
      expect(data.tradeable).toBe(true)
      expect(data.isDAT).toBe(true)
      expect(data.isLPS).toBe(false)
      expect(data.finalized).toBe(true)
      expect(data.minted).toBe(0)
      expect(data.creationTx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
      expect(data.creationHeight).toBe(0)
      expect(data.destructionTx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
      expect(data.destructionHeight).toBe(-1)
      expect(data.collateralAddress).toBe('')
    })

    it('should listTokens with pagination and return an empty object as out of range', async () => {
      await waitForExpect(async () => {
        const pagination = {
          start: 300,
          including_start: true,
          limit: 100
        }
        const token = await client.token.listTokens(pagination)

        expect(Object.keys(token).length).toBe(0)
      })
    })

    it('should listTokens with verbose false', async () => {
      const pagination = {
        start: 0,
        including_start: true,
        limit: 100
      }

      await waitForExpect(async () => {
        const tokens = await client.token.listTokens(pagination, false)
        expect(Object.keys(tokens).length).toBeGreaterThan(0)
      })

      const tokens = await client.token.listTokens(pagination, false)
      const data = tokens['0']
      expect(data.symbol).toBe('DFI')
      expect(data.symbolKey).toBe('DFI')
      expect(data.name).toBe('Default Defi token')
    })
  })

  describe('getToken', () => {
    it('should getToken', async () => {
      await waitForExpect(async () => {
        const token = await client.token.getToken('DFI')
        expect(Object.keys(token).length).toBeGreaterThan(0)
      })

      const token = await client.token.getToken('DFI')
      const data = token['0']

      expect(data.symbol).toBe('DFI')
      expect(data.symbolKey).toBe('DFI')
      expect(data.name).toBe('Default Defi token')
      expect(data.decimal).toBe(8)
      expect(data.limit).toBe(0)
      expect(data.mintable).toBe(false)
      expect(data.tradeable).toBe(true)
      expect(data.isDAT).toBe(true)
      expect(data.isLPS).toBe(false)
      expect(data.finalized).toBe(true)
      expect(data.minted).toBe(0)
      expect(data.creationTx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
      expect(data.creationHeight).toBe(0)
      expect(data.destructionTx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
      expect(data.destructionHeight).toBe(-1)
      expect(data.collateralAddress).toBe('')
    })
  })
})

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  async function createToken (symbol: string, metadata?: any): Promise<string> {
    const address = await container.call('getnewaddress')
    const defaultMetadata = {
      symbol,
      name: symbol,
      isDAT: false,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    return await client.token.createToken({ ...defaultMetadata, ...metadata })
  }
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  describe('createToken', () => {
    it('should createToken', async () => {
      const tokensBefore = await client.token.listTokens()
      let numberOfTokens = Object.keys(tokensBefore).length
      expect(numberOfTokens).toBe(1)

      const address = await container.call('getnewaddress')
      const metadata = {
        symbol: 'DDD',
        name: 'DDD',
        isDAT: false,
        mintable: true,
        tradeable: true,
        collateralAddress: address
      }

      const data = await client.token.createToken(metadata)
      expect(typeof data).toBe('string')

      await container.generate(1)
      numberOfTokens += 1

      const tokensAfter = await client.token.listTokens()
      expect(Object.keys(tokensAfter).length).toBe(numberOfTokens)
      for (const k in tokensAfter) {
        if (tokensAfter[k].symbol === metadata.symbol) {
          const newToken = tokensAfter[k]
          expect(newToken.symbolKey).toBe(`${metadata.symbol}#${k}`)
          expect(newToken.name).toBe(metadata.name)
          expect(newToken.mintable).toBe(metadata.mintable)
          expect(newToken.tradeable).toBe(metadata.tradeable)
          expect(newToken.collateralAddress).toBe(metadata.collateralAddress)
          expect(newToken.isDAT).toBe(metadata.isDAT)
          expect(newToken.decimal).toBe(8)
          expect(newToken.limit).toBe(0)
          expect(newToken.isLPS).toBe(false)
          expect(newToken.finalized).toBe(false)
          expect(newToken.minted).toBe(0)
          expect(typeof newToken.creationTx).toBe('string')
          expect(typeof newToken.destructionTx).toBe('string')
          expect(typeof newToken.creationHeight).toBe('number')
          expect(typeof newToken.destructionHeight).toBe('number')
        }
      }
    })

    it('should createToken with utxo', async () => {
      const tokensBefore = await client.token.listTokens()
      let numberOfTokens = Object.keys(tokensBefore).length

      const utxos = await container.call('listunspent')
      const address = await container.call('getnewaddress')

      const metadata = {
        symbol: 'DDT',
        name: 'DDT',
        isDAT: false,
        mintable: true,
        tradeable: true,
        collateralAddress: address
      }

      const data = await client.token.createToken(metadata, [{
        txid: utxos[0].txid,
        vout: utxos[0].vout
      }])
      expect(typeof data).toBe('string')

      await container.generate(1)
      numberOfTokens += 1

      await waitForExpect(async () => {
        const tokensAfter = await client.token.listTokens()
        expect(Object.keys(tokensAfter).length).toBe(numberOfTokens)
      })

      const tokensAfter = await client.token.listTokens()
      for (const k in tokensAfter) {
        if (tokensAfter[k].symbol === metadata.symbol) {
          const newToken = tokensAfter[k]
          expect(newToken.symbolKey).toBe(`${metadata.symbol}#${k}`)
          expect(newToken.name).toBe(metadata.name)
          expect(newToken.mintable).toBe(metadata.mintable)
          expect(newToken.tradeable).toBe(metadata.tradeable)
          expect(newToken.collateralAddress).toBe(metadata.collateralAddress)
          expect(newToken.isDAT).toBe(metadata.isDAT)
          expect(newToken.decimal).toBe(8)
          expect(newToken.limit).toBe(0)
          expect(newToken.isLPS).toBe(false)
          expect(newToken.finalized).toBe(false)
          expect(newToken.minted).toBe(0)
          expect(typeof newToken.creationTx).toBe('string')
          expect(typeof newToken.destructionTx).toBe('string')
          expect(typeof newToken.creationHeight).toBe('number')
          expect(typeof newToken.destructionHeight).toBe('number')
        }
      }
    })

    it('should be failed while creating token with existing symbol', async () => {
      const address = await container.call('getnewaddress')
      const metadata = {
        symbol: 'DOA',
        name: 'DOA',
        isDAT: true,
        mintable: true,
        tradeable: true,
        collateralAddress: address
      }
      const data = await client.token.createToken(metadata)
      expect(typeof data).toBe('string')

      await container.generate(1)

      const promise = client.token.createToken(metadata)
      await expect(promise).rejects.toThrow()
    })
  })

  describe('updateToken', () => {
    let tokenDTESTId = ''
    let tokenDABCId = ''

    beforeAll(async () => {
      await createToken('DTEST')
      await createToken('DABC')
      await container.generate(2)

      const tokens = await client.token.listTokens()
      for (const k in tokens) {
        const token = tokens[k]
        if (token.symbol === 'DTEST') {
          tokenDTESTId = k
        }
        if (token.symbol === 'DABC') {
          tokenDABCId = k
        }
      }
    })

    it('should updateToken', async () => {
      const { [tokenDTESTId]: tokenBefore } = await client.token.getToken(`DTEST#${tokenDTESTId}`)
      expect(tokenBefore.symbol).toBe('DTEST')
      expect(tokenBefore.name).toBe('DTEST')
      expect(tokenBefore.isDAT).toBe(false)
      expect(tokenBefore.mintable).toBe(true)
      expect(tokenBefore.tradeable).toBe(true)
      expect(tokenBefore.finalized).toBe(false)
      expect(tokenBefore.symbolKey).toBe(`DTEST#${tokenDTESTId}`)

      const data = await client.token.updateToken(`DTEST#${tokenDTESTId}`, {
        symbol: 'DDEST',
        name: 'DDEST',
        isDAT: true,
        mintable: false,
        tradeable: false,
        finalize: false
      })
      expect(typeof data).toBe('string')
      await container.generate(1)

      const { [tokenDTESTId]: tokenAfter } = await client.token.getToken('DDEST')
      expect(tokenAfter.symbol).toBe('DDEST')
      expect(tokenAfter.name).toBe('DDEST')
      expect(tokenAfter.isDAT).toBe(true)
      expect(tokenAfter.mintable).toBe(false)
      expect(tokenAfter.tradeable).toBe(false)
      expect(tokenAfter.finalized).toBe(false)
      // NOTE(canonbrother): isDAT will not show the ID
      expect(tokenAfter.symbolKey).toBe('DDEST')
    })

    it('should updateToken by token id', async () => {
      const { [tokenDABCId]: tokenBefore } = await client.token.getToken(`DABC#${tokenDABCId}`)
      expect(tokenBefore.mintable).toBe(true)

      await client.token.updateToken(tokenDABCId, { mintable: false })
      await container.generate(1)

      const { [tokenDABCId]: tokenAfter } = await client.token.getToken(`DABC#${tokenDABCId}`)
      expect(tokenAfter.mintable).toBe(false)
    })

    it('should updateToken by creationTx', async () => {
      const { [tokenDABCId]: tokenBefore } = await client.token.getToken(`DABC#${tokenDABCId}`)
      expect(tokenBefore.tradeable).toBe(true)

      const { creationTx } = tokenBefore
      await client.token.updateToken(creationTx, { tradeable: false })
      await container.generate(1)

      const { [tokenDABCId]: tokenAfter } = await client.token.getToken(`DABC#${tokenDABCId}`)
      expect(tokenAfter.tradeable).toBe(false)
    })
  })

  describe('listTokens', () => {
    beforeAll(async () => {
      await createToken('DBTC', { isDAT: true })
      await createToken('DNOTMINT', { mintable: false })
      await createToken('DNOTTRAD', { tradeable: false })
      await container.generate(3)
    })

    it('should listTokens', async () => {
      await waitForExpect(async () => {
        const tokens = await client.token.listTokens()
        expect(Object.keys(tokens).length).toBeGreaterThan(3)
      })

      const tokens = await client.token.listTokens()
      for (const k in tokens) {
        const token = tokens[k]
        expect(token.decimal).toBe(8)
        expect(token.limit).toBe(0)
        expect(token.minted).toBe(0)
        expect(token.isLPS).toBe(false)
        expect(typeof token.creationTx).toBe('string')
        expect(typeof token.creationHeight).toBe('number')
        expect(typeof token.destructionTx).toBe('string')
        expect(typeof token.destructionHeight).toBe('number')
        expect(typeof token.collateralAddress).toBe('string')

        switch (token.symbol) {
          case 'DFI':
            expect(token.symbol).toBe('DFI')
            expect(token.symbolKey).toBe('DFI')
            expect(token.name).toBe('Default Defi token')
            expect(token.mintable).toBe(false)
            expect(token.tradeable).toBe(true)
            expect(token.isDAT).toBe(true)
            expect(token.finalized).toBe(true)
            expect(token.collateralAddress).toBe('')
            break
          case 'DBTC':
            expect(token.symbol).toBe('DBTC')
            expect(token.symbolKey).toBe('DBTC')
            expect(token.name).toBe('DBTC')
            expect(token.mintable).toBe(true)
            expect(token.tradeable).toBe(true)
            expect(token.isDAT).toBe(true)
            expect(token.finalized).toBe(false)
            break
          case 'DNOTMINT':
            expect(token.symbol).toBe('DNOTMINT')
            expect(token.symbolKey).toBe(`DNOTMINT#${k}`)
            expect(token.name).toBe('DNOTMINT')
            expect(token.mintable).toBe(false)
            expect(token.tradeable).toBe(true)
            expect(token.isDAT).toBe(false)
            expect(token.finalized).toBe(false)
            break
          case 'DNOTTRAD':
            expect(token.symbol).toBe('DNOTTRAD')
            expect(token.symbolKey).toBe(`DNOTTRAD#${k}`)
            expect(token.name).toBe('DNOTTRAD')
            expect(token.mintable).toBe(true)
            expect(token.tradeable).toBe(false)
            expect(token.isDAT).toBe(false)
            expect(token.finalized).toBe(false)
            break
        }
      }
    })

    it('should listTokens with pagination and return an empty object as out of range', async () => {
      const pagination = {
        start: 300,
        including_start: true,
        limit: 100
      }
      const tokens = await client.token.listTokens(pagination)

      expect(Object.keys(tokens).length).toBe(0)
    })

    it('should listTokens with pagination limit', async () => {
      const pagination = {
        start: 0,
        including_start: true,
        limit: 2
      }
      const tokens = await client.token.listTokens(pagination)

      expect(Object.keys(tokens).length).toBe(2)
    })

    it('should listTokens with verbose false', async () => {
      const pagination = {
        start: 0,
        including_start: true,
        limit: 100
      }

      await waitForExpect(async () => {
        const token = await client.token.listTokens(pagination, false)
        expect(Object.keys(token).length).toBeGreaterThan(0)
      })

      const token = await client.token.listTokens(pagination, false)
      const data = token['0']

      expect(data.symbol).toBe('DFI')
      expect(data.symbolKey).toBe('DFI')
      expect(data.name).toBe('Default Defi token')
    })
  })

  describe('getToken', () => {
    it('should getToken', async () => {
      await waitForExpect(async () => {
        const token = await client.token.getToken('DFI')
        expect(Object.keys(token).length).toBeGreaterThan(0)
      })

      const token = await client.token.getToken('DFI')
      const data = token['0']

      expect(data.symbol).toBe('DFI')
      expect(data.symbolKey).toBe('DFI')
      expect(data.name).toBe('Default Defi token')
      expect(data.decimal).toBe(8)
      expect(data.limit).toBe(0)
      expect(data.mintable).toBe(false)
      expect(data.tradeable).toBe(true)
      expect(data.isDAT).toBe(true)
      expect(data.isLPS).toBe(false)
      expect(data.finalized).toBe(true)
      expect(data.minted).toBe(0)
      expect(data.creationTx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
      expect(data.creationHeight).toBe(0)
      expect(data.destructionTx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
      expect(data.destructionHeight).toBe(-1)
      expect(data.collateralAddress).toBe('')
    })
  })

  describe('getCustomTx', () => {
    it('should getCustomTx with ', async () => {
      let txid: any

      beforeAll(async () => {
        txid = await createToken('DSWAP')
        await container.generate(3)
      })

      const data = await client.token.getCustomTx(txid)

      expect(data.type).toBe('CreateToken')
      expect(data.valid).toBe(true)

      expect(typeof data.results.creationTx).toBe('string')
      expect(data.results.name).toBe('DSWAP')
      expect(data.results.symbol).toBe('DSWAP')
      expect(data.results.isDAT).toBe(false)
      expect(data.results.mintable).toBe(true)
      expect(data.results.tradeable).toBe(true)
      expect(data.results.finalized).toBe(false)

      expect(typeof data.blockhash).toBe('string')
      expect(data.blockHeight).toBeGreaterThan(0)
      expect(data.blockTime).toBeGreaterThan(0)
      expect(data.confirmations).toBe(3)
    })
  })
})
