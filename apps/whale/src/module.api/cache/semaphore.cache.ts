import { Semaphore, SemaphoreInterface, withTimeout } from 'async-mutex'
import { CacheOption, CachePrefix, GlobalCache } from '../../module.api/cache/global.cache'
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'

@Injectable()
export class SemaphoreCache {
  static MAX_CONCURRENCY = 2
  static TIMEOUT = 45000

  protected readonly cache: GlobalCache
  protected readonly semaphores: Record<string, SemaphoreInterface> = {}

  constructor (@Inject(CACHE_MANAGER) cacheManager: Cache) {
    this.cache = new GlobalCache(cacheManager)
  }

  /**
   * Resolve from SemaphoreCache cache key via double-checked locking.
   *
   * @param {string} key to use for semaphore cache
   * @param {(id: string) => Promise<T | undefined>} fetch if miss cache
   * @param {GlobalCache} options
   */
  async get<T> (key: string, fetch: () => Promise<T | undefined>, options: CacheOption = {}): Promise<T | undefined> {
    return await this.cache.get(CachePrefix.SEMAPHORE, key, async () => {
      const semaphore = this.acquireSemaphore(key)
      return await semaphore.runExclusive(async () => {
        return await this.cache.get(CachePrefix.SEMAPHORE, key, async () => {
          return await fetch()
        }, options)
      })
    }, options)
  }

  /**
   * @param {string} key to lock cache concurrency
   */
  private acquireSemaphore (key: string): SemaphoreInterface {
    const semaphore = this.semaphores[key]
    if (semaphore === undefined) {
      this.semaphores[key] = withTimeout(new Semaphore(SemaphoreCache.MAX_CONCURRENCY), SemaphoreCache.TIMEOUT)
    }

    return this.semaphores[key]
  }
}
