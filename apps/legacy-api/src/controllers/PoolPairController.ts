import { Controller, Get, Query } from '@nestjs/common'
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
import { Block } from '@defichain/whale-api-client/dist/api/blocks'

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
    @Query('limit') limit: number = 100,
    @Query('next') nextString?: string
  ): Promise<LegacySubgraphSwapsResponse> {
    limit = Math.min(100, limit)
    const next: NextToken = JSON.parse(nextString ?? '{}')
    return await this.getSwapsHistory(network, limit, next) // next encoded as json string
  }

  async getSwapsHistory (network: SupportedNetwork, limit: number, next: NextToken): Promise<LegacySubgraphSwapsResponse> {
    const api = this.whaleApiClientProvider.getClient(network)
    const swaps: LegacySubgraphSwap[] = []

    while (swaps.length <= limit) {
      for (const block of await api.blocks.list(100, next?.height)) {
        for (const transaction of await api.blocks.getTransactions(block.hash, 100, next?.order)) {
          const vouts = await api.transactions.getVouts(transaction.txid, 1)
          const dftx = findPoolSwapDfTx(vouts)
          if (dftx === undefined) {
            continue
          }

          const swap = this.findSwap(dftx, transaction, block)
          if (swap === undefined) {
            continue
          }

          swaps.push(swap)

          next = {
            height: block.height.toString(),
            order: transaction.order.toString()
          }

          if (swaps.length === limit) {
            return {
              data: swaps,
              page: {
                next: JSON.stringify(next)
              }
            }
          }
        }
      }

      if (swaps.length === 0) {
        // After 100 loops, if no data - exit immediately
        break
      }
    }

    return {
      data: swaps,
      page: {
        next: JSON.stringify(next)
      }
    }
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

  findSwap (poolSwap: PoolSwap, transaction: Transaction, block: Block): LegacySubgraphSwap | undefined {
    // this.whaleApiClientProvider.getClient()

    return {
      id: transaction.txid,
      timestamp: block.medianTime.toString(),
      from: {
        // TODO(?): Method 1: Get Symbol from AccountHistory?
        // TODO(?): Method 2: Get Symbol from poolSwap.fromTokenId Cache
        amount: poolSwap.fromAmount.toFixed(8),
        symbol: ''
      },
      to: {
        // TODO(?): Get Symbol from AccountHistory by checking destination access
        amount: '',
        symbol: ''
      }
    }
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
  data: LegacySubgraphSwap[]
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
