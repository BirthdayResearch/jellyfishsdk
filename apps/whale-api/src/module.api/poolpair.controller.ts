import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from './_core/api.paged.response'
import { DeFiDCache } from './cache/defid.cache'
import {
  AllSwappableTokensResult,
  BestSwapPathResult, DexPricesResult,
  PoolPairData,
  PoolSwapAggregatedData,
  PoolSwapData,
  SwapPathsResult
} from '@defichain/whale-api-client/dist/api/poolpairs'
import { PaginationQuery } from './_core/api.query'
import { PoolPairService } from './poolpair.service'
import { PoolSwapPathFindingService } from './poolswap.pathfinding.service'
import BigNumber from 'bignumber.js'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import { parseDATSymbol } from './token.controller'
import { PoolSwapMapper } from '../module.model/pool.swap'
import { PoolSwapAggregatedMapper } from '../module.model/pool.swap.aggregated'
import { StringIsIntegerPipe } from './pipes/api.validation.pipe'
import { PoolPairPricesService } from './poolpair.prices.service'

@Controller('/poolpairs')
export class PoolPairController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly deFiDCache: DeFiDCache,
    private readonly poolPairService: PoolPairService,
    private readonly poolSwapPathService: PoolSwapPathFindingService,
    private readonly poolPairPricesService: PoolPairPricesService,
    private readonly poolSwapMapper: PoolSwapMapper,
    private readonly poolSwapAggregatedMapper: PoolSwapAggregatedMapper
  ) {
  }

  /**
   * @param {PaginationQuery} query
   * @param {number} query.size
   * @param {string} [query.next]
   * @return {Promise<ApiPagedResponse<PoolPairData>>}
   */
  @Get('')
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PoolPairData>> {
    const result = await this.rpcClient.poolpair.listPoolPairs({
      start: query.next !== undefined ? Number(query.next) : 0,
      including_start: query.next === undefined, // TODO(fuxingloh): open issue at DeFiCh/ain, rpc_accounts.cpp#388
      limit: query.size
    }, true)

    const items: PoolPairData[] = []
    for (const [id, info] of Object.entries(result)) {
      const totalLiquidityUsd = await this.poolPairService.getTotalLiquidityUsd(info)
      const apr = await this.poolPairService.getAPR(id, info)
      const volume = await this.poolPairService.getUSDVolume(id)
      const poolPairData = await this.mapPoolPair(id, info, totalLiquidityUsd, apr, volume)
      items.push(poolPairData)
    }

    const response = ApiPagedResponse.of(items, query.size, item => {
      return item.id
    })
    response.data = response.data.filter(value => {
      return !value.symbol.startsWith('BURN-')
    })
    return response
  }

  /**
   * @param {string} id of pool pair
   * @return {Promise<PoolPairData>}
   */
  @Get('/:id')
  async get (@Param('id', ParseIntPipe) id: string): Promise<PoolPairData> {
    const info = await this.deFiDCache.getPoolPairInfo(id)
    if (info === undefined) {
      throw new NotFoundException('Unable to find poolpair')
    }

    const totalLiquidityUsd = await this.poolPairService.getTotalLiquidityUsd(info)
    const apr = await this.poolPairService.getAPR(id, info)
    const volume = await this.poolPairService.getUSDVolume(id)
    return await this.mapPoolPair(String(id), info, totalLiquidityUsd, apr, volume)
  }

  /**
   * @param {string} id poolpair id
   * @param {PaginationQuery} query
   * @param {number} query.size
   * @param {string} [query.next]
   * @return {Promise<ApiPagedResponse<PoolPairData>>}
   */
  @Get('/:id/swaps')
  async listPoolSwaps (
    @Param('id', ParseIntPipe) id: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PoolSwapData>> {
    const items = await this.poolSwapMapper.query(id, query.size, query.next)
    return ApiPagedResponse.of(items, query.size, item => {
      return item.sort
    })
  }

  /**
   * @param {string} id poolpair id
   * @param {PaginationQuery} query with size restricted to 20
   * @param {number} query.size
   * @param {string} [query.next]
   * @return {Promise<ApiPagedResponse<PoolSwapData>>}
   */
  @Get('/:id/swaps/verbose')
  async listPoolSwapsVerbose (
    @Param('id', ParseIntPipe) id: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PoolSwapData>> {
    query.size = query.size > 20 ? 20 : query.size
    const items: PoolSwapData[] = await this.poolSwapMapper.query(id, query.size, query.next)

    for (const swap of items) {
      const fromTo = await this.poolPairService.findSwapFromTo(swap.block.height, swap.txid, swap.txno)
      swap.from = fromTo?.from
      swap.to = fromTo?.to
      swap.type = await this.poolPairService.checkSwapType(swap)
    }

    return ApiPagedResponse.of(items, query.size, item => {
      return item.sort
    })
  }

  /**
   * Get a list of pool swap aggregated of an interval bucket.
   * Using query.next (also known as less than or max) as unix time seconds to pagination across interval time slices.
   *
   * @param {string} id poolpair id
   * @param {string} interval interval
   * @param {PaginationQuery} query
   * @param {number} query.size
   * @param {string} [query.next]
   * @return {Promise<ApiPagedResponse<PoolSwapAggregatedData>>}
   */
  @Get('/:id/swaps/aggregate/:interval')
  async listPoolSwapAggregates (
    @Param('id', ParseIntPipe) id: string,
      @Param('interval', ParseIntPipe) interval: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PoolSwapAggregatedData>> {
    const lt = query.next === undefined ? undefined : parseInt(query.next)
    const aggregates = await this.poolSwapAggregatedMapper.query(`${id}-${interval}`, query.size, lt)
    const mapped: Array<Promise<PoolSwapAggregatedData>> = aggregates.map(async value => {
      return {
        ...value,
        aggregated: {
          amounts: value.aggregated.amounts,
          usd: await this.poolPairService.getAggregatedInUSD(value)
        }
      }
    })

    const result = await Promise.all(mapped)
    return ApiPagedResponse.of(result, query.size, item => {
      return `${item.bucket}`
    })
  }

  @Get('/paths/swappable/:tokenId')
  async listSwappableTokens (
    @Param('tokenId', StringIsIntegerPipe) tokenId: string
  ): Promise<AllSwappableTokensResult> {
    return await this.poolSwapPathService.getAllSwappableTokens(tokenId)
  }

  @Get('/paths/from/:fromTokenId/to/:toTokenId')
  async listPaths (
    @Param('fromTokenId', StringIsIntegerPipe) fromTokenId: string,
      @Param('toTokenId', StringIsIntegerPipe) toTokenId: string
  ): Promise<SwapPathsResult> {
    return await this.poolSwapPathService.getAllSwapPaths(fromTokenId, toTokenId)
  }

  @Get('/paths/best/from/:fromTokenId/to/:toTokenId')
  async getBestPath (
    @Param('fromTokenId', StringIsIntegerPipe) fromTokenId: string,
      @Param('toTokenId', StringIsIntegerPipe) toTokenId: string
  ): Promise<BestSwapPathResult> {
    return await this.poolSwapPathService.getBestPath(fromTokenId, toTokenId)
  }

  @Get('/dexprices')
  async listDexPrices (
    @Query('denomination') denomination: string
  ): Promise<DexPricesResult> {
    return await this.poolPairPricesService.listDexPrices(denomination)
  }

  async mapPoolPair (
    id: string,
    info: PoolPairInfo,
    totalLiquidityUsd?: BigNumber,
    apr?: PoolPairData['apr'],
    volume?: PoolPairData['volume']
  ): Promise<PoolPairData> {
    const [symbolA, symbolB] = info.symbol.split('-')
    const nameTokenA = (await this.deFiDCache.getTokenInfo(info.idTokenA) as TokenInfo).name
    const nameTokenB = (await this.deFiDCache.getTokenInfo(info.idTokenB) as TokenInfo).name

    return {
      id: id,
      symbol: info.symbol,
      displaySymbol: `${parseDATSymbol(symbolA)}-${parseDATSymbol(symbolB)}`,
      name: info.name,
      status: info.status,
      tokenA: {
        symbol: symbolA,
        displaySymbol: parseDATSymbol(symbolA),
        id: info.idTokenA,
        name: nameTokenA,
        reserve: info.reserveA.toFixed(),
        blockCommission: info.blockCommissionA.toFixed(),
        fee: info.dexFeePctTokenA !== undefined
          ? {
              pct: info.dexFeePctTokenA?.toFixed(),
              inPct: info.dexFeeInPctTokenA?.toFixed(),
              outPct: info.dexFeeOutPctTokenA?.toFixed()
            }
          : undefined
      },
      tokenB: {
        symbol: symbolB,
        displaySymbol: parseDATSymbol(symbolB),
        id: info.idTokenB,
        name: nameTokenB,
        reserve: info.reserveB.toFixed(),
        blockCommission: info.blockCommissionB.toFixed(),
        fee: info.dexFeePctTokenB !== undefined
          ? {
              pct: info.dexFeePctTokenB?.toFixed(),
              inPct: info.dexFeeInPctTokenB?.toFixed(),
              outPct: info.dexFeeOutPctTokenB?.toFixed()
            }
          : undefined
      },
      priceRatio: {
        ab: info['reserveA/reserveB'] instanceof BigNumber ? info['reserveA/reserveB'].toFixed() : info['reserveA/reserveB'],
        ba: info['reserveB/reserveA'] instanceof BigNumber ? info['reserveB/reserveA'].toFixed() : info['reserveB/reserveA']
      },
      commission: info.commission.toFixed(),
      totalLiquidity: {
        token: info.totalLiquidity.toFixed(),
        usd: totalLiquidityUsd?.toFixed()
      },
      tradeEnabled: info.tradeEnabled,
      ownerAddress: info.ownerAddress,
      rewardPct: info.rewardPct.toFixed(),
      rewardLoanPct: info.rewardLoanPct.toFixed(),
      customRewards: info.customRewards,
      creation: {
        tx: info.creationTx,
        height: info.creationHeight.toNumber()
      },
      apr: apr,
      volume: volume
    }
  }
}
