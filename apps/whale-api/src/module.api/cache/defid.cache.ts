import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { TokenInfo, TokenResult } from '@defichain/jellyfish-api-core/dist/category/token'
import { CachePrefix, GlobalCache } from '@defichain-apps/libs/caches'
import { PoolPairInfo, PoolPairsResult } from '@defichain/jellyfish-api-core/dist/category/poolpair'
import { GetLoanSchemeResult } from '@defichain/jellyfish-api-core/dist/category/loan'

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

  async getAllTokenInfo (): Promise<TokenInfoWithId[] | undefined> {
    return await this.get<TokenInfoWithId[]>(CachePrefix.ALL_TOKEN_INFO, '*', async () => {
      const allTokenInfo: TokenInfoWithId[] = []

      // Enrich the returned tokens with their `id`
      const tokensById = await this.fetchAllTokenInfo()
      for (const [id, token] of Object.entries(tokensById)) {
        allTokenInfo.push({ ...token, id })
      }

      return allTokenInfo
    })
  }

  private async fetchAllTokenInfo (): Promise<TokenResult> {
    return await this.rpcClient.token.listTokens({
      start: 0,
      including_start: true,
      limit: Number.MAX_SAFE_INTEGER
    })
  }

  async getLoanScheme (id: string): Promise<GetLoanSchemeResult | undefined> {
    return await this.get<GetLoanSchemeResult>(CachePrefix.LOAN_SCHEME_INFO, id, this.fetchLoanSchemeInfo.bind(this))
  }

  private async fetchLoanSchemeInfo (id: string): Promise<GetLoanSchemeResult | undefined> {
    return await this.rpcClient.loan.getLoanScheme(id)
  }

  /**
   * Retrieve poolPair info via rpc cached
   * @param {string} idOrSymbol poolPair id or symbol
   * @return {Promise<PoolPairInfoWithId | undefined>}
   */
  async getPoolPairInfo (idOrSymbol: string): Promise<PoolPairInfoWithId | undefined> {
    return await this.get<PoolPairInfoWithId>(CachePrefix.POOL_PAIR_INFO, idOrSymbol, this.fetchPoolPairInfo.bind(this))
  }

  /**
   * Retrieve poolPair info from cached list of poolPairs as getPoolPair rpc
   * tends to be more expensive
   * @param {string} id - id of the poolPair
   */
  async getPoolPairInfoFromPoolPairs (id: string): Promise<PoolPairInfo | undefined> {
    const poolPairsById = await this.getCachedPoolPairsResult(60)
    if (poolPairsById === undefined) {
      return undefined
    }
    return poolPairsById[id]
  }

  async getPoolPairs (invalidate: boolean = false): Promise<PoolPairInfoWithId[]> {
    if (invalidate) {
      await this.cacheManager.del(`${CachePrefix.POOL_PAIRS} *`)
    }

    const results = await this.getCachedPoolPairsResult(60)
    if (results === undefined) {
      return []
    }

    const poolPairInfoWithIds: PoolPairInfoWithId[] = []
    for (const [id, token] of Object.entries(results)) {
      poolPairInfoWithIds.push({ ...token, id })
    }
    return poolPairInfoWithIds
  }

  private async getCachedPoolPairsResult (ttlSeconds: number): Promise<PoolPairsResult | undefined> {
    return await this.get<PoolPairsResult>(CachePrefix.POOL_PAIRS, '*', this.fetchPoolPairs.bind(this),
      {
        ttl: ttlSeconds
      }
    )
  }

  /**
   * Retrieve poolPair info via rpc client
   * @param {string} idOrSymbol - id or symbol
   * @return {PoolPairInfoWithId | undefined}
   */
  private async fetchPoolPairInfo (idOrSymbol: string): Promise<PoolPairInfoWithId | undefined> {
    try {
      const result = await this.rpcClient.poolpair.getPoolPair(idOrSymbol)
      const [id, poolPairInfo] = Object.entries(result)[0]
      return {
        ...poolPairInfo,
        id
      }
    } catch (err: any) {
      /* istanbul ignore else */
      if (err?.payload?.message === 'Pool not found') {
        return undefined
      }
      throw err
    }
  }

  private async fetchPoolPairs (): Promise<PoolPairsResult> {
    const result: PoolPairsResult = {}
    let next: number | null = 0

    // Follow pagination chain until the end
    while (true) {
      const poolPairs: PoolPairsResult = await this.rpcClient.poolpair.listPoolPairs({
        start: next,
        including_start: next === 0, // only for the first
        limit: 1000
      }, true)

      const poolPairIds: string[] = Object.keys(poolPairs)

      // At the end of pagination chain - no more data to fetch
      if (poolPairIds.length === 0) {
        break
      }

      // Add to results
      for (const poolPairId of poolPairIds) {
        result[poolPairId] = poolPairs[poolPairId]
      }
      next = Number(poolPairIds[poolPairIds.length - 1])
    }

    return result
  }

  async getDexFees (poolPairId: string, tokenFromId: string, tokenToId: string): Promise<DexFees> {
    return await this.get<DexFees>(CachePrefix.DEX_FEES, `${poolPairId}-${tokenFromId}-${tokenToId}`, this.fetchDexFees.bind(this)) ?? {
      poolPairFee: undefined,
      tokenFromFee: undefined,
      tokenToFee: undefined
    }
  }

  private async fetchDexFees (id: string): Promise<DexFees> {
    const [poolPairId, tokenFromId, tokenToId] = id.split('-')
    const attrs = (await this.rpcClient.masternode.getGov('ATTRIBUTES')).ATTRIBUTES
    const poolPairFee = attrs[`v0/poolpairs/${poolPairId}/token_a_fee_pct`]
    const tokenFromFee = attrs[`v0/token/${tokenFromId}/dex_in_fee_pct`]
    const tokenToFee = attrs[`v0/token/${tokenToId}/dex_out_fee_pct`]

    return {
      poolPairFee,
      tokenFromFee,
      tokenToFee
    }
  }
}

// To remove if/when jellyfish-api-core supports IDs on tokenInfo, since it's commonly required
export interface TokenInfoWithId extends TokenInfo {
  id: string
}

export interface PoolPairInfoWithId extends PoolPairInfo {
  id: string
}

export interface DexFees {
  poolPairFee: string | undefined
  tokenFromFee: string | undefined
  tokenToFee: string | undefined
}
