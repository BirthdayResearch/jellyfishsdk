import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BigNumber } from '@defichain/jellyfish-json'

describe('Pool', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(200)
    await setup()
  })

  afterAll(async () => {
    await container.stop()
  })

  async function setup (): Promise<void> {
    await createToken('DSWAP')
    await mintTokens('DSWAP')
    await createPoolPair('DSWAP')
    await addPoolLiquidity()
    await addPoolLiquidity()
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

  async function addPoolLiquidity (): Promise<void> {
    const shareAddress = await container.call('getnewaddress')
    const data = await client.poolpair.addPoolLiquidity({
      '*': ['10@DFI', '200@DSWAP']
    }, shareAddress)

    expect(typeof data).toStrictEqual('string')

    await container.generate(1)
  }

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
