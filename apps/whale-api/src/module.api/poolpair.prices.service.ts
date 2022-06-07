import { Injectable, Logger } from '@nestjs/common'
import { PoolSwapPathFindingService } from './poolswap.pathfinding.service'
import { TokenMapper } from '../module.model/token'
import { DeFiDCache, TokenInfoWithId } from './cache/defid.cache'
import { DexPricesResult, TokenIdentifier } from '@defichain/whale-api-client/dist/api/poolpairs'
import { parseDisplaySymbol } from './token.controller'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import { TokenResult } from '@defichain/jellyfish-api-core/dist/category/token'

@Injectable()
export class PoolPairPricesService {
  private readonly logger: Logger = new Logger(PoolSwapPathFindingService.name)

  constructor (
    private readonly poolSwapPathfindingService: PoolSwapPathFindingService,
    private readonly tokenMapper: TokenMapper,
    private readonly defidCache: DeFiDCache,
    protected readonly cache: SemaphoreCache
  ) {
  }

  async listDexPrices (denominationSymbol: string): Promise<DexPricesResult> {
    const cached = await this.cache.get<DexPricesResult>(
      `LATEST_DEX_PRICES_${denominationSymbol}`,
      async () => await this._listDexPrices(denominationSymbol),
      {
        ttl: 30 // 30s
      }
    )
    if (cached !== undefined) {
      return cached
    }
    return await this._listDexPrices(denominationSymbol)
  }

  private async _listDexPrices (denominationSymbol: string): Promise<DexPricesResult> {
    const dexPrices: DexPricesResult['dexPrices'] = {}

    // Get denomination token info
    const denominationToken = await this.getTokenBySymbol(denominationSymbol)
    if (denominationToken === undefined || this.shouldIgnoreToken(denominationToken)) {
      throw new Error(`Unexpected error: could not find token with symbol '${denominationSymbol}'`)
    }

    // Get all tokens and their info
    const allTokens: TokenInfoWithId[] = await this.getAllTokens()

    // For every token available, compute estimated return in denomination token
    for (const token of allTokens) {
      if (token.id === denominationToken.id) {
        continue
      }
      const bestPath = await this.poolSwapPathfindingService.getBestPath(token.id, denominationToken.id)
      dexPrices[token.symbol] = {
        token: mapToTokenIdentifier(token),
        denominationPrice: bestPath.estimatedReturn
      }
    }

    return {
      denomination: mapToTokenIdentifier(denominationToken),
      dexPrices
    }
  }

  /**
   * Helper to get all tokens from defid and filters them
   * @private
   * @return {Promise<TokenInfoWithId[]>}
   */
  private async getAllTokens (): Promise<TokenInfoWithId[]> {
    const tokens = await this.defidCache.getAllTokenInfo() ?? []
    return tokens.filter(token => !this.shouldIgnoreToken(token))
  }

  private async getTokenBySymbol (symbol: string): Promise<TokenInfoWithId> {
    let tokenResult: TokenResult | undefined

    try {
      tokenResult = await this.defidCache.getTokenInfoBySymbol(symbol)
    } catch (e) {
      throw new TokenSymbolNotFoundError(symbol)
    }
    if (tokenResult === undefined || Object.keys(tokenResult).length === 0) {
      throw new TokenSymbolNotFoundError(symbol)
    }
    const [id, tokenInfo] = Object.entries(tokenResult)[0]
    return { ...tokenInfo, id }
  }

  private shouldIgnoreToken (token: TokenInfoWithId): boolean {
    return token.isLPS || !token.isDAT || token.symbol === 'BURN'
  }
}

function mapToTokenIdentifier (token: TokenInfoWithId): TokenIdentifier {
  return {
    id: token.id,
    symbol: token.symbol,
    displaySymbol: parseDisplaySymbol(token)
  }
}

class TokenSymbolNotFoundError extends Error {
  constructor (symbol: string) {
    super(`Could not find token with symbol '${symbol}'`)
  }
}
