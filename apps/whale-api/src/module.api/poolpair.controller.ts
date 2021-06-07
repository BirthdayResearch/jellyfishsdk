import { BadRequestException, NotFoundException, Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PoolPairInfoCache } from '@src/module.api/cache/poolpair.info.cache'
import { PoolPairData } from '@whale-api-client/api/poolpair'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'

@Controller('/v1/:network/poolpairs')
export class PoolPairController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly poolPairInfoCache: PoolPairInfoCache
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
    const poolPairResult = await this.rpcClient.poolpair.listPoolPairs({
      start: query.next !== undefined ? Number(query.next) : 0,
      including_start: query.next === undefined, // TODO(fuxingloh): open issue at DeFiCh/ain, rpc_accounts.cpp#388
      limit: query.size
    }, true)

    const poolPairInfosDto = Object.entries(poolPairResult).map(([id, value]) => {
      return mapPoolPair(id, value)
    }).sort(a => Number.parseInt(a.id))

    return ApiPagedResponse.of(poolPairInfosDto, query.size, item => {
      return item.id
    })
  }

  /**
   * @param {string} id
   * @return {Promise<poolPairData>}
   */
  @Get('/:id')
  async get (@Param('id', ParseIntPipe) id: string): Promise<PoolPairData> {
    let poolPairData = await this.poolPairInfoCache.get(id)
    if (poolPairData !== undefined) {
      return poolPairData
    }

    try {
      const poolPairResult = await this.rpcClient.poolpair.getPoolPair(id)
      poolPairData = mapPoolPair(String(id), poolPairResult[id])
      await this.poolPairInfoCache.set(id, poolPairData)
      return poolPairData
    } catch (e) {
      /* istanbul ignore else */
      if (e.payload.message === 'Pool not found') {
        throw new NotFoundException('Unable to find poolpair')
      } else {
        throw new BadRequestException(e)
      }
    }
  }
}

function mapPoolPair (id: string, poolPairInfo: PoolPairInfo): PoolPairData {
  return {
    id,
    symbol: poolPairInfo.symbol,
    name: poolPairInfo.name,
    status: poolPairInfo.status,
    tokenA: {
      id: poolPairInfo.idTokenA,
      reserve: poolPairInfo.reserveA,
      blockCommission: poolPairInfo.blockCommissionA
    },
    tokenB: {
      id: poolPairInfo.idTokenB,
      reserve: poolPairInfo.reserveB,
      blockCommission: poolPairInfo.blockCommissionB
    },
    commission: poolPairInfo.commission,
    totalLiquidity: poolPairInfo.totalLiquidity,
    tradeEnabled: poolPairInfo.tradeEnabled,
    ownerAddress: poolPairInfo.ownerAddress,
    rewardPct: poolPairInfo.rewardPct,
    customRewards: poolPairInfo.customRewards,
    creation: {
      tx: poolPairInfo.creationTx,
      height: poolPairInfo.creationHeight
    }
  }
}
