import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'

import { ApiPagedResponse } from '../core/ApiPagedResponse'
import { PaginationQuery } from '../core/PaginationQuery'
import { TransactionMapper, Transaction } from '../models/Transaction'
import { TransactionVin, TransactionVinMapper } from '../models/TransactionVin'
import { TransactionVout, TransactionVoutMapper } from '../models/TransactionVout'

@Controller('/transactions')
export class TransactionController {
  constructor (
    protected readonly transactionMapper: TransactionMapper,
    protected readonly transactionVinMapper: TransactionVinMapper,
    protected readonly transactionVoutMapper: TransactionVoutMapper
  ) {
  }

  /**
   * Get a single transaction by txid
   *
   * @param {string} txid of transaction to query
   * @return{Promise<Transaction>}
   */
  @Get('/:txid')
  async get (@Param('txid') txid: string): Promise<Transaction> {
    const transaction = await this.transactionMapper.get(txid)

    if (transaction === undefined) {
      throw new NotFoundException('transaction not found')
    }

    return transaction
  }

  @Get('/:txid/vins')
  async getVins (@Param('txid') txid: string, @Query() query: PaginationQuery): Promise<ApiPagedResponse<TransactionVin>> {
    const vin = await this.transactionVinMapper.query(txid, query.size, query.next)

    return ApiPagedResponse.of(vin, query.size, vout => {
      return vout.id
    })
  }

  @Get('/:txid/vouts')
  async getVouts (@Param('txid') txid: string, @Query() query: PaginationQuery): Promise<ApiPagedResponse<TransactionVout>> {
    const vout = await this.transactionVoutMapper.query(txid, query.size, query.next)

    return ApiPagedResponse.of(vout, query.size, vout => {
      return vout.n.toString()
    })
  }
}
