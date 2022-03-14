import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

import { TokenInfo } from '@defichain/jellyfish-api-core/src/category/token'
import { TokenData } from '@defichain/whale-api-client/src/api/Tokens'

import { DeFiDCache } from '../cache/DeFiDCache'
import { ApiPagedResponse } from '../core/ApiPagedResponse'
import { PaginationQuery } from '../core/PaginationQuery'

@Controller('/tokens')
export class TokenController {
  constructor (
    private readonly client: JsonRpcClient,
    protected readonly deFiDCache: DeFiDCache
  ) {
  }

  /**
   * Paginate query tokens.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<TokenData>>}
   */
  @Get('')
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<TokenData>> {
    const data = await this.client.token.listTokens({
      start: query.next !== undefined ? Number(query.next) : 0,
      including_start: query.next === undefined,
      limit: query.size
    }, true)

    const tokens: TokenData[] = Object.entries(data)
      .map(([id, value]): TokenData => {
        return mapTokenData(id, value)
      }).sort(a => Number.parseInt(a.id))

    return ApiPagedResponse.of(tokens, query.size, item => {
      return item.id
    })
  }

  /**
   * Get information about a token with id of the token.
   *
   * @param {string} id
   * @return {Promise<TokenData>}
   */
  @Get('/:id')
  async get (@Param('id', ParseIntPipe) id: string): Promise<TokenData> {
    const info = await this.deFiDCache.getTokenInfo(id)
    if (info === undefined) {
      throw new NotFoundException('Unable to find token')
    }
    return mapTokenData(String(id), info)
  }
}

export function mapTokenData (id: string, tokenInfo: TokenInfo): TokenData {
  return {
    id: id,
    symbol: tokenInfo.symbol,
    symbolKey: tokenInfo.symbolKey,
    name: tokenInfo.name,
    decimal: tokenInfo.decimal.toNumber(),
    limit: tokenInfo.limit.toFixed(),
    mintable: tokenInfo.mintable,
    tradeable: tokenInfo.tradeable,
    isDAT: tokenInfo.isDAT,
    isLPS: tokenInfo.isLPS,
    isLoanToken: tokenInfo.isLoanToken,
    finalized: tokenInfo.finalized,
    minted: tokenInfo.minted.toFixed(),
    creation: {
      tx: tokenInfo.creationTx,
      height: tokenInfo.creationHeight.toNumber()
    },
    destruction: {
      tx: tokenInfo.destructionTx,
      height: tokenInfo.destructionHeight.toNumber()
    },
    collateralAddress: tokenInfo.collateralAddress !== '' ? tokenInfo.collateralAddress : undefined,
    displaySymbol: parseDisplaySymbol(tokenInfo)
  }
}

export function parseDisplaySymbol (tokenInfo: TokenInfo): string {
  if (tokenInfo.isLPS) {
    const [a, b] = tokenInfo.symbol.split('-')

    return `${parseDATSymbol(a)}-${parseDATSymbol(b)}`
  }

  if (tokenInfo.isDAT) {
    return parseDATSymbol(tokenInfo.symbol)
  }

  return tokenInfo.symbol
}

export function parseDATSymbol (symbol: string): string {
  if (['DUSD', 'DFI'].includes(symbol)) {
    return symbol
  }

  return `d${symbol}`
}
