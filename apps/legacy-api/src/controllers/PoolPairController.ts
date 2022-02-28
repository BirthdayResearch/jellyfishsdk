import { Controller, Get, Query } from '@nestjs/common'
import { PoolPairData, PoolSwap } from '@defichain/whale-api-client/dist/api/poolpairs'
import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider'
import { NetworkValidationPipe, SupportedNetwork } from '../pipes/NetworkValidationPipe'
import BigNumber from 'bignumber.js'
import { ApiPagedResponse } from '@defichain/whale-api-client'
import { getVolumeH24InTokens } from '../../../libs/utils/tokenomics'

@Controller('v1')
export class PoolPairController {
  constructor (private readonly whaleApiClientProvider: WhaleApiClientProvider) {
  }

  @Get('getpoolpair')
  async getToken (
    @Query('network', NetworkValidationPipe) network: SupportedNetwork = 'mainnet',
    @Query('id') poolPairId: string
  ): Promise<LegacyPoolPairData> {
    const api = this.whaleApiClientProvider.getClient(network)

    return reformatPoolPairData(await api.poolpairs.get(poolPairId))
  }

  @Get('listpoolpairs')
  async listPoolPairs (
    @Query('network', NetworkValidationPipe) network: SupportedNetwork = 'mainnet'
  ): Promise<{ [key: string]: LegacyPoolPairData }> {
    const api = this.whaleApiClientProvider.getClient(network)

    const data: PoolPairData[] = await api.poolpairs.list(200)

    const results: { [key: string]: LegacyPoolPairData } = {}
    data.forEach(token => {
      results[token.id] = reformatPoolPairData(token)
    })
    return results
  }

  @Get('listswaps')
  async listSwaps (
    @Query('network', NetworkValidationPipe) network: SupportedNetwork = 'mainnet'
  ): Promise<LegacyListSwapsResponse> {
    const api = this.whaleApiClientProvider.getClient(network)

    const result: LegacyListSwapsResponse = {}
    const poolPairs = await api.poolpairs.list(200)
    for (const poolPair of poolPairs) {
      const {
        tokenA: base,
        tokenB: quote
      } = poolPair

      const [baseVolume, quoteVolume] = this.getVolumes(poolPair)

      const pairKey = base.symbol + '_' + quote.symbol
      result[pairKey] = {
        base_id: base.id,
        base_name: base.symbol,
        base_symbol: base.symbol,
        quote_id: quote.id,
        quote_name: quote.symbol,
        quote_symbol: quote.symbol,
        last_price: poolPair.priceRatio.ab,
        base_volume: baseVolume.toNumber(),
        quote_volume: quoteVolume.toNumber(),
        isFrozen: (poolPair.status) ? 0 : 1
      }
    }
    return result
  }

  @Get('getsubgraphswaps')
  async getSubgraphSwaps (
    @Query('network', NetworkValidationPipe) network: SupportedNetwork = 'mainnet',
    @Query('limit') limit: number = 100
  ): Promise<LegacySubgraphSwapsResponse> {
    const api = this.whaleApiClientProvider.getClient(network)

    limit = Math.min(100, limit)

    // Get a few poolswaps from each poolpair, limiting the number of objects to return
    const swaps: LegacySubgraphSwap[] = []

    const poolPairs: ApiPagedResponse<PoolPairData> = await api.poolpairs.list(200)

    for (const poolPair of poolPairs) {
      if (swaps.length >= limit) {
        break
      }

      const poolSwaps: ApiPagedResponse<PoolSwap> = await api.poolpairs.listPoolSwaps(
        poolPair.id,
        Math.round(Math.max(1, limit / poolPairs.length)) // at least 1 from each poolpair
      )

      for (const poolSwap of poolSwaps) {
        const {
          volumeH24InTokenA,
          volumeH24InTokenB
        } = getVolumeH24InTokens(poolPair)

        if (swaps.length >= limit) {
          break
        }

        swaps.push({
          id: poolSwap.txid,
          pair: {
            fromToken: {
              decimals: 8,
              symbol: poolPair.tokenA.symbol,
              tradeVolume: volumeH24InTokenA.toFixed(8)
            },
            toToken: {
              decimals: 8,
              symbol: poolPair.tokenB.symbol,
              tradeVolume: volumeH24InTokenB.toFixed(8)
            }
          },
          timestamp: poolSwap.block.medianTime.toFixed(),
          fromAmount: poolSwap.fromAmount,
          toAmount: 'TODO' // TODO(eli-lim): compute from price ratio?
        })
      }
    }

    return { data: { swaps } }
  }

