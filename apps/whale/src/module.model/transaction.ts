import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const TransactionMapping: ModelMapping<Transaction> = {
  type: 'transaction',
  index: {
    block_order: {
      name: 'transaction_block_order',
      partition: {
        type: 'string',
        key: (b: Transaction) => b.block.hash
      },
      sort: {
        type: 'number',
        key: (b: Transaction) => b.order
      }
    }
  }
}

@Injectable()
export class TransactionMapper {
  public constructor (protected readonly database: Database) {
  }

  async queryByBlockHash (hash: string, limit: number, gt?: number): Promise<Transaction[]> {
    return await this.database.query(TransactionMapping.index.block_order, {
      partitionKey: hash,
      limit: limit,
      order: SortOrder.ASC,
      gt: gt
    })
  }

  async get (txid: string): Promise<Transaction | undefined> {
    return await this.database.get(TransactionMapping, txid)
  }

  async put (txn: Transaction): Promise<void> {
    return await this.database.put(TransactionMapping, txn)
  }

  async delete (txid: string): Promise<void> {
    return await this.database.delete(TransactionMapping, txid)
  }
}

/**
 * Transaction that are included in a block.
 */
export interface Transaction extends Model {
  id: string // ----------------| unique id of the transaction, same as the txid
  order: number // --------------| tx order

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }

  txid: string
  hash: string
  version: number

  size: number
  vSize: number
  weight: number
  totalVoutValue: string

  lockTime: number

  vinCount: number
  voutCount: number
}
