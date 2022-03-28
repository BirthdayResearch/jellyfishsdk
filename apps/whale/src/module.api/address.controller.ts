import BigNumber from 'bignumber.js'
import { ConflictException, Controller, ForbiddenException, Get, Inject, Param, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import { AddressToken, AddressHistory } from '@whale-api-client/api/address'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { ScriptActivity, ScriptActivityMapper } from '@src/module.model/script.activity'
import { ScriptAggregation, ScriptAggregationMapper } from '@src/module.model/script.aggregation'
import { ScriptUnspent, ScriptUnspentMapper } from '@src/module.model/script.unspent'
import { DeFiAddress } from '@defichain/jellyfish-address'
import { NetworkName } from '@defichain/jellyfish-network'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { toBuffer } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { LoanVaultActive, LoanVaultLiquidated } from '@whale-api-client/api/loan'
import { LoanVaultService } from '@src/module.api/loan.vault.service'
import { parseDisplaySymbol } from '@src/module.api/token.controller'
import { AccountHistory } from '@defichain/jellyfish-api-core/dist/category/account'

@Controller('/address/:address')
export class AddressController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly deFiDCache: DeFiDCache,
    protected readonly aggregationMapper: ScriptAggregationMapper,
    protected readonly activityMapper: ScriptActivityMapper,
    protected readonly unspentMapper: ScriptUnspentMapper,
    protected readonly vaultService: LoanVaultService,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
  }

  /**
   * @param {string} address to list participate account history
   * @param {PaginationQuery} query
   */
  @Get('/history')
  async listAccountHistory (
    @Param('address') address: string,
      @Query() query: PaginationQuery): Promise<ApiPagedResponse<AddressHistory>> {
    if (address === 'mine') {
      throw new ForbiddenException('mine is not allowed')
    }

    const limit = query.size > 200 ? 200 : query.size
    const next = query.next ?? undefined
    let list: AccountHistory[]

    if (next !== undefined) {
      const [txid, txType, maxBlockHeight] = next.split('-')

      const loop = async (maxBlockHeight: number, limit: number): Promise<AccountHistory[]> => {
        const list = await this.rpcClient.account.listAccountHistory(address, {
          limit: limit,
          maxBlockHeight: maxBlockHeight,
          no_rewards: true
        })
        if (list.length === 0) {
          return []
        }
        const foundIndex = list.findIndex(each => each.txid === txid && each.type === txType)
        if (foundIndex === -1) {
          // if not found, extend the size till grab the 'next'
          return await loop(Number(maxBlockHeight), limit * 2)
        }
        const start = foundIndex + 1 // plus 1 to exclude the prev txid
        const size = start + query.size
        const sliced = list.slice(start, size)
        if (sliced.length !== query.size) {
          // need a bigger volume to achieve the size
          return await loop(Number(maxBlockHeight), limit * 2)
        }
        return sliced
      }
      list = await loop(Number(maxBlockHeight), limit)
    } else {
      list = await this.rpcClient.account.listAccountHistory(address, {
        limit: limit,
        no_rewards: true
      })
    }

    const history = mapAddressHistory(list)

    return ApiPagedResponse.of(history, query.size, item => {
      return `${item.txid}-${item.type}-${item.block.height}`
    })
  }

  @Get('/balance')
  async getBalance (@Param('address') address: string): Promise<string> {
    const aggregation = await this.getAggregation(address)
    return aggregation?.amount.unspent ?? '0.00000000'
  }

  @Get('/aggregation')
  async getAggregation (@Param('address') address: string): Promise<ScriptAggregation | undefined> {
    const hid = addressToHid(this.network, address)
    return await this.aggregationMapper.getLatest(hid)
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
    const tokenInfos = await this.deFiDCache.batchTokenInfo(ids)

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

  @Get('/vaults')
  async listVaults (
    @Param('address') address: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<LoanVaultActive | LoanVaultLiquidated>> {
    return await this.vaultService.list(query, address)
  }

  @Get('/transactions')
  async listTransactions (
    @Param('address') address: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<ScriptActivity>> {
    const hid = addressToHid(this.network, address)
    const items = await this.activityMapper.query(hid, query.size, query.next)

    return ApiPagedResponse.of(items, query.size, item => {
      return item.id
    })
  }

  @Get('/transactions/unspent')
  async listTransactionsUnspent (
    @Param('address') address: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<ScriptUnspent>> {
    const hid = addressToHid(this.network, address)
    const items = await this.unspentMapper.query(hid, query.size, query.next)

    return ApiPagedResponse.of(items, query.size, item => {
      return item.sort
    })
  }
}

/**
 * @param {NetworkName} name of the network
 * @param {string} address to convert to HID
 * @return {string} HID is hashed script.hex, SHA256(decodeAddress(address).hex)
 */
export function addressToHid (name: NetworkName, address: string): string {
  // TODO(fuxingloh): refactor jellyfish-address, then refactor this
  const decoded = DeFiAddress.from(name, address)
  const stack = decoded.getScript().stack
  const hex = toBuffer(stack).toString('hex')
  return HexEncoder.asSHA256(hex)
}

function mapAddressToken (id: string, tokenInfo: TokenInfo, value: BigNumber): AddressToken {
  return {
    id: id,
    amount: value.toFixed(8),
    symbol: tokenInfo.symbol,
    symbolKey: tokenInfo.symbolKey,
    name: tokenInfo.name,
    isDAT: tokenInfo.isDAT,
    isLPS: tokenInfo.isLPS,
    isLoanToken: tokenInfo.isLoanToken,
    displaySymbol: parseDisplaySymbol(tokenInfo)
  }
}

function mapAddressHistory (list: AccountHistory[]): AddressHistory[] {
  return list.map(each => {
    return {
      owner: each.owner,
      txid: each.txid,
      txn: each.txn,
      type: each.type,
      amounts: each.amounts,
      block: {
        height: each.blockHeight,
        hash: each.blockHash,
        time: each.blockTime
      }
    }
  })
}