  getVolumes (poolPair: PoolPairData): [BigNumber, BigNumber] {
    const poolPairVolumeInUsd = new BigNumber(poolPair.volume?.h24 ?? 0)

    // vol in token = vol in usd * (usd per 1 token)
    const volumeInBase = poolPairVolumeInUsd.times(
      this.usdToTokenConversionRate(
        poolPair.tokenA.reserve,
        poolPair.totalLiquidity.usd ?? 1
      )
    )
    const volumeInQuote = poolPairVolumeInUsd.times(
      this.usdToTokenConversionRate(
        poolPair.tokenB.reserve,
        poolPair.totalLiquidity.usd ?? 1
      )
    )
    // console.log(`${poolPairVolumeInUsd} USD = ${volumeInBase} ${poolPair.tokenA.symbol}`)
    // console.log(`${poolPairVolumeInUsd} USD = ${volumeInQuote} ${poolPair.tokenB.symbol}`)
    return [volumeInBase, volumeInQuote]
  }

  /**
   * Derive from totalLiquidity in USD and token's reserve
   * BTC in USD = totalLiquidity in USD / (BTC.reserve * 2)
   * USD in BTC = (BTC.reserve * 2) / totalLiquidity in USD
   * @param tokenReserve
   * @param totalLiquidityInUsd
   */
  usdToTokenConversionRate (tokenReserve: string | number, totalLiquidityInUsd: string | number): BigNumber {
    return new BigNumber(tokenReserve).times(2)
      .div(new BigNumber(totalLiquidityInUsd))
  }
}

interface LegacyPoolPairData {
  'symbol': string
  'name': string
  'status': boolean
  'idTokenA': string
  'idTokenB': string
  'reserveA': string
  'reserveB': string
  'commission': number
  'totalLiquidity': number
  'reserveA/reserveB': number
  'reserveB/reserveA': number
  'tradeEnabled': boolean
  'ownerAddress': string
  'blockCommissionA': number
  'blockCommissionB': number
  'rewardPct': number
  // 'rewardLoanPct': number
  'creationTx': string
  'creationHeight': number
  'totalLiquidityLpToken': string
  // 'yearlyPoolReward': number
  // 'apy': number
  // 'priceB': number
  'tokenASymbol': string
  'tokenBSymbol': string
  // 'volumeA': number
  // 'volumeB': number
  // 'volumeA30': number
  // 'volumeB30': number
}

function reformatPoolPairData (data: PoolPairData): LegacyPoolPairData {
  return {
    symbol: data.symbol,
    name: data.name,
    status: data.status,
    idTokenA: data.tokenA.id,
    idTokenB: data.tokenB.id,
    reserveA: data.tokenA.reserve,
    reserveB: data.tokenB.reserve,
    commission: Number(data.commission),
    totalLiquidity: Number(data.totalLiquidity.usd),
    'reserveA/reserveB': Number(data.priceRatio.ab),
    'reserveB/reserveA': Number(data.priceRatio.ba),
    tradeEnabled: data.tradeEnabled,
    ownerAddress: data.ownerAddress,
    blockCommissionA: Number(data.tokenA.blockCommission),
    blockCommissionB: Number(data.tokenB.blockCommission),
    rewardPct: Number(data.rewardPct),
    creationTx: data.creation.tx,
    creationHeight: Number(data.creation.height),
    totalLiquidityLpToken: data.totalLiquidity.token,
    tokenASymbol: data.tokenA.symbol,
    tokenBSymbol: data.tokenB.symbol
  }
}

/**
 * Follows the specification of CMC for the /ticker endpoint, but also includes additional fields
 * @see https://support.coinmarketcap.com/hc/en-us/articles/360043659351-Listings-Criteria
 * @see https://docs.google.com/document/d/1S4urpzUnO2t7DmS_1dc4EL4tgnnbTObPYXvDeBnukCg/edit#bookmark=kix.9r12wiruqkw4
 */
interface LegacyListSwapsResponse {
  [key: string]: LegacySwapData
}

interface LegacySwapData {
  base_id: string
  base_name: string
  base_symbol: string
  quote_id: string
  quote_name: string
  quote_symbol: string
  last_price: string
  base_volume: number
  quote_volume: number
  isFrozen: 0 | 1
}

interface LegacySubgraphSwapsResponse {
  data: {
    swaps: LegacySubgraphSwap[]
  }
}

interface LegacySubgraphSwap {
  id: string
  timestamp: string
  fromAmount: string
  toAmount: string
  pair: {
    fromToken: Token
    toToken: Token
  }
}

interface Token {
  decimals: number
  symbol: string
  tradeVolume: string
}
