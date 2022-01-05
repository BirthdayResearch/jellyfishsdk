import { TokenModel } from '../models/TokenModel'
import { Resolver, Args, Query } from '@nestjs/graphql'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { TokenInfo } from 'packages/jellyfish-api-core/src/category/token'
import { BadRequestException, NotFoundException } from '@nestjs/common'

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
