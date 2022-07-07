import { Controller, DefaultValuePipe, Get, Inject, Logger, ParseIntPipe, Query } from '@nestjs/common'
import { PoolPairData } from '@defichain/whale-api-client/dist/api/poolpairs'
import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider'
import { NetworkValidationPipe, SupportedNetwork } from '../pipes/NetworkValidationPipe'
import BigNumber from 'bignumber.js'
import { Block } from '@defichain/whale-api-client/dist/api/blocks'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { fetch } from 'cross-fetch'

@Controller('v1')
export class PoolPairController {
  private readonly logger = new Logger(PoolPairController.name)

  constructor (
    private readonly whaleApiClientProvider: WhaleApiClientProvider,
    @Inject('OCEAN_ENDPOINT') private readonly oceanEndpoint: string
  ) {
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

      const [baseVolume, quoteVolume] = getVolumes(poolPair)

      const pairKey = `${base.symbol}_${quote.symbol}`
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
    @Query('limit', new DefaultValuePipe(20), new ParseIntPipe()) limit: number = 20,
    @Query('next') nextString?: string
  ): Promise<LegacySubgraphSwapsResponse> {
    const url = new URL(`${this.oceanEndpoint}/${network}/legacy/getsubgraphswaps`)
    url.searchParams.set('limit', limit.toString())
    if (nextString !== undefined) {
      url.searchParams.set('next', nextString)
    }

    return await fetch(url.toString())
      .then(async res => await res.json() as LegacySubgraphSwapsResponse)
  }

  @Get('listyieldfarming')
  async listYieldFarming (
    @Query('network', NetworkValidationPipe) network: SupportedNetwork = 'mainnet'
  ): Promise<LegacyListYieldFarmingData> {
    const api = this.whaleApiClientProvider.getClient(network)

    const [stats, poolPairs] = await Promise.all([
      api.stats.get(),
      api.poolpairs.list(200)
    ])

    return {
      pools: poolPairs.map(mapPoolPairsToLegacyYieldFarmingPool),
      provider: 'Defichain',
      provider_logo: 'https://defichain.com/downloads/symbol-defi-blockchain.svg',
      provider_URL: 'https://defichain.com',
      tvl: stats.tvl.total,
      links: [
        {
          title: 'Twitter',
          link: 'https://twitter.com/defichain'
        },
        {
          title: 'YouTube',
          link: 'https://www.youtube.com/DeFiChain'
        },
        {
          title: 'Reddit',
          link: 'https://reddit.com/r/defiblockchain'
        },
        {
          title: 'Telegram',
          link: 'https://t.me/defiblockchain'
        },
        {
          title: 'LinkedIn',
          link: 'https://www.linkedin.com/company/defichain'
        },
        {
          title: 'Facebook',
          link: 'https://www.facebook.com/defichain.official'
        },
        {
          title: 'GitHub',
          link: 'https://github.com/DeFiCh'
        },
        {
          title: 'Discord',
          link: 'https://discord.com/invite/py55egyaGy'
        }
      ]
    }
  }

  async isRecentBlock (api: WhaleApiClient, block: Block): Promise<boolean> {
    const chainHeight = (await api.stats.get()).count.blocks
    return chainHeight - block.height <= 2
  }
}

@Controller('v2')
export class PoolPairControllerV2 {
  constructor (private readonly whaleApiClientProvider: WhaleApiClientProvider) {
  }

  /**
   * Fixes the implementation in v1 - inverting the last_price
   */
  @Get('listswaps')
  async listSwaps (
    @Query('network', NetworkValidationPipe) network: SupportedNetwork = 'mainnet'
  ): Promise<LegacyListSwapsResponse> {
    const api = this.whaleApiClientProvider.getClient(network)

    const result: LegacyListSwapsResponse = {}
    const poolPairs = await api.poolpairs.list(200)

    // quote and base are intentionally reversed to conform to the current api requirements
    for (const poolPair of poolPairs) {
      const {
        tokenA: base,
        tokenB: quote
      } = poolPair

      const [baseVolume, quoteVolume] = getVolumes(poolPair)

      const pairKey = `${base.symbol}_${quote.symbol}`
      result[pairKey] = {
        base_id: base.id,
        base_name: base.symbol,
        base_symbol: base.symbol,
        quote_id: quote.id,
        quote_name: quote.symbol,
        quote_symbol: quote.symbol,
        last_price: poolPair.priceRatio.ba, // inverted from v1
        base_volume: baseVolume.toNumber(),
        quote_volume: quoteVolume.toNumber(),
        isFrozen: (poolPair.status) ? 0 : 1
      }
    }
    return result
  }
}

function getVolumes (poolPair: PoolPairData): [BigNumber, BigNumber] {
  const poolPairVolumeInUsd = new BigNumber(poolPair.volume?.h24 ?? 0)

  const volumeInQuote = poolPairVolumeInUsd.times(
    usdToTokenConversionRate(
      poolPair.tokenA.reserve,
      poolPair.totalLiquidity.usd ?? 1
    )
  )
  // vol in token = vol in usd * (usd per 1 token)
  const volumeInBase = poolPairVolumeInUsd.times(
    usdToTokenConversionRate(
      poolPair.tokenB.reserve,
      poolPair.totalLiquidity.usd ?? 1
    )
  )

  return [volumeInQuote, volumeInBase]
}

/**
 * Derive from totalLiquidity in USD and token's reserve
 * BTC in USD = totalLiquidity in USD / (BTC.reserve * 2)
 * USD in BTC = (BTC.reserve * 2) / totalLiquidity in USD
 * @param tokenReserve
 * @param totalLiquidityInUsd
 */
function usdToTokenConversionRate (tokenReserve: string | number, totalLiquidityInUsd: string | number): BigNumber {
  return new BigNumber(tokenReserve).times(2)
    .div(new BigNumber(totalLiquidityInUsd))
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
    totalLiquidity: Number(data.totalLiquidity.usd ?? 0),
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

function mapPoolPairsToLegacyYieldFarmingPool (poolPair: PoolPairData): LegacyListYieldFarmingPool {
  return {
    // Identity
    pair: poolPair.symbol,
    name: poolPair.name,
    pairLink: `https://defiscan.live/tokens/${poolPair.id}`,
    logo: 'https://defichain.com/downloads/symbol-defi-blockchain.svg',

    // Tokenomics
    apr: poolPair.apr?.total ?? 0,
    totalStaked: Number(poolPair.totalLiquidity.usd ?? 0),
    poolRewards: ['DFI']
  }
}

interface LegacyListYieldFarmingData {
  pools: LegacyListYieldFarmingPool[]
  provider: string
  provider_logo: string
  provider_URL: string
  tvl: number
  links: Array<{
    title: string
    link: string
  }>
}

interface LegacyListYieldFarmingPool {
  name: string
  pair: string
  pairLink: string
  logo: string
  poolRewards: string[]
  apr: number
  totalStaked: number
}

interface LegacySubgraphSwapsResponse {
  data: {
    swaps: LegacySubgraphSwap[]
  }
  page?: {
    next: string
  }
}

interface NextToken {
  height?: string
  order?: string
}

interface LegacySubgraphSwap {
  id: string
  timestamp: string
  from: LegacySubgraphSwapFromTo
  to: LegacySubgraphSwapFromTo
}

interface LegacySubgraphSwapFromTo {
  amount: string
  symbol: string
}

export function encodeBase64 (next: NextToken): string {
  return Buffer.from(JSON.stringify(next), 'utf8').toString('base64url')
}

export interface BlockTxn {
  swap: LegacySubgraphSwap | null
  height: number
  order: number
}
