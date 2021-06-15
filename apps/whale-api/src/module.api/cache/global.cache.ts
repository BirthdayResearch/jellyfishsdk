import { Cache } from 'cache-manager'

export class GlobalCache {
  static TTL_SECONDS = 600

  constructor (protected readonly cacheManager: Cache) {
  }

  /**
   * Batch get from cache, providing a fetch interface if cache miss.
   *
   * @param {number} prefix to prevent key collision
   * @param {string[]} ids to batch get from cache
   * @param {(id: string) => Promise<T | undefined>} fetch if miss cache
   * @return Promise<Record<string, T | undefined>>
   */
  async batch<T> (prefix: number, ids: string[], fetch: (id: string) => Promise<T | undefined>): Promise<Record<string, T | undefined>> {
    const records: Record<string, T | undefined> = {}
    for (const id of ids) {
      records[id] = await this.get(prefix, id, fetch)
    }
    return records
  }

  /**
   * Get from cache, providing a fetch interface if cache miss.
   *
   * @param {number} prefix to prevent key collision
   * @param {string} id to get from cache
   * @param {(id: string) => Promise<T | undefined>} fetch if miss cache
   * @return {Promise<T | undefined>}
   */
  async get<T> (prefix: number, id: string, fetch: (id: string) => Promise<T | undefined>): Promise<T | undefined> {
    const key: string = `${prefix} ${id}`
    const cached = await this.cacheManager.get<T>(key)
    if (cached !== undefined) {
      return cached
    }

    const fetched = await fetch(id)

    /* istanbul ignore if  */
    if (fetched === undefined) {
      // TODO(fuxingloh): we need a circuit breaker pattern to prevent cache miss flood & poisoning
      return undefined
    }

    await this.cacheManager.set(key, fetched, {
      ttl: GlobalCache.TTL_SECONDS
    })

    return fetched
  }
}
