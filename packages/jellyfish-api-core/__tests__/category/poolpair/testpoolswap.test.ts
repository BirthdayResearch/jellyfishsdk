import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'
import { RpcApiError } from '../../../src'
import { poolpair } from '@defichain/jellyfish-api-core'

describe('Poolpair', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    await createToken(container, 'BAT')
    await createToken(container, 'BTC')

    await createPoolPair(container, 'BAT', 'DFI')
    await createPoolPair(container, 'BTC', 'DFI')
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

    const poolpairResult: poolpair.PoolPairsResult = await container.call('getpoolpair', ['CAT-DFI'])
    expect(Object.keys(poolpairResult).length).toStrictEqual(1)

    // Note(canonbrother): simulate poolswap calculation to find reserveB
    // case: swap 666 CAT to DFI
    // 1000 : 500 = sqrt(1000 * 500) = 707.10678118
    // 1666 : ? = sqrt(1666 * ?) = 707.10678118
    // ? = 707.10678118^2 / 1666 = 300.120048014
    // 1666 : 300.120048014 = 707.10678118
    // 500 - 300.120048014 = 199.879951986  <-- testpoolswap returns
    const poolpair: poolpair.PoolPairInfo = Object.values(poolpairResult)[0]
    const reserveAAfter: BigNumber = new BigNumber(poolpair.reserveA).plus(666)
    const reserveBAfter: BigNumber = new BigNumber(poolpair.totalLiquidity).pow(2).div(reserveAAfter)

    const result = await client.poolpair.testPoolSwap({
      from: tokenAddress,
      tokenFrom: 'CAT',
      amountFrom: 666,
      to: await getNewAddress(container),
      tokenTo: 'DFI'
    }) // 199.99999729@0

    if (typeof result !== 'string') {
      throw new Error(`result was ${typeof result}, expected string`)
    }
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

    const swappedAmount = new BigNumber(500).minus(new BigNumber(500 * 200).dividedBy(200 + 666)).multipliedBy(1e8).minus(1).dividedBy(1e8).decimalPlaces(8, BigNumber.ROUND_CEIL)
    expect(typeof receive).toStrictEqual('string')
    expect(receive).toStrictEqual(`${swappedAmount.toString()}@0`) // calculation refers to 'should testpoolswap' above
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
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -32600,
        message: 'Cannot find usable pool pair. Details: Price is higher than indicated.',
        method: 'testpoolswap'
      }
    })
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

    const poolpairResultBefore: poolpair.PoolPairsResult = await container.call('getpoolpair', ['DOG-DFI'])
    expect(Object.keys(poolpairResultBefore).length).toStrictEqual(1)

    await client.poolpair.testPoolSwap({
      from: tokenAddress,
      tokenFrom: 'CAT',
      amountFrom: 666,
      to: await getNewAddress(container),
      tokenTo: 'DFI'
    })

    const poolpairResultAfter: poolpair.PoolPairsResult = await container.call('getpoolpair', ['DOG-DFI'])
    expect(Object.keys(poolpairResultAfter).length).toStrictEqual(1)

    expect(poolpairResultBefore).toStrictEqual(poolpairResultAfter)
  })

  it('should be failed as lack of liquidity', async () => {
    const tokenBatAddress = await getNewAddress(container)
    await mintTokens(container, 'BAT')

    const promise = client.poolpair.testPoolSwap({
      from: tokenBatAddress,
      tokenFrom: 'BAT',
      amountFrom: 13,
      to: await getNewAddress(container),
      tokenTo: 'DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -32600,
        message: 'Cannot find usable pool pair. Details: Lack of liquidity.',
        method: 'testpoolswap'
      }
    })
  })

  it('should fail if wrong path option is used', async () => {
    const tokenBatAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await mintTokens(container, 'BAT')
    await mintTokens(container, 'BTC')
    await addPoolLiquidity(container, {
      tokenA: 'BAT',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: poolLiquidityAddress
    })
    await addPoolLiquidity(container, {
      tokenA: 'BTC',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: poolLiquidityAddress
    })

    const promise = client.poolpair.testPoolSwap({
      from: tokenBatAddress,
      tokenFrom: 'BAT',
      amountFrom: 13,
      to: await getNewAddress(container),
      tokenTo: 'BTC'
    }, 'direct')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -32600,
        message: 'Direct pool pair not found. Use \'auto\' mode to use composite swap.',
        method: 'testpoolswap'
      }
    })
  })

  it('should return verbose output', async () => {
    const tokenBatAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await mintTokens(container, 'BAT')
    await mintTokens(container, 'BTC')
    await addPoolLiquidity(container, {
      tokenA: 'BAT',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: poolLiquidityAddress
    })
    await addPoolLiquidity(container, {
      tokenA: 'BTC',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: poolLiquidityAddress
    })

    const promise = await client.poolpair.testPoolSwap({
      from: tokenBatAddress,
      tokenFrom: 'BAT',
      amountFrom: 13,
      to: await getNewAddress(container),
      tokenTo: 'BTC'
    }, 'auto', true)

    expect(promise).toStrictEqual({
      path: 'auto',
      pools: ['3', '4'],
      amount: '12.83316880@2'
    })
  })

  it('should not compositeSwap for more than 3 pools', async () => {
    const toAddress = await getNewAddress(container)
    const fromAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await createToken(container, 'T1')
    await createToken(container, 'T2')
    await createToken(container, 'T3')
    await createToken(container, 'T4')
    await createToken(container, 'T5')

    await mintTokens(container, 'T1')
    await mintTokens(container, 'T2')
    await mintTokens(container, 'T3')
    await mintTokens(container, 'T4')
    await mintTokens(container, 'T5')

    await createPoolPair(container, 'T1', 'T2')
    await createPoolPair(container, 'T2', 'T3')
    await createPoolPair(container, 'T3', 'T4')
    await createPoolPair(container, 'T4', 'T5')

    await addPoolLiquidity(container, {
      tokenA: 'T1',
      amountA: 100,
      tokenB: 'T2',
      amountB: 100,
      shareAddress: poolLiquidityAddress
    })
    await addPoolLiquidity(container, {
      tokenA: 'T2',
      amountA: 100,
      tokenB: 'T3',
      amountB: 100,
      shareAddress: poolLiquidityAddress
    })
    await addPoolLiquidity(container, {
      tokenA: 'T3',
      amountA: 100,
      tokenB: 'T4',
      amountB: 100,
      shareAddress: poolLiquidityAddress
    })
    await addPoolLiquidity(container, {
      tokenA: 'T4',
      amountA: 100,
      tokenB: 'T5',
      amountB: 100,
      shareAddress: poolLiquidityAddress
    })

    const promise = client.poolpair.testPoolSwap({
      from: toAddress,
      tokenFrom: 'T1',
      amountFrom: 1,
      to: fromAddress,
      tokenTo: 'T5'
    }, Object.keys(await client.poolpair.listPoolPairs()), true)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -32600,
        message: 'Cannot find usable pool pair. Details: Too many pool IDs provided, max 3 allowed, 10 provided',
        method: 'testpoolswap'
      }
    })
  })
})
