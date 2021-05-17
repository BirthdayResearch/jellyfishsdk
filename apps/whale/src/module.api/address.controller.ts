import BigNumber from 'bignumber.js'
import { ConflictException, Controller, Get, Param, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { TokenInfoCache } from '@src/module.api/cache/token.info.cache'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import { AddressToken } from '@whale-api-client/api/address'
import { PaginationQuery } from '@src/module.api/_core/api.query'

@Controller('/v1/:network/address/:address')
export class AddressController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly tokenInfoCache: TokenInfoCache
  ) {
  }

  /**
   * @param {string} address to list tokens belonging to address
   * @param {PaginationQuery} query
   */
  @Get('/tokens')
  async listTokens (
    @Param('address') address: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<AddressToken>> {
    const accounts = await this.rpcClient.account.getAccount(address, {
      start: query.next !== undefined ? Number(query.next) : undefined,
      including_start: query.next === undefined, // TODO(fuxingloh): open issue at DeFiCh/ain, rpc_accounts.cpp#388
      limit: query.size
    }, { indexedAmounts: true })

    const ids = Object.keys(accounts)
    const tokenInfos = await this.tokenInfoCache.batch(ids)

    const tokens: AddressToken[] = Object.entries(accounts)
      .map(([id, value]): AddressToken => {
        const tokenInfo = tokenInfos[id]
        if (tokenInfo === undefined) {
          throw new ConflictException('unable to find token')
        }

        return mapAddressToken(id, tokenInfo, value)
      }).sort(a => Number.parseInt(a.id))

    return ApiPagedResponse.of(tokens, query.size, item => {
      return item.id
    })
  }
}

function mapAddressToken (id: string, tokenInfo: TokenInfo, value: BigNumber): AddressToken {
  return {
    id: id,
    amount: value.toFixed(8),
    symbol: tokenInfo.symbol,
    symbolKey: tokenInfo.symbolKey,
    name: tokenInfo.name,
    isDAT: tokenInfo.isDAT,
    isLPS: tokenInfo.isLPS
  }
}
