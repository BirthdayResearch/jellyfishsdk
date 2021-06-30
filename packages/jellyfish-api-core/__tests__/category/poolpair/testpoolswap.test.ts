import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'
import { RpcApiError } from '../../../src'
import { PoolPairInfo, PoolPairsResult } from '@defichain/jellyfish-api-core/category/poolpair'

describe('Poolpair', () => {
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

  it('should testpoolswap', async () => {
    const tokenAddress = await getNewAddress(container)
    const dfiAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await createToken(container, 'CAT', { collateralAddress: tokenAddress })
    await mintTokens(container, 'CAT', { address: dfiAddress })
    await createPoolPair(container, 'CAT', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'CAT',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: poolLiquidityAddress
    })

    const poolpairResult: PoolPairsResult = await container.call('getpoolpair', ['CAT-DFI'])
    expect(Object.keys(poolpairResult).length).toStrictEqual(1)

    // Note(canonbrother): simulate poolswap calculation to find reserveB
    // case: swap 666 CAT to DFI
    // 1000 : 500 = sqrt(1000 * 500) = 707.10678118
    // 1666 : ? = sqrt(1666 * ?) = 707.10678118
    // ? = 707.10678118^2 / 1666 = 300.120048014
    // 1666 : 300.120048014 = 707.10678118
    // 500 - 300.120048014 = 199.879951986  <-- testpoolswap returns
    const poolpair: PoolPairInfo = Object.values(poolpairResult)[0]
    const reserveAAfter: BigNumber = new BigNumber(poolpair.reserveA).plus(666)
    const reserveBAfter: BigNumber = new BigNumber(poolpair.totalLiquidity).pow(2).div(reserveAAfter)

    const result = await client.poolpair.testPoolSwap({
      from: tokenAddress,
      tokenFrom: 'CAT',
      amountFrom: 666,
      to: await getNewAddress(container),
      tokenTo: 'DFI'
    }) // 199.99999729@0

    const testPoolSwapResultAmount = new BigNumber(result.split('@')[0]) // 199.99999729
    const swapped = new BigNumber(poolpair.reserveB).minus(reserveBAfter) // 199.87995198635029880408

    // Note(canonbrother): the result has slightly diff, use toFixed() to ignore the decimals
    expect(swapped.toFixed(0)).toStrictEqual(testPoolSwapResultAmount.toFixed(0))
  })

  it('should testpoolswap with maxPrice', async () => {
    const tokenAddress = await getNewAddress(container)
    const dfiAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await createToken(container, 'ELF', { collateralAddress: tokenAddress })
    await mintTokens(container, 'ELF', { address: dfiAddress })
    await createPoolPair(container, 'ELF', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'ELF',
      amountA: 200,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: poolLiquidityAddress
    })

    const receive = await client.poolpair.testPoolSwap({
      from: tokenAddress,
      tokenFrom: 'ELF',
      amountFrom: 666,
      to: await getNewAddress(container),
      tokenTo: 'DFI',
      // reserveA/reserveB: 0.4
      // reserveB/reserveA: 2.5
      // if set maxPrice lower than 2.5 will hit error
      maxPrice: 2.5
    })
    expect(typeof receive).toStrictEqual('string')
    expect(receive).toStrictEqual('384.61537432@0') // calculation refers to 'should testpoolswap' above
  })

  it('should be failed as maxPrice is set lower than reserveB/reserveA', async () => {
    const tokenAddress = await getNewAddress(container)
    const dfiAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await createToken(container, 'FOX', { collateralAddress: tokenAddress })
    await mintTokens(container, 'FOX', { address: dfiAddress })
    await createPoolPair(container, 'FOX', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'FOX',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: poolLiquidityAddress
    })

    const promise = client.poolpair.testPoolSwap({
      from: tokenAddress,
      tokenFrom: 'FOX',
      amountFrom: 666,
      to: await getNewAddress(container),
      tokenTo: 'DFI',
      // reserveA/reserveB: 2
      // reserveB/reserveA: 0.5
      // set maxPrice lower than 0.5 will hit error
      maxPrice: 0.4
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Price is higher than indicated')
  })

  it('testpoolswap should not affect the ori poolpair data', async () => {
    const tokenAddress = await getNewAddress(container)
    const dfiAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await createToken(container, 'DOG', { collateralAddress: tokenAddress })
    await mintTokens(container, 'DOG', { address: dfiAddress })
    await createPoolPair(container, 'DOG', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'DOG',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: poolLiquidityAddress
    })

    const poolpairResultBefore: PoolPairsResult = await container.call('getpoolpair', ['DOG-DFI'])
    expect(Object.keys(poolpairResultBefore).length).toStrictEqual(1)

    await client.poolpair.testPoolSwap({
      from: tokenAddress,
      tokenFrom: 'CAT',
      amountFrom: 666,
      to: await getNewAddress(container),
      tokenTo: 'DFI'
    })

    const poolpairResultAfter: PoolPairsResult = await container.call('getpoolpair', ['DOG-DFI'])
    expect(Object.keys(poolpairResultAfter).length).toStrictEqual(1)

    expect(poolpairResultBefore).toStrictEqual(poolpairResultAfter)
  })

  it('should be failed as lack of liquidity', async () => {
    const tokenBatAddress = await getNewAddress(container)
    await createToken(container, 'BAT')
    await mintTokens(container, 'BAT')
    await createPoolPair(container, 'BAT', 'DFI')

    const promise = client.poolpair.testPoolSwap({
      from: tokenBatAddress,
      tokenFrom: 'BAT',
      amountFrom: 13,
      to: await getNewAddress(container),
      tokenTo: 'DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Lack of liquidity')
  })
})
