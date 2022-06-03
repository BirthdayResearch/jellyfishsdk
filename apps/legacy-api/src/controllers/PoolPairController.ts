import { Controller, Get, Inject, Injectable, Logger, Query } from '@nestjs/common'
import { PoolPairData } from '@defichain/whale-api-client/dist/api/poolpairs'
import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider'
import { NetworkValidationPipe, SupportedNetwork } from '../pipes/NetworkValidationPipe'
import BigNumber from 'bignumber.js'
import { Transaction, TransactionVout } from '@defichain/whale-api-client/dist/api/transactions'
import {
  CCompositeSwap,
  CompositeSwap,
  CPoolSwap,
  OP_DEFI_TX,
  PoolSwap,
  toOPCodes
} from '@defichain/jellyfish-transaction'
import { SmartBuffer } from 'smart-buffer'
import { AccountHistory } from '@defichain/jellyfish-api-core/src/category/account'
import { fromScript } from '@defichain/jellyfish-address'
import { Interval } from '@nestjs/schedule'
import { SimpleCache } from '../cache/SimpleCache'
import { Block } from '@defichain/whale-api-client/dist/api/blocks'
import { WhaleApiClient } from '@defichain/whale-api-client'

@Controller('v1')
export class PoolPairController {
  private readonly logger = new Logger(PoolPairController.name)
  constructor (
    private readonly whaleApiClientProvider: WhaleApiClientProvider,
    private readonly cache: SimpleCache
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
    @Query('limit') limit: number = 30,
    @Query('next') nextString?: string
  ): Promise<LegacySubgraphSwapsResponse> {
    limit = Math.min(100, limit)
    const nextToken: NextToken = (nextString !== undefined)
      ? decodeNextToken(nextString)
      : {}

    const {
      swaps,
      next
    } = await this.getSwapsHistory(network, limit, nextToken)

    return {
      data: { swaps: swaps },
      page: {
        next: encodeBase64(next)
      }
    }
  }

  async getSwapsHistory (network: SupportedNetwork, limit: number, next: NextToken): Promise<{ swaps: LegacySubgraphSwap[], next: NextToken }> {
    const api = this.whaleApiClientProvider.getClient(network)
    const allSwaps: LegacySubgraphSwap[] = []

    while (allSwaps.length <= limit) {
      for (const block of await api.blocks.list(200, next?.height)) {
        let blockTxns = []

        // don't cache if within 2 blocks from tip, as block might be invalidated / swaps might be added
        if (await this.isRecentBlock(api, block)) {
          blockTxns = await this.getBlockTransactionsWithNonSwapsAsNull(block, network, next)
        } else {
          blockTxns = await this.cache.get<BlockTxn[]>(
            block.hash,
            async () => {
              const cached = await this.getBlockTransactionsWithNonSwapsAsNull(block, network, next)
              if (cached.length > 0) {
                const swapCount = cached.reduce(
                  (count, txn) => txn.swap === null ? count : count + 1,
                  0
                )
                this.logger.log(`[${network}] Block ${block.height} - cached ${swapCount} swaps`)
              }
              return cached
            },
            {
              ttl: 24 * 60 * 60
            }
          )
        }

        for (let i = Number(next.order ?? '0'); i < blockTxns.length; i++) {
          const blockTxn = blockTxns[i]
          if (blockTxn.swap === null) {
            continue
          }
          allSwaps.push(blockTxn.swap)

          const isLastSwapInBlock = ((i + 1) === blockTxns.length)
          if (isLastSwapInBlock) {
            // Pagination fix: since this is the last swap in the block, we will point
            // the pagination cursor to skip the current block. We also reset 'order' to 0
            // (the start of the block).
            next = {
              height: block.height.toString(),
              order: '0'
            }
          } else {
            // Pagination fix: since this isn't the last pool swap in the block,
            // we move the cursor to the previous block (1 above), as there might still be
            // pool swaps in the current block, and we don't want to skip them (setting
            // the next.height value to N will result in block N being skipped).
            next = {
              height: (blockTxn.height + 1).toString(),
              order: blockTxn.order.toString()
            }
          }

          if (allSwaps.length === limit) {
            this.logger.debug(`[${network}] Block ${block.height} - pagination ${JSON.stringify(next)}`)
            return {
              swaps: allSwaps,
              next: next
            }
          }
        }

        // Move cursor to next block, as we're done with it
        next = {
          height: block.height.toString(),
          order: '0'
        }
      }
    }
    // Highly unlikely to reach here, but for completeness
    return {
      swaps: allSwaps,
      next
    }
  }

  private async getBlockTransactionsWithNonSwapsAsNull (
    block: Block,
    network: SupportedNetwork,
    next: NextToken
  ): Promise<BlockTxn[]> {
    const api = this.whaleApiClientProvider.getClient(network)
    const swaps: BlockTxn[] = []
    for (const transaction of await api.blocks.getTransactions(block.hash, 200, next?.order)) {
      const swap = await this.getSwapFromTransaction(transaction, network)
      swaps.push({
        swap: swap,
        height: transaction.block.height,
        order: transaction.order
      })
    }
    return swaps
  }

