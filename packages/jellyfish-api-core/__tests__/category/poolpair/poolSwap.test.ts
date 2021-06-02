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
    await createToken('DDAI')
    await mintTokens('DDAI')
    await createPoolPair('DDAI')
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

  async function addPoolLiquidity (): Promise<void> {
    const shareAddress = await container.call('getnewaddress')
    const data = await client.poolpair.addPoolLiquidity({
      '*': ['10@DFI', '200@DDAI']
    }, shareAddress)

    expect(typeof data).toStrictEqual('string')

    await container.generate(1)
  }

  async function mintTokens (symbol: string): Promise<void> {
    const address = await container.call('getnewaddress')

    const payload: { [key: string]: string } = {}
    payload[address] = '100@0'
    await container.call('utxostoaccount', [payload])
    await container.call('minttokens', [`2000@${symbol}`])

    await container.generate(1)
  }

  it('should create a poolswap transction', async () => {
    const from = await client.wallet.getNewAddress()
    const to = await client.wallet.getNewAddress()
    const metadata: PoolSwapMetadata = {
      from, amountFrom: 10, tokenFrom: 'DDAI', tokenTo: 'DFI', maxPrice: 10, to
    }
    const transactionHex = await client.poolpair.poolSwap(metadata)

    expect(typeof transactionHex).toStrictEqual('string')
  })
})
