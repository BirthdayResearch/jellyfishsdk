import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PoolPairData } from '@whale-api-client/api/poolpair'

@Injectable()
export class PoolPairInfoCache {
  static TTL_SECONDS = 600

  constructor (
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    protected readonly rpcClient: JsonRpcClient
  ) {
  }

  /**
   * Get poolpair from cache
   *
   * @param {string} id
   * @return {Promise<PoolPairData | undefined>}
   */
  async get (id: string): Promise<PoolPairData | undefined> {
    return await this.cacheManager.get<PoolPairData>(id)
  }

  /**
   * Set poolpair in cache
   *
   * @param {string} id
   * @return {Promise<void>}
   */
  async set (id: string, PoolPairData: PoolPairData): Promise<void> {
    await this.cacheManager.set(id, PoolPairData, {
      ttl: PoolPairInfoCache.TTL_SECONDS
    })
  }
}
