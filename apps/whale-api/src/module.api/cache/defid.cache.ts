import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { TokenInfo, TokenResult } from '@defichain/jellyfish-api-core/dist/category/token'
import { CachePrefix, GlobalCache } from '@src/module.api/cache/global.cache'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'

@Injectable()
export class DeFiDCache extends GlobalCache {
  constructor (
    @Inject(CACHE_MANAGER) protected readonly cacheManager: Cache,
    protected readonly rpcClient: JsonRpcClient
  ) {
    super(cacheManager)
  }

  async batchTokenInfo (ids: string[]): Promise<Record<string, TokenInfo | undefined>> {
    return await this.batch<TokenInfo>(CachePrefix.TOKEN_INFO, ids, this.fetchTokenInfo.bind(this))
  }

  /**
   * @param {string} id numeric id of token
   */
  async getTokenInfo (id: string): Promise<TokenInfo | undefined> {
    return await this.get<TokenInfo>(CachePrefix.TOKEN_INFO, id, this.fetchTokenInfo.bind(this))
  }

  private async fetchTokenInfo (id: string): Promise<TokenInfo | undefined> {
    // You won't get not found error for this
    const result = await this.rpcClient.token.listTokens({
      including_start: true,
      limit: 1,
      start: Number.parseInt(id)
    }, true)

    return result[id]
  }

  async batchTokenInfoBySymbol (symbols: string[]): Promise<Record<string, TokenResult | undefined>> {
    return await this.batch<TokenResult>(CachePrefix.TOKEN_INFO_SYMBOL, symbols, this.fetchTokenInfoBySymbol.bind(this))
  }

  async getTokenInfoBySymbol (symbol: string): Promise<TokenResult | undefined> {
    return await this.get<TokenResult>(CachePrefix.TOKEN_INFO_SYMBOL, symbol, this.fetchTokenInfoBySymbol.bind(this))
  }

  private async fetchTokenInfoBySymbol (symbol: string): Promise<TokenResult | undefined> {
    return await this.rpcClient.token.getToken(symbol)
  }

  async getPoolPairInfo (id: string): Promise<PoolPairInfo | undefined> {
    return await this.get<PoolPairInfo>(CachePrefix.POOL_PAIR_INFO, id, this.fetchPoolPairInfo.bind(this))
  }

  private async fetchPoolPairInfo (id: string): Promise<PoolPairInfo | undefined> {
    try {
      const result = await this.rpcClient.poolpair.getPoolPair(id)
      if (result[id] === undefined) {
        return undefined
      }
      return result[id]
    } catch (err) {
      /* istanbul ignore else */
      if (err?.payload?.message === 'Pool not found') {
        return undefined
      } else {
        throw err
      }
    }
  }
}
