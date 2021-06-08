import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { PoolSwapMetadata } from '../../../src/category/poolpair'

describe('poolpair', () => {
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
    await createToken('ETH')
    await mintTokens('ETH')
    await createPoolPair('ETH')
    await addPoolLiquidity()
  }

  let address: string

  async function createToken (symbol: string): Promise<void> {
    address = await container.call('getnewaddress')
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

  async function addPoolLiquidity (): Promise<void> {
    const shareAddress = await container.call('getnewaddress')
    await client.poolpair.addPoolLiquidity({
      '*': ['10@DFI', '200@ETH']
    }, shareAddress)

    await container.generate(1)
  }

  async function mintTokens (symbol: string): Promise<void> {
    await container.call('utxostoaccount', [{ [address]: '100@0' }])
    await container.call('minttokens', [`2000@${symbol}`])
    await container.generate(1)
  }

  it('should create a poolswap transaction with specified UTOXS to spend', async () => {
    const metadata: PoolSwapMetadata = {
      from: address,
      amountFrom: 2,
      tokenFrom: 'DFI',
      tokenTo: 'ETH',
      maxPrice: 20,
      to: await client.wallet.getNewAddress()
    }
    const utxos = await container.call('listunspent')
    const inputs = utxos.map((utxo: { txid: string, vout: number }) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })
    const poolSwapHex = await client.poolpair.poolSwap(metadata, inputs)
    const swapAmount = await client.poolpair.testPoolSwap(metadata)

    expect(typeof poolSwapHex).toStrictEqual('string')
    expect(swapAmount).toStrictEqual('33.36113339@1')
  })

  it('should create a poolswap transaction', async () => {
    const metadata: PoolSwapMetadata = {
      from: address, amountFrom: 2, tokenFrom: 'DFI', tokenTo: 'ETH', to: await client.wallet.getNewAddress()
    }
    const poolswapHex = await client.poolpair.poolSwap(metadata)
    const swapAmount = await client.poolpair.testPoolSwap(metadata)

    expect(swapAmount).toStrictEqual('33.36113339@1')
    expect(typeof poolswapHex).toStrictEqual('string')
  })

  it('should create a poolswap transaction with max price specified', async () => {
    const metadata: PoolSwapMetadata = {
      from: address,
      amountFrom: 2,
      tokenFrom: 'ETH',
      tokenTo: 'DFI',
      maxPrice: 20,
      to: await client.wallet.getNewAddress()
    }
    const poolswapHex = await client.poolpair.poolSwap(metadata)
    const swapAmount = await client.poolpair.testPoolSwap(metadata)

    expect(swapAmount).toStrictEqual('0.09910797@0')
    expect(typeof poolswapHex).toStrictEqual('string')
  })

  it('should throw an error when invalid token is specified', async () => {
    const invalidToken = 'INVALID'
    const metadata = {
      from: address,
      amountFrom: 2,
      tokenFrom: invalidToken,
      tokenTo: 'DFI',
      maxPrice: 20,
      to: await client.wallet.getNewAddress()
    }

    await expect(client.poolpair.poolSwap(metadata)).rejects.toThrow('TokenFrom was not found')
  })
})
