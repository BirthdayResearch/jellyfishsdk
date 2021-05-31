import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Poolpairs', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(200)
    await createToken('DDAI')
    await mintTokens('DDAI')
    await createPoolPair('DDAI')
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
