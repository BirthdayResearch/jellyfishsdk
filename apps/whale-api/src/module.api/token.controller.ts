import { Controller, Get, Param, Query, ParseIntPipe, NotFoundException, BadRequestException } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { TokenData } from '@whale-api-client/api/tokens'

@Controller('/v1/:network/tokens')
export class TokensController {
  constructor (private readonly client: JsonRpcClient) {
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
    try {
      const data = await this.client.token.getToken(id)
      return mapTokenData(String(id), data[Object.keys(data)[0]])
    } catch (e) {
      /* istanbul ignore else */
      if (e.payload.message === 'Token not found') {
        throw new NotFoundException('Unable to find token')
      } else {
        throw new BadRequestException(e)
      }
    }
  }
}

function mapTokenData (id: string, tokenInfo: TokenInfo): TokenData {
  return {
    id: id,
    symbol: tokenInfo.symbol,
    symbolKey: tokenInfo.symbolKey,
    name: tokenInfo.name,
    decimal: tokenInfo.decimal,
    limit: tokenInfo.limit,
    mintable: tokenInfo.mintable,
    tradeable: tokenInfo.tradeable,
    isDAT: tokenInfo.isDAT,
    isLPS: tokenInfo.isLPS,
    finalized: tokenInfo.finalized,
    minted: tokenInfo.minted,
    creation: { tx: tokenInfo.creationTx, height: tokenInfo.creationHeight },
    destruction: { tx: tokenInfo.destructionTx, height: tokenInfo.destructionHeight },
    collateralAddress: tokenInfo.collateralAddress
  }
}
