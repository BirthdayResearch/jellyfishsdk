import { Injectable } from '@nestjs/common'
import { Cache, caching } from 'cache-manager'

interface CacheOption {
  ttl?: number
}

/**
 * A cache intentionally separated from the global singleton cache manager
 * shared among services in whale; to eliminate cache "competition" as the legacy
 * services generally require caching more objects.
 */
@Injectable()
export class LegacyCache {
  // An encapsulated cache that is not dependent on global CacheModule
  // which the other services depend on
  private readonly cacheManager: Cache = caching({
    store: 'memory',
    ttl: 600, // 10m
    max: 10_000
  })

  /**
   * Get from cache, providing a fetch interface if cache miss.
   *
   * @param {string} key to get from cache
   * @param {(id: string) => Promise<T | null>} fetch if miss cache
   * @param {GlobalCache} options
   * @param {number} [options.ttl=600] cache ttl, 600 seconds
   * @return {Promise<T | null>}
   */
  async get<T> (
    key: string,
    fetch: (id: string) => Promise<T>,
    options: CacheOption = {}
  ): Promise<T> {
    const cached = await this.cacheManager.get<T>(key)
    if (cached !== undefined) {
      return cached
    }

    const fetched = await fetch(key)
    await this.cacheManager.set(key, fetched, {
      ttl: options.ttl ?? 600
    })
    return fetched
  }
}
