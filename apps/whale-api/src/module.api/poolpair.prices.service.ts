import { Injectable, Logger } from '@nestjs/common'
import { PoolSwapPathFindingService } from '@src/module.api/poolswap.pathfinding.service'
import { TokenMapper } from '@src/module.model/token'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import { DexPricesResult, TokenIdentifier } from '@whale-api-client/api/poolpairs'
import { parseDisplaySymbol } from '@src/module.api/token.controller'
import { SemaphoreCache } from '@src/module.api/cache/semaphore.cache'

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
      'LATEST_DEX_PRICES',
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

    // Do a check first to ensure the symbol provided is valid, to save on calling getAllTokens
    // for non-existent tokens
    try {
      await this.defidCache.getTokenInfoBySymbol(denominationSymbol)
    } catch (err) {
      throw new Error(`Could not find token with symbol '${denominationSymbol}'`)
    }

    // Get all tokens and their info
    const allTokensBySymbol: TokensBySymbol = await this.getAllTokens()
    const allTokens: TokenInfoWithId[] = Object.values(allTokensBySymbol)

    // Get denomination token info
    const denominationToken = allTokensBySymbol[denominationSymbol]
    if (denominationToken === undefined) {
      throw new Error(`Unexpected error: could not find token with symbol '${denominationSymbol}'`)
    }

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
   * Helper to get all tokens in a map indexed by their symbol for quick look-ups
   * @private
   * @return {Promise<TokensBySymbol>}
   */
  private async getAllTokens (): Promise<TokensBySymbol> {
    const tokens = await this.tokenMapper.query(Number.MAX_SAFE_INTEGER)
    const allTokenInfo: TokensBySymbol = {}

    for (const token of tokens) {
      // Skip LP tokens
      if (token.isLPS) {
        continue
      }

      const tokenInfo = await this.defidCache.getTokenInfo(token.tokenId.toString())
      if (tokenInfo === undefined) {
        this.logger.error(`Could not find token info for id: ${token.tokenId}`)
        continue
      }

      allTokenInfo[token.symbol] = {
        id: token.tokenId.toString(),
        ...tokenInfo
      }
    }
    return allTokenInfo
  }
}

function mapToTokenIdentifier (token: TokenInfoWithId): TokenIdentifier {
  return {
    id: token.id,
    symbol: token.symbol,
    displaySymbol: parseDisplaySymbol(token)
  }
}

// To remove if/when jellyfish-api-core supports IDs on tokenInfo, since it's commonly required
interface TokenInfoWithId extends TokenInfo {
  id: string
}

type TokensBySymbol = Record<TokenInfoWithId['symbol'], TokenInfoWithId>
