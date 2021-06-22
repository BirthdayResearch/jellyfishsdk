import { NotFoundException, Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { PoolPairData } from '@whale-api-client/api/poolpair'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'

@Controller('/v1/:network/poolpairs')
export class PoolPairController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly deFiDCache: DeFiDCache
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
   * @param {string} id of pool pair
   * @return {Promise<PoolPairData>}
   */
  @Get('/:id')
  async get (@Param('id', ParseIntPipe) id: string): Promise<PoolPairData> {
    const info = await this.deFiDCache.getPoolPairInfo(id)
    if (info === undefined) {
      throw new NotFoundException('Unable to find poolpair')
    }
    return mapPoolPair(String(id), info)
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
      reserve: poolPairInfo.reserveA.toFixed(),
      blockCommission: poolPairInfo.blockCommissionA.toFixed()
    },
    tokenB: {
      id: poolPairInfo.idTokenB,
      reserve: poolPairInfo.reserveB.toFixed(),
      blockCommission: poolPairInfo.blockCommissionB.toFixed()
    },
    commission: poolPairInfo.commission.toFixed(),
    totalLiquidity: poolPairInfo.totalLiquidity.toFixed(),
    tradeEnabled: poolPairInfo.tradeEnabled,
    ownerAddress: poolPairInfo.ownerAddress,
    rewardPct: poolPairInfo.rewardPct.toFixed(),
    customRewards: poolPairInfo.customRewards?.toFixed(),
    creation: {
      tx: poolPairInfo.creationTx,
      height: poolPairInfo.creationHeight.toNumber()
    }
  }
}
