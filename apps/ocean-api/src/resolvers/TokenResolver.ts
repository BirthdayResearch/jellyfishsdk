import { TokenModel } from '../models/TokenModel'
import { Resolver, Args, Query } from '@nestjs/graphql'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { TokenInfo } from 'packages/jellyfish-api-core/src/category/token'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ApiPagedResponse } from '../_core/api.paged.response'
import { PaginationQuery } from '../_core/api.query'

@Resolver(of => TokenModel)
export class TokenResolver {
  constructor (private readonly client: ApiClient) {
  }

  @Query(returns => TokenModel)
  async get (@Args('id') id: string): Promise<TokenModel> {
    try {
      const data = await this.client.token.getToken(id)
      return mapTokenData(String(id), data[Object.keys(data)[0]])
    } catch (err: any) {
      /* istanbul ignore else */
      if (err?.payload?.message === 'Token not found') {
        throw new NotFoundException('Unable to find token')
      } else {
        throw new BadRequestException(err)
      }
    }
  }

  @Query(returns => [TokenModel])
  async list (@Args('pagination') query: PaginationQuery): Promise<ApiPagedResponse<TokenModel>> {
    const data = await this.client.token.listTokens({
      start: query.next !== undefined ? Number(query.next) : 0,
      including_start: query.next === undefined,
      limit: query.size
    }, true)

    const tokens: TokenModel[] = Object.entries(data)
      .map(([id, value]): TokenModel => {
        return mapTokenData(id, value)
      }).sort(a => Number.parseInt(a.id))

    return ApiPagedResponse.of(tokens, query.size, item => {
      return item.id
    })
  }
}

export function mapTokenData (id: string, tokenInfo: TokenInfo): TokenModel {
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
