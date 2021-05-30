import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('Token without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

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

describe('Token on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await createToken('DBTC', { isDAT: true })
    await createToken('DNOTMINT', { mintable: false })
    await createToken('DNOTTRAD', { tradeable: false })
  })

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

  afterAll(async () => {
    await container.stop()
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
