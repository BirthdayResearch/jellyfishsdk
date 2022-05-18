import BigNumber from 'bignumber.js'
import { BadRequestException, ConflictException, Controller, ForbiddenException, Get, Inject, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import { AddressToken, AddressHistory, FutureSwap } from '@whale-api-client/api/address'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { ScriptActivity, ScriptActivityMapper } from '@src/module.model/script.activity'
import { ScriptAggregation, ScriptAggregationMapper } from '@src/module.model/script.aggregation'
import { ScriptUnspent, ScriptUnspentMapper } from '@src/module.model/script.unspent'
import { FutureSwapMapper } from '@src/module.model/future.swap'
import { DeFiAddress, fromAddress } from '@defichain/jellyfish-address'
import { NetworkName } from '@defichain/jellyfish-network'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { toBuffer } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { LoanVaultActive, LoanVaultLiquidated } from '@whale-api-client/api/loan'
import { LoanVaultService } from '@src/module.api/loan.vault.service'
import { parseDisplaySymbol } from '@src/module.api/token.controller'
import { AccountHistory } from '@defichain/jellyfish-api-core/dist/category/account'

/* eslint-disable @typescript-eslint/no-non-null-assertion */

@Controller('/address/:address')
export class AddressController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly deFiDCache: DeFiDCache,
    protected readonly aggregationMapper: ScriptAggregationMapper,
    protected readonly activityMapper: ScriptActivityMapper,
    protected readonly unspentMapper: ScriptUnspentMapper,
    protected readonly futureSwapMapper: FutureSwapMapper,
    protected readonly vaultService: LoanVaultService,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
  }

  @Get('/history/:height/:txno')
  async getAccountHistory (
    @Param('address') address: string,
      @Param('height', ParseIntPipe) height: number,
      @Param('txno', ParseIntPipe) txno: number
  ): Promise<AddressHistory> {
    try {
      const accountHistory = await this.rpcClient.account.getAccountHistory(address, height, txno)
      if (Object.keys(accountHistory).length === 0) {
        throw new NotFoundException('Record not found')
      }
      return mapAddressHistory(accountHistory)
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err
      }
      throw new BadRequestException(err)
    }
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

    const history = list.map(each => mapAddressHistory(each))

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

  @Get('/future/swaps')
  async listFutureSwap (
    @Param('address') address: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<FutureSwap>> {
    const size = query.size > 30 ? 30 : query.size
    const end = await this.rpcClient.oracle.getFutureSwapBlock() // next settle block height
    // mapper is sorted DESC
    const lt = query.next ?? `${HexEncoder.encodeHeight(end)}-${'f'.repeat(64)}`
    const attributes = await this.rpcClient.masternode.getGov('ATTRIBUTES')
    const interval = attributes.ATTRIBUTES['v0/params/dfip2203/block_period']
    const start = end - interval
    const gt = `${HexEncoder.encodeHeight(start)}-${'0'.repeat(64)}`

    const script = fromAddress(address, this.network)!.script
    const haddr = toBuffer(script.stack).toString('hex')

    const list = await this.futureSwapMapper.query(haddr, size, lt, gt)

    return ApiPagedResponse.of(list, size, item => {
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

function mapAddressHistory (history: AccountHistory): AddressHistory {
  return {
    owner: history.owner,
    txid: history.txid,
    txn: history.txn,
    type: history.type,
    amounts: history.amounts,
    block: {
      height: history.blockHeight,
      hash: history.blockHash,
      time: history.blockTime
    }
  }
}
