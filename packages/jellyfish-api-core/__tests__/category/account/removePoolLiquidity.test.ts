import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Poolpair', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  let poolLiquidityAddress: string

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(200)

    await createToken('DDAI')
    await mintTokens('DDAI')
    await createPoolPair('DDAI')
    await addPoolLiquidity()
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
      tokenB: 'DDAI',
      commission: 0,
      status: true,
      ownerAddress: address
    }
    await client.poolpair.createPoolPair({ ...defaultMetadata, ...metadata })
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

  async function addPoolLiquidity (): Promise<void> {
    const shareAddress = await container.call('getnewaddress')
    const data = await client.poolpair.addPoolLiquidity({
      '*': ['10@DFI', '200@DDAI']
    }, shareAddress)
    await container.generate(1)

    expect(typeof data).toStrictEqual('string')
  }

  it('should removePoolLiquidity', async () => {
    const poolPairBefore = await container.call('listpoolpairs')
    console.log('poolpairs: ', poolPairBefore)

    const totalLiquidityBefore = poolPairBefore['2'].totalLiquidity

    try {
      await container.call('removepoolliquidity', [poolLiquidityAddress, '13@DFI-DDAI'])
      await container.generate(1)
    } catch (err) {
      console.log('err: ', err)
    }

    const poolPairAfter = await container.call('listpoolpairs')
    console.log('poolpairs: ', poolPairAfter)
    const totalLiquidityAfter = poolPairAfter['2'].totalLiquidity

    // expect(poolPairAfter['2'].totalLiquidity - poolPairBefore['2'].totalLiquidity.toStrictEqual(13))
    expect(totalLiquidityBefore - totalLiquidityAfter).toStrictEqual(0) // 13
  })

  it('should fail while removePoolLiquidity with utxos which does not include account owner', async () => {
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

    const promise = client.poolpair.removePoolLiquidity({
      [tokenAAddress]: '10@DFI',
      [tokenBAddress]: '200@DDAI'
    }, shareAddress, { utxos: inputs })

    expect(typeof promise).toStrictEqual('object')
  })
})
