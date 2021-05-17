import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'

@Injectable()
export class TokenInfoCache {
  static TTL_SECONDS = 600

  constructor (
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    protected readonly rpcClient: JsonRpcClient
  ) {
  }

  async batch (ids: string[]): Promise<Record<string, TokenInfo>> {
    const records: Record<string, TokenInfo> = {}
    for (const id of ids) {
      const tokenInfo = await this.get(id)
      if (tokenInfo !== undefined) {
        records[id] = tokenInfo
      }
    }
    return records
  }

  async get (id: string): Promise<TokenInfo | undefined> {
    const key = `${id}`
    let tokenInfo = await this.cacheManager.get<TokenInfo>(key)

    if (tokenInfo !== undefined) {
      return tokenInfo
    }

    tokenInfo = await this.getTokenInfo(id)
    await this.cacheManager.set(key, tokenInfo, {
      ttl: TokenInfoCache.TTL_SECONDS
    })
    return tokenInfo
  }

  private async getTokenInfo (id: string): Promise<TokenInfo | undefined> {
    const result = await this.rpcClient.token.listTokens({
      including_start: true,
      limit: 1,
      start: Number.parseInt(id)
    }, true)

    const tokens = Object.values(result)
    if (tokens.length === 0) {
      return undefined
    }
    return tokens[0]
  }
}
