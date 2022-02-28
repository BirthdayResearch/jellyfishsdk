import { PoolPairData } from '@defichain/whale-api-client/dist/api/poolpairs'
import BigNumber from 'bignumber.js'

export function getUsdVolumesInTokens (
  poolPair: PoolPairData
): {
    volumeD30InTokenA: BigNumber
    volumeD30InTokenB: BigNumber
    volumeH24InTokenB: BigNumber
    volumeH24InTokenA: BigNumber
  } {
  return {
    ...getVolumeD30InTokens(poolPair),
    ...getVolumeH24InTokens(poolPair)
  }
}

export function getVolumeH24InTokens (
  poolPair: PoolPairData
): { volumeH24InTokenB: BigNumber, volumeH24InTokenA: BigNumber } {
  const volumeH24InUsd = new BigNumber(poolPair.volume?.h24 ?? 0)

  // vol in token = vol in usd * (usd per 1 token)
  const volumeH24InTokenA = volumeH24InUsd.times(
    tokenPerUsd(
      poolPair.tokenA.reserve,
      poolPair.totalLiquidity.usd ?? 1
    )
  )
  const volumeH24InTokenB = volumeH24InUsd.times(
    tokenPerUsd(
      poolPair.tokenB.reserve,
      poolPair.totalLiquidity.usd ?? 1
    )
  )
  // console.log(`${volumeH24InUsd} USD = ${volumeH24InTokenA} ${poolPair.tokenA.symbol}`)
  // console.log(`${volumeH24InUsd} USD = ${volumeH24InTokenB} ${poolPair.tokenB.symbol}`)
  return {
    volumeH24InTokenA,
    volumeH24InTokenB
  }
}

export function getVolumeD30InTokens (
  poolPair: PoolPairData
): { volumeD30InTokenA: BigNumber, volumeD30InTokenB: BigNumber } {
  const volumeD30InUsd = new BigNumber(poolPair.volume?.d30 ?? 0)

  // vol in token = vol in usd * (usd per 1 token)
  const volumeD30InTokenA = volumeD30InUsd.times(
    tokenPerUsd(
      poolPair.tokenA.reserve,
      poolPair.totalLiquidity.usd ?? 1
    )
  )
  const volumeD30InTokenB = volumeD30InUsd.times(
    tokenPerUsd(
      poolPair.tokenB.reserve,
      poolPair.totalLiquidity.usd ?? 1
    )
  )
  // console.log(`${volumeD30InUsd} USD = ${volumeD30InTokenA} ${poolPair.tokenA.symbol}`)
  // console.log(`${volumeD30InUsd} USD = ${volumeD30InTokenB} ${poolPair.tokenB.symbol}`)
  return {
    volumeD30InTokenA,
    volumeD30InTokenB
  }
}

/**
 * Derive from totalLiquidity in USD and token's reserve
 * 1 token in USD = totalLiquidity.usd / 2(token.reserve)
 */
export function usdPerToken (
  tokenReserve: string | number,
  totalLiquidityInUsd: string | number
): BigNumber {
  return new BigNumber(totalLiquidityInUsd)
    .div(new BigNumber(tokenReserve).times(2))
}

export function tokenPerUsd (
  tokenReserve: string | number,
  totalLiquidityInUsd: string | number
): BigNumber {
  return new BigNumber(1).div(usdPerToken(tokenReserve, totalLiquidityInUsd))
}
