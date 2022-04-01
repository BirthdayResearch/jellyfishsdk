import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'

export interface CacheOption {
  ttl?: number
}

@Injectable()
export class SimpleCache {
  constructor (
    @Inject(CACHE_MANAGER) protected readonly cacheManager: Cache
  ) {
  }

  /**
   * Get from cache, providing a fetch interface if cache miss.
   *
   * @param {string} key to get from cache
   * @param {(id: string) => Promise<T | NO_VALUE>} fetch if miss cache
   * @param {GlobalCache} options
   * @param {number} [options.ttl=600] cache ttl, 600 seconds
   * @return {Promise<T | NO_VALUE>}
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

/**
 * Allows null values to be cached, to indicate that the given look-up key has no value
 * This is different from `undefined` which indicates a cache miss
 */
export const NO_VALUE = null
