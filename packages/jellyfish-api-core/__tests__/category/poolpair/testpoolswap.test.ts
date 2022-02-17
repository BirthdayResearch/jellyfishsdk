import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import {
  addPoolLiquidity,
  createPoolPair,
  createToken,
  getNewAddress,
  mintTokens,
  sendTokensToAddress
} from '@defichain/testing'
import { RpcApiError } from '../../../src'
import { poolpair } from '@defichain/jellyfish-api-core'
import { EstimatedCompositePath } from '../../../src/category/poolpair'

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

    const result = await client.poolpair.testPoolSwap<string>({
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

    const receive = await client.poolpair.testPoolSwap<string>({
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

    const promise = client.poolpair.testPoolSwap<string>({
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

    const poolpairResultBefore: poolpair.PoolPairsResult = await container.call('getpoolpair', ['DOG-DFI'])
    expect(Object.keys(poolpairResultBefore).length).toStrictEqual(1)

    await client.poolpair.testPoolSwap<string>({
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
    await createToken(container, 'BAT')
    await mintTokens(container, 'BAT')
    await createPoolPair(container, 'BAT', 'DFI')

    const promise = client.poolpair.testPoolSwap<string>({
      from: tokenBatAddress,
      tokenFrom: 'BAT',
      amountFrom: 13,
      to: await getNewAddress(container),
      tokenTo: 'DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Lack of liquidity')
  })

  it.skip('testpoolswap does direct swap when \'auto\' path specified and direct swap available', async () => {
    // Create ZOO-DFI pool and add liquidity
    const zooDfiPoolAddress = await getNewAddress(container)
    await createToken(container, 'ZOO')
    await mintTokens(container, 'ZOO')
    await createPoolPair(container, 'ZOO', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'ZOO',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: zooDfiPoolAddress
    })

    // Create an address that has ZOO and wants to swap for DFI
    const fromAddress = await getNewAddress(container)
    await sendTokensToAddress(container, fromAddress, 1000, 'ZOO')

    // Get the testPoolSwap result as '<zooAmount>@<pool>'
    const metadata = {
      from: fromAddress,
      to: zooDfiPoolAddress,
      tokenFrom: 'ZOO',
      tokenTo: 'DFI',
      amountFrom: 666
    }
    const testResult = await client.poolpair.testPoolSwap<string>(metadata, 'auto')
    const testResultVerbose = await client.poolpair.testPoolSwap<EstimatedCompositePath>(metadata, 'auto', true)

    // TODO(limeli): should be a direct swap, but it's making a composite swap instead. Why?
    expect(testResultVerbose.amount).toStrictEqual(testResult)
    expect(testResultVerbose.path).toStrictEqual('auto')
    expect(testResultVerbose.pools).toStrictEqual(['12'])
    expect(testResult).toStrictEqual('199.87995198@0')

    // Actually perform the swap
    const txn = await client.poolpair.poolSwap({
      from: fromAddress,
      to: zooDfiPoolAddress,
      tokenFrom: 'ZOO',
      tokenTo: 'DFI',
      amountFrom: 666
    })
    expect(txn.length).toStrictEqual(64)
    await container.generate(1)

    // Verify ZOO-DFI pool state
    const zooDfiPair: poolpair.PoolPairsResult = await container.call('getpoolpair', ['ZOO-DFI'])
    const zooDfiPool: poolpair.PoolPairInfo = Object.values(zooDfiPair)[0]

    expect(new BigNumber(zooDfiPool.reserveA).toFixed(4)) // ZOO
      .toStrictEqual(new BigNumber(1666).toFixed(4))

    expect(new BigNumber(zooDfiPool.reserveB).toFixed(4)) // DFI
      .toStrictEqual(new BigNumber(300.120048).toFixed(4))

    // Check test swap result against actual swap result
    const testResultDfi = new BigNumber(testResult.split('@')[0])
    expect(testResultDfi.toFixed(4))
      .toStrictEqual( // initial dfi reserve - current dfi reserve
        new BigNumber(500).minus(new BigNumber(zooDfiPool.reserveB)).toFixed(4)
      )
  })

  it('testpoolswap does compositeswap when \'auto\' path specified and no direct swap available', async () => {
    // Create BEE-DFI pool and add liquidity
    const beeDfiPoolAddress = await getNewAddress(container)
    await createToken(container, 'BEE')
    await mintTokens(container, 'BEE')
    await createPoolPair(container, 'BEE', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'BEE',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: beeDfiPoolAddress
    })

    // Create FLY-DFI pool and add liquidity
    const flyDfiPoolAddress = await getNewAddress(container)
    await createToken(container, 'FLY')
    await mintTokens(container, 'FLY')
    await createPoolPair(container, 'FLY', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'FLY',
      amountA: 2000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: flyDfiPoolAddress
    })

    // Create an address that has BEE and wants to swap for FLY
    const fromAddress = await getNewAddress(container)
    await sendTokensToAddress(container, fromAddress, 1000, 'BEE')

    // Get the testPoolSwap result as '<flyAmount>@<pool>'
    const testResult = await client.poolpair.testPoolSwap<string>({
      from: fromAddress,
      to: beeDfiPoolAddress,
      tokenFrom: 'BEE',
      tokenTo: 'FLY',
      amountFrom: 666
    }, 'auto')

    // Actually perform the composite swap, then check it against testPoolSwap result
    const txn = await client.poolpair.compositeSwap({
      from: fromAddress,
      to: beeDfiPoolAddress,
      tokenFrom: 'BEE',
      tokenTo: 'FLY',
      amountFrom: 666
    })
    expect(txn.length).toStrictEqual(64)
    await container.generate(1)

    // Verify BEE-DFI pool state
    const beeDfiPair: poolpair.PoolPairsResult = await container.call('getpoolpair', ['BEE-DFI'])
    const beeDfiPool: poolpair.PoolPairInfo = Object.values(beeDfiPair)[0]

    expect(new BigNumber(beeDfiPool.reserveA).toFixed(4)) // BEE
      .toStrictEqual(new BigNumber(1666).toFixed(4))

    expect(new BigNumber(beeDfiPool.reserveB).toFixed(4)) // DFI
      .toStrictEqual(new BigNumber(300.120048).toFixed(4))

    // Verify FLY-DFI pool state
    const flyDfiPair: poolpair.PoolPairsResult = await container.call('getpoolpair', ['FLY-DFI'])
    const flyDfiPool: poolpair.PoolPairInfo = Object.values(flyDfiPair)[0]

    expect(new BigNumber(flyDfiPool.reserveA).toFixed(4)) // FLY
      .toStrictEqual(new BigNumber(1428.816467).toFixed(4))

    expect(new BigNumber(flyDfiPool.reserveB).toFixed(4)) // DFI
      .toStrictEqual(new BigNumber(699.879952).toFixed(4))

    // Compare testpoolswap compositeswap result with actual compositeswap result
    // 666 BEE for 571.18353344 FLY
    const testResultFlyAmount = new BigNumber(testResult.split('@')[0])
    expect(testResultFlyAmount.toFixed(4))
      .toStrictEqual(new BigNumber(571.1835).toFixed(4))
    const flyReserveDiff = new BigNumber(2000).minus(new BigNumber(flyDfiPool.reserveA))

    expect(testResultFlyAmount.toFixed(4)).toStrictEqual(flyReserveDiff.toFixed(4))
  })

  it('testpoolswap(..., \'direct\') should fail if no pool exists for a direct swap', async () => {
    // GOO-DFI
    const tokenAddress = await getNewAddress(container)
    await createToken(container, 'GOO')
    await mintTokens(container, 'GOO')
    await createPoolPair(container, 'GOO', 'DFI')

    // LOO-DFI
    await createToken(container, 'LOO')
    await mintTokens(container, 'LOO')
    await createPoolPair(container, 'LOO', 'DFI')

    // Try to swap GOO-LOO directly
    const promise = client.poolpair.testPoolSwap<string>({
      from: tokenAddress,
      tokenFrom: 'GOO',
      amountFrom: 13,
      to: await getNewAddress(container),
      tokenTo: 'LOO'
    }, 'direct')
    await expect(promise)
      .rejects
      .toThrow('RpcApiError: \'Direct pool pair not found. ' +
        'Use \'auto\' mode to use composite swap.\', code: -32600, method: testpoolswap')
  })

  it('should return swap path when verbose=true', async () => {
    // Create FOO-DFI pool and add liquidity
    const tokenAddress = await getNewAddress(container)
    await createToken(container, 'FOO')
    await mintTokens(container, 'FOO')
    await createPoolPair(container, 'FOO', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'FOO',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: tokenAddress
    })

    const metadata = {
      from: await getNewAddress(container),
      to: tokenAddress,
      tokenFrom: 'FOO',
      tokenTo: 'DFI',
      amountFrom: 666
    }
    const testResult = await client.poolpair.testPoolSwap<string>(metadata, 'direct')
    const testResultVerbose = await client.poolpair.testPoolSwap<EstimatedCompositePath>(metadata, 'direct', true)

    const amount = testResult.split('@')[0]
    const amountFromVerbose = testResult.split('@')[0]
    expect(amount).toStrictEqual('199.87995198')
    expect(amountFromVerbose).toStrictEqual(amount)
    expect(testResultVerbose.path).toStrictEqual('direct')
    expect(testResultVerbose.pools).toStrictEqual(['20'])
  })
})
