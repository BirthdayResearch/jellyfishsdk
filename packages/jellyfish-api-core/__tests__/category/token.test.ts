import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'

describe.skip('non masternode', () => {
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
      const pagination = {
        start: 1,
        including_start: true,
        limit: 100
      }
      const token = await client.token.listTokens(pagination)

      expect(Object.keys(token).length).toBe(0)
    })

    it('should listTokens with verbose false', async () => {
      const pagination = {
        start: 0,
        including_start: true,
        limit: 100
      }
      const token = await client.token.listTokens(pagination, false)
      const data = token['0']

      expect(data.symbol).toBe('DFI')
      expect(data.symbolKey).toBe('DFI')
      expect(data.name).toBe('Default Defi token')
    })
  })

  describe('getToken', () => {
    it('should getToken', async () => {
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

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  describe.only('createToken', () => {
    it('should createToken', async () => {
      const utxos = await container.call('listunspent')
      console.log('utxos: ', utxos.length, utxos[0].txid, utxos[0].vout)
      const address = await container.call('getnewaddress')

      const metadata = {
        symbol: 'ddd',
        name: 'ddd',
        isDAT: true,
        decimal: 8,
        limit: 100,
        mintable: true,
        tradeable: true,
        collateralAddress: address
      }
      const data = await client.token.createToken(metadata, [{
        txid: utxos[0].txid,
        vout: utxos[0].vout
      }])
      console.log('data: ', data)
      const tokens = await client.token.listTokens()
      console.log('tokens: ', tokens)
    })
  })

  describe('listTokens', () => {
    it('should listTokens', async () => {
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
      const pagination = {
        start: 1,
        including_start: true,
        limit: 100
      }
      const token = await client.token.listTokens(pagination)

      expect(Object.keys(token).length).toBe(0)
    })

    it('should listTokens with verbose false', async () => {
      const pagination = {
        start: 0,
        including_start: true,
        limit: 100
      }
      const token = await client.token.listTokens(pagination, false)
      const data = token['0']

      expect(data.symbol).toBe('DFI')
      expect(data.symbolKey).toBe('DFI')
      expect(data.name).toBe('Default Defi token')
    })
  })

  describe('getToken', () => {
    it('should getToken', async () => {
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
