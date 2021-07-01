import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'

describe('Poolpair', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(200)
  })

  afterAll(async () => {
    await container.stop()
  })

  it.only('should removeLiquidity', async () => {
    const dogAddress = await getNewAddress(container)
    const foxAddress = await getNewAddress(container)
    // const poolPairAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await createToken(container, 'DOG')
    await mintTokens(container, 'DOG', { address: dogAddress })

    await createToken(container, 'FOX')
    await mintTokens(container, 'FOX', { address: foxAddress })
    const dogAccount = await container.call('getaccount', [dogAddress])
    console.log('dogAccount: ', dogAccount)

    await createPoolPair(container, 'DOG', 'FOX')
    // const poolpairs = await container.call('listpoolpairs')
    // console.log('poolpairs: ', poolpairs)
    await addPoolLiquidity(container, {
      tokenA: 'DOG',
      amountA: 10,
      tokenB: 'FOX',
      amountB: 200,
      shareAddress: poolLiquidityAddress
    })
    // totalLiquidity = sqrt(10 * 200) =
    // const dogAccountAfter = await container.call('getaccount', [dogAddress])
    // console.log('dogAccountAfter: ', dogAccountAfter)

    const poolLiquidityAccount = await container.call('getaccount', [poolLiquidityAddress])
    console.log('poolLiquidityAccountBefore: ', poolLiquidityAccount)

    const poolPairBefore = await container.call('listpoolpairs')
    console.log('poolPairBefore: ', poolPairBefore)
    const totalLiquidityBefore = poolPairBefore['3'].totalLiquidity
    const hash = await client.poolpair.removePoolLiquidity(poolLiquidityAddress, '13@DOG-FOX')

    expect(typeof hash).toStrictEqual('string')
    expect(hash.length).toStrictEqual(64)
    await container.generate(1)

    const poolPairAfter = await container.call('listpoolpairs')
    console.log('poolPairAfter: ', poolPairAfter)
    console.log('poolLiquidityAddress: ', poolLiquidityAddress)

    const poolLiquidityAccountAfter = await container.call('getaccount', [poolLiquidityAddress])
    console.log('poolLiquidityAccountAfter: ', poolLiquidityAccountAfter)

    const dogAccountAfter = await container.call('getaccount', [dogAddress])
    const foxAccountAfter = await container.call('getaccount', [foxAddress])

    console.log('dogAccountAfter: ', dogAccountAfter, foxAccountAfter)

    const totalLiquidityAfter = poolPairAfter['3'].totalLiquidity
    console.log('totalLiquidityAfter: ', totalLiquidityAfter)
    console.log('totalLiquidityDiff: ', totalLiquidityBefore - totalLiquidityAfter)

    expect(totalLiquidityBefore - totalLiquidityAfter).toStrictEqual(13)
  })

  // it('should removeLiquidity with utxos', async () => {
  //   const shareAddress = await container.call('getnewaddress')
  //   const tokenAAddress = await container.call('getnewaddress', '10@DDFI')
  //   const tokenBAddress = await container.call('getnewaddress', '200@DBTC')
  //   const utxos = await container.call('listunspent')
  //   await container.generate(1)
  //
  //   const inputs = utxos.map((utxo: any) => {
  //     return {
  //       txid: utxo.txid,
  //       vout: utxo.vout
  //     }
  //   })
  //
  //   const hash = await client.poolpair.removePoolLiquidity({
  //     [tokenAAddress]: '10@DOG',
  //     [tokenBAddress]: '200@FOX'
  //   }, shareAddress, { utxos: inputs })
  //
  //   expect(typeof hash).toStrictEqual('string')
  //   expect(hash.length).toStrictEqual(64)
  // })

  // it('fail as utxos does not include an account owner', async () => {
  //   const shareAddress = await container.call('getnewaddress')
  //   const tokenAAddress = await container.call('getnewaddress')
  //   const tokenBAddress = await container.call('getnewaddress')
  //   const utxos = await container.call('listunspent')
  //
  //   const inputs = utxos.map((utxo: any) => {
  //     return {
  //       txid: utxo.txid,
  //       vout: utxo.vout
  //     }
  //   })
  //
  //   const hash = await client.poolpair.removePoolLiquidity({
  //     [tokenAAddress]: '10@DOG',
  //     [tokenBAddress]: '200@FOX'
  //   }, shareAddress, { utxos: inputs })
  //
  //   expect(typeof hash).rejects.toThrow('tx must have at least one input from account owner')
  // })
})
