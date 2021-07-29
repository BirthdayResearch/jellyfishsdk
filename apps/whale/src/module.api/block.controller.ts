import { Controller, Get, Param, Query } from '@nestjs/common'
import { Block, BlockMapper } from '@src/module.model/block'
import { Transaction, TransactionMapper } from '@src/module.model/transaction'
import { TransactionVinMapper, TransactionVin } from '@src/module.model/transaction.vin'
import { TransactionVoutMapper, TransactionVout } from '@src/module.model/transaction.vout'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'

export function parseHeight (str: string | undefined): number | undefined {
  if (str !== undefined && /^\d+$/.test(str)) {
    return parseInt(str)
  }
}

export function isSHA256Hash (str: string | undefined): boolean {
  return str !== undefined ? !(str.match(/^[0-f]{64}$/) == null) : false
}

@Controller('/blocks')
export class BlockController {
  constructor (
    protected readonly blockMapper: BlockMapper,
    protected readonly transactionMapper: TransactionMapper,
    protected readonly transactionVinMapper: TransactionVinMapper,
    protected readonly transactionVoutMapper: TransactionVoutMapper
  ) {
  }

  @Get('')
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<Block>> {
    const height = parseHeight(query.next)
    const blocks = await this.blockMapper.queryByHeight(query.size, height)
    return ApiPagedResponse.of(blocks, query.size, item => {
      return item.height.toString()
    })
  }

  @Get('/:id')
  async get (@Param('id') hashOrHeight: string): Promise<Block | undefined> {
    const height = parseHeight(hashOrHeight)
    if (height !== undefined) {
      return await this.blockMapper.getByHeight(height)
    }

    if (isSHA256Hash(hashOrHeight)) {
      return await this.blockMapper.getByHash(hashOrHeight)
    }
  }

  @Get('/:hash/transactions')
  async getTransactions (@Param('hash') hash: string, @Query() query: PaginationQuery): Promise<ApiPagedResponse<Transaction>> {
    if (!isSHA256Hash(hash)) {
      return ApiPagedResponse.empty()
    }

    const transactions = await this.transactionMapper.queryByBlockHash(hash, query.size, query.next)
    return ApiPagedResponse.of(transactions, query.size, transaction => {
      return transaction.id
    })
  }

  @Get('/:hash/transactions/:txid/vins')
  async getVins (@Param('hash') hash: string, @Param('txid') txid: string, @Query() query: PaginationQuery): Promise<ApiPagedResponse<TransactionVin>> {
    return ApiPagedResponse.of(await this.getVectors<TransactionVin>(this.transactionVinMapper, hash, txid, query), query.size, vout => {
      return vout.id
    })
  }

  @Get('/:hash/transactions/:txid/vouts')
  async getVouts (@Param('hash') hash: string, @Param('txid') txid: string, @Query() query: PaginationQuery): Promise<ApiPagedResponse<TransactionVout>> {
    return ApiPagedResponse.of(await this.getVectors<TransactionVout>(this.transactionVoutMapper, hash, txid, query), query.size, vout => {
      return vout.n.toString()
    })
  }

  async getVectors<T extends TransactionVin | TransactionVout> (mapper: TransactionVinMapper | TransactionVoutMapper, hash: string, txid: string, query: PaginationQuery): Promise<T[]> {
    const transaction = await this.transactionMapper.get(txid)

    if (transaction !== undefined && transaction.block.hash === hash) {
      return await mapper.query(txid, query.size) as T[]
    }

    return []
  }
}
