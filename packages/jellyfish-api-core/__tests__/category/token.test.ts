import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import { TokenPagination } from '../../src'

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
      const pagination: TokenPagination = {
        start: 1,
        including_start: true,
        limit: 100
      }
      const token = await client.token.listTokens(pagination)

      expect(Object.keys(token).length).toBe(0)
    })

    it('should listTokens with verbose false', async () => {
      const pagination: TokenPagination = {
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
      const token: any = await client.token.getToken('DFI')
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
      const pagination: TokenPagination = {
        start: 1,
        including_start: true,
        limit: 100
      }
      const token = await client.token.listTokens(pagination)

      expect(Object.keys(token).length).toBe(0)
    })

    it('should listTokens with verbose false', async () => {
      const pagination: TokenPagination = {
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
      const token: any = await client.token.getToken('DFI')
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