  /**
   * Caches at the transaction level, so that we can avoid calling expensive rpc calls for newer blocks
   */
  private async getSwapFromTransaction (transaction: Transaction, network: SupportedNetwork): Promise<LegacySubgraphSwap | null> {
    return await this.cache.get<LegacySubgraphSwap | null>(transaction.txid, async () => {
      const api = this.whaleApiClientProvider.getClient(network)

      if (transaction.voutCount !== 2) {
        return null
      }
      if (transaction.weight === 605) {
        return null
      }

      const vouts = await api.transactions.getVouts(transaction.txid, 1)
      const dftx = findPoolSwapDfTx(vouts)
      if (dftx === undefined) {
        return null
      }

      const swap = await this.findSwap(network, dftx, transaction)
      if (swap === undefined) {
        return null
      }

      return swap
    }, {
      ttl: 24 * 60 * 60
    })
  }

  async findSwap (network: SupportedNetwork, poolSwap: PoolSwap, transaction: Transaction): Promise<LegacySubgraphSwap | undefined> {
    const api = this.whaleApiClientProvider.getClient(network)
    const fromAddress = fromScript(poolSwap.fromScript, network)?.address
    const toAddress = fromScript(poolSwap.toScript, network)?.address

    if (
      toAddress === undefined || toAddress === '' ||
      fromAddress === undefined || fromAddress === ''
    ) {
      return undefined
    }

    const fromHistory: AccountHistory = await api.rpc.call<AccountHistory>('getaccounthistory', [fromAddress, transaction.block.height, transaction.order], 'number')
    let toHistory: AccountHistory
    if (toAddress === fromAddress) {
      toHistory = fromHistory
    } else {
      toHistory = await api.rpc.call<AccountHistory>('getaccounthistory', [toAddress, transaction.block.height, transaction.order], 'number')
    }

    const from = findAmountSymbol(fromHistory, true)
    const to = findAmountSymbol(toHistory, false)

    if (from === undefined || to === undefined) {
      return undefined
    }

    return {
      id: transaction.txid,
      timestamp: transaction.block.medianTime.toString(),
      from: from,
      to: to
    }
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

/**
 * Hits PoolPairController with requests to enable pre-fetching behaviour,
 * improving performance on queries
 */
@Injectable()
export class SwapCacheFiller {
  private readonly logger = new Logger(SwapCacheFiller.name)
  isRunning = false
  isReady = false
  isFillingCache = false

  constructor (
    private readonly poolPairController: PoolPairController,
    @Inject('SWAP_CACHE_COUNT') readonly cacheCountToBeReady: number
  ) {
  }

  onApplicationBootstrap (): void {
    this.isRunning = true
    void this.fillCache()
  }

  @Interval(30_000) // 30s
  private async fillCache (): Promise<void> {
    if (this.isRunning && !this.isFillingCache) {
      this.isFillingCache = true
      await this.followPagination('mainnet')
      this.isFillingCache = false
    }
  }

  private async followPagination (network: SupportedNetwork): Promise<void> {
    let swapsCount = 0
    let next: string | undefined
    while (swapsCount < this.cacheCountToBeReady) {
      try {
        const result: LegacySubgraphSwapsResponse = await this.poolPairController.getSubgraphSwaps(network, 30, next)
        next = result.page?.next
        swapsCount += result.data.swaps.length
      } catch (err) {
        this.logger.error(
          `${`[${network}] ` +
          'last page: '}${next !== undefined ? JSON.stringify(decodeNextToken(next)) : 'none'}`,
          err
        )
      }
    }
    this.isReady = true
    this.logger.log(`[${network}] cache is ready`)
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

function findPoolSwapDfTx (vouts: TransactionVout[]): PoolSwap | undefined {
  if (vouts.length === 0) {
    return undefined // reject because not yet indexed, cannot be found
  }

  const hex = vouts[0].script.hex
  const buffer = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
  const stack = toOPCodes(buffer)
  if (stack.length !== 2 || stack[1].type !== 'OP_DEFI_TX') {
    return undefined
  }

  const dftx = (stack[1] as OP_DEFI_TX).tx
  if (dftx === undefined) {
    return undefined
  }

  switch (dftx.name) {
    case CPoolSwap.OP_NAME:
      return (dftx.data as PoolSwap)

    case CCompositeSwap.OP_NAME:
      return (dftx.data as CompositeSwap).poolSwap

    default:
      return undefined
  }
}

function findAmountSymbol (history: AccountHistory, outgoing: boolean): LegacySubgraphSwapFromTo | undefined {
  for (const amount of history.amounts) {
    const [value, symbol] = amount.split('@')
    const isNegative = value.startsWith('-')

    if (isNegative && outgoing) {
      return {
        amount: new BigNumber(value).absoluteValue().toFixed(8),
        symbol: symbol
      }
    }

    if (!isNegative && !outgoing) {
      return {
        amount: new BigNumber(value).absoluteValue().toFixed(8),
        symbol: symbol
      }
    }
  }

  return undefined
}

export function encodeBase64 (next: NextToken): string {
  return Buffer.from(JSON.stringify(next), 'utf8').toString('base64url')
}

function decodeNextToken (nextString: string): NextToken {
  return JSON.parse(Buffer.from(nextString, 'base64url').toString())
}

export interface BlockTxn {
  swap: LegacySubgraphSwap | null
  height: number
  order: number
}
