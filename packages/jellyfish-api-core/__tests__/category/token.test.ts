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

      expect(data.symbol).toStrictEqual('DFI')
      expect(data.symbolKey).toStrictEqual('DFI')
      expect(data.name).toStrictEqual('Default Defi token')
      expect(data.decimal).toStrictEqual(8)
      expect(data.limit).toStrictEqual(0)
      expect(data.mintable).toStrictEqual(false)
      expect(data.tradeable).toStrictEqual(true)
      expect(data.isDAT).toStrictEqual(true)
      expect(data.isLPS).toStrictEqual(false)
      expect(data.finalized).toStrictEqual(true)
      expect(data.minted).toStrictEqual(0)
      expect(data.creationTx).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
      expect(data.creationHeight).toStrictEqual(0)
      expect(data.destructionTx).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
      expect(data.destructionHeight).toStrictEqual(-1)
      expect(data.collateralAddress).toStrictEqual('')
    })

    it('should listTokens with pagination and return an empty object as out of range', async () => {
      await waitForExpect(async () => {
        const pagination = {
          start: 300,
          including_start: true,
          limit: 100
        }
        const token = await client.token.listTokens(pagination)

        expect(Object.keys(token).length).toStrictEqual(0)
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
      expect(data.symbol).toStrictEqual('DFI')
      expect(data.symbolKey).toStrictEqual('DFI')
      expect(data.name).toStrictEqual('Default Defi token')
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

      expect(data.symbol).toStrictEqual('DFI')
      expect(data.symbolKey).toStrictEqual('DFI')
      expect(data.name).toStrictEqual('Default Defi token')
      expect(data.decimal).toStrictEqual(8)
      expect(data.limit).toStrictEqual(0)
      expect(data.mintable).toStrictEqual(false)
      expect(data.tradeable).toStrictEqual(true)
      expect(data.isDAT).toStrictEqual(true)
      expect(data.isLPS).toStrictEqual(false)
      expect(data.finalized).toStrictEqual(true)
      expect(data.minted).toStrictEqual(0)
      expect(data.creationTx).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
      expect(data.creationHeight).toStrictEqual(0)
      expect(data.destructionTx).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
      expect(data.destructionHeight).toStrictEqual(-1)
      expect(data.collateralAddress).toStrictEqual('')
    })
  })
})

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  async function createToken (symbol: string, metadata?: any): Promise<void> {
    const address = await container.call('getnewaddress')
    const defaultMetadata = {
      symbol,
      name: symbol,
      isDAT: false,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await client.token.createToken({ ...defaultMetadata, ...metadata })
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
      expect(numberOfTokens).toStrictEqual(1)

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
      expect(typeof data).toStrictEqual('string')

      await container.generate(1)
      numberOfTokens += 1

      const tokensAfter = await client.token.listTokens()
      expect(Object.keys(tokensAfter).length).toStrictEqual(numberOfTokens)
      for (const k in tokensAfter) {
        if (tokensAfter[k].symbol === metadata.symbol) {
          const newToken = tokensAfter[k]
          expect(newToken.symbolKey).toStrictEqual(`${metadata.symbol}#${k}`)
          expect(newToken.name).toStrictEqual(metadata.name)
          expect(newToken.mintable).toStrictEqual(metadata.mintable)
          expect(newToken.tradeable).toStrictEqual(metadata.tradeable)
          expect(newToken.collateralAddress).toStrictEqual(metadata.collateralAddress)
          expect(newToken.isDAT).toStrictEqual(metadata.isDAT)
          expect(newToken.decimal).toStrictEqual(8)
          expect(newToken.limit).toStrictEqual(0)
          expect(newToken.isLPS).toStrictEqual(false)
          expect(newToken.finalized).toStrictEqual(false)
          expect(newToken.minted).toStrictEqual(0)
          expect(typeof newToken.creationTx).toStrictEqual('string')
          expect(typeof newToken.destructionTx).toStrictEqual('string')
          expect(typeof newToken.creationHeight).toStrictEqual('number')
          expect(typeof newToken.destructionHeight).toStrictEqual('number')
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
      expect(typeof data).toStrictEqual('string')

      await container.generate(1)
      numberOfTokens += 1

      await waitForExpect(async () => {
        const tokensAfter = await client.token.listTokens()
        expect(Object.keys(tokensAfter).length).toStrictEqual(numberOfTokens)
      })

      const tokensAfter = await client.token.listTokens()
      for (const k in tokensAfter) {
        if (tokensAfter[k].symbol === metadata.symbol) {
          const newToken = tokensAfter[k]
          expect(newToken.symbolKey).toStrictEqual(`${metadata.symbol}#${k}`)
          expect(newToken.name).toStrictEqual(metadata.name)
          expect(newToken.mintable).toStrictEqual(metadata.mintable)
          expect(newToken.tradeable).toStrictEqual(metadata.tradeable)
          expect(newToken.collateralAddress).toStrictEqual(metadata.collateralAddress)
          expect(newToken.isDAT).toStrictEqual(metadata.isDAT)
          expect(newToken.decimal).toStrictEqual(8)
          expect(newToken.limit).toStrictEqual(0)
          expect(newToken.isLPS).toStrictEqual(false)
          expect(newToken.finalized).toStrictEqual(false)
          expect(newToken.minted).toStrictEqual(0)
          expect(typeof newToken.creationTx).toStrictEqual('string')
          expect(typeof newToken.destructionTx).toStrictEqual('string')
          expect(typeof newToken.creationHeight).toStrictEqual('number')
          expect(typeof newToken.destructionHeight).toStrictEqual('number')
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
      expect(typeof data).toStrictEqual('string')

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
      await container.generate(1)

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
      expect(tokenBefore.symbol).toStrictEqual('DTEST')
      expect(tokenBefore.name).toStrictEqual('DTEST')
      expect(tokenBefore.isDAT).toStrictEqual(false)
      expect(tokenBefore.mintable).toStrictEqual(true)
      expect(tokenBefore.tradeable).toStrictEqual(true)
      expect(tokenBefore.finalized).toStrictEqual(false)
      expect(tokenBefore.symbolKey).toStrictEqual(`DTEST#${tokenDTESTId}`)

      const data = await client.token.updateToken(`DTEST#${tokenDTESTId}`, {
        symbol: 'DDEST',
        name: 'DDEST',
        isDAT: true,
        mintable: false,
        tradeable: false,
        finalize: false
      })
      expect(typeof data).toStrictEqual('string')
      await container.generate(1)

      const { [tokenDTESTId]: tokenAfter } = await client.token.getToken('DDEST')
      expect(tokenAfter.symbol).toStrictEqual('DDEST')
      expect(tokenAfter.name).toStrictEqual('DDEST')
      expect(tokenAfter.isDAT).toStrictEqual(true)
      expect(tokenAfter.mintable).toStrictEqual(false)
      expect(tokenAfter.tradeable).toStrictEqual(false)
      expect(tokenAfter.finalized).toStrictEqual(false)
      // NOTE(canonbrother): isDAT will not show the ID
      expect(tokenAfter.symbolKey).toStrictEqual('DDEST')
    })

    it('should updateToken by token id', async () => {
      const { [tokenDABCId]: tokenBefore } = await client.token.getToken(`DABC#${tokenDABCId}`)
      expect(tokenBefore.mintable).toStrictEqual(true)

      await client.token.updateToken(tokenDABCId, { mintable: false })
      await container.generate(1)

      const { [tokenDABCId]: tokenAfter } = await client.token.getToken(`DABC#${tokenDABCId}`)
      expect(tokenAfter.mintable).toStrictEqual(false)
    })

    it('should updateToken by creationTx', async () => {
      const { [tokenDABCId]: tokenBefore } = await client.token.getToken(`DABC#${tokenDABCId}`)
      expect(tokenBefore.tradeable).toStrictEqual(true)

      const { creationTx } = tokenBefore
      await client.token.updateToken(creationTx, { tradeable: false })
      await container.generate(1)

      const { [tokenDABCId]: tokenAfter } = await client.token.getToken(`DABC#${tokenDABCId}`)
      expect(tokenAfter.tradeable).toStrictEqual(false)
    })
  })

  describe('listTokens', () => {
    beforeAll(async () => {
      await createToken('DBTC', { isDAT: true })
      await createToken('DNOTMINT', { mintable: false })
      await createToken('DNOTTRAD', { tradeable: false })
      await container.generate(1)
    })

    it('should listTokens', async () => {
      await waitForExpect(async () => {
        const tokens = await client.token.listTokens()
        expect(Object.keys(tokens).length).toBeGreaterThan(3)
      })

      const tokens = await client.token.listTokens()
      for (const k in tokens) {
        const token = tokens[k]
        expect(token.decimal).toStrictEqual(8)
        expect(token.limit).toStrictEqual(0)
        expect(token.minted).toStrictEqual(0)
        expect(token.isLPS).toStrictEqual(false)
        expect(typeof token.creationTx).toStrictEqual('string')
        expect(typeof token.creationHeight).toStrictEqual('number')
        expect(typeof token.destructionTx).toStrictEqual('string')
        expect(typeof token.destructionHeight).toStrictEqual('number')
        expect(typeof token.collateralAddress).toStrictEqual('string')

        switch (token.symbol) {
          case 'DFI':
            expect(token.symbol).toStrictEqual('DFI')
            expect(token.symbolKey).toStrictEqual('DFI')
            expect(token.name).toStrictEqual('Default Defi token')
            expect(token.mintable).toStrictEqual(false)
            expect(token.tradeable).toStrictEqual(true)
            expect(token.isDAT).toStrictEqual(true)
            expect(token.finalized).toStrictEqual(true)
            expect(token.collateralAddress).toStrictEqual('')
            break
          case 'DBTC':
            expect(token.symbol).toStrictEqual('DBTC')
            expect(token.symbolKey).toStrictEqual('DBTC')
            expect(token.name).toStrictEqual('DBTC')
            expect(token.mintable).toStrictEqual(true)
            expect(token.tradeable).toStrictEqual(true)
            expect(token.isDAT).toStrictEqual(true)
            expect(token.finalized).toStrictEqual(false)
            break
          case 'DNOTMINT':
            expect(token.symbol).toStrictEqual('DNOTMINT')
            expect(token.symbolKey).toStrictEqual(`DNOTMINT#${k}`)
            expect(token.name).toStrictEqual('DNOTMINT')
            expect(token.mintable).toStrictEqual(false)
            expect(token.tradeable).toStrictEqual(true)
            expect(token.isDAT).toStrictEqual(false)
            expect(token.finalized).toStrictEqual(false)
            break
          case 'DNOTTRAD':
            expect(token.symbol).toStrictEqual('DNOTTRAD')
            expect(token.symbolKey).toStrictEqual(`DNOTTRAD#${k}`)
            expect(token.name).toStrictEqual('DNOTTRAD')
            expect(token.mintable).toStrictEqual(true)
            expect(token.tradeable).toStrictEqual(false)
            expect(token.isDAT).toStrictEqual(false)
            expect(token.finalized).toStrictEqual(false)
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

      expect(Object.keys(tokens).length).toStrictEqual(0)
    })

    it('should listTokens with pagination limit', async () => {
      const pagination = {
        start: 0,
        including_start: true,
        limit: 2
      }
      const tokens = await client.token.listTokens(pagination)

      expect(Object.keys(tokens).length).toStrictEqual(2)
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

      expect(data.symbol).toStrictEqual('DFI')
      expect(data.symbolKey).toStrictEqual('DFI')
      expect(data.name).toStrictEqual('Default Defi token')
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

      expect(data.symbol).toStrictEqual('DFI')
      expect(data.symbolKey).toStrictEqual('DFI')
      expect(data.name).toStrictEqual('Default Defi token')
      expect(data.decimal).toStrictEqual(8)
      expect(data.limit).toStrictEqual(0)
      expect(data.mintable).toStrictEqual(false)
      expect(data.tradeable).toStrictEqual(true)
      expect(data.isDAT).toStrictEqual(true)
      expect(data.isLPS).toStrictEqual(false)
      expect(data.finalized).toStrictEqual(true)
      expect(data.minted).toStrictEqual(0)
      expect(data.creationTx).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
      expect(data.creationHeight).toStrictEqual(0)
      expect(data.destructionTx).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
      expect(data.destructionHeight).toStrictEqual(-1)
      expect(data.collateralAddress).toStrictEqual('')
    })
  })
})
