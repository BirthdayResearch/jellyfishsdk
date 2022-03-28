import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { HexEncoder } from '@src/module.model/_hex.encoder'

const TransactionVoutMapping: ModelMapping<TransactionVout> = {
  type: 'transaction_vout',
  index: {
    txid_n: {
      name: 'transaction_vout_txid_n',
      partition: {
        type: 'string',
        key: (d: TransactionVout) => d.txid
      },
      sort: {
        type: 'number',
        key: (d: TransactionVout) => d.n
      }
    }
  }
}

@Injectable()
export class TransactionVoutMapper {
  public constructor (protected readonly database: Database) {
  }

  /**
   * @param {string} txid of partition
   * @param {number} limit number of results
   * @param {string} gt n
   */
  async query (txid: string, limit: number, gt?: string): Promise<TransactionVout[]> {
    return await this.database.query(TransactionVoutMapping.index.txid_n, {
      partitionKey: txid,
      limit: limit,
      order: SortOrder.ASC,
      gt: gt
    })
  }

  async get (txid: string, n: number): Promise<TransactionVout | undefined> {
    return await this.database.get(TransactionVoutMapping, txid + HexEncoder.encodeVoutIndex(n))
  }

  async put (vout: TransactionVout): Promise<void> {
    return await this.database.put(TransactionVoutMapping, vout)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(TransactionVoutMapping, id)
  }
}

export interface TransactionVout extends Model {
  id: string // ----------------| unique id of the vout: (txid + (n 4 bytes encoded hex))
  txid: string // --------------| transaction id that this vout belongs to
  n: number // -----------------| index of the output in the transaction

  value: string // -------------| output value stored as string, string as decimal: 0.0000
  tokenId?: number // ---------| currently disabled, will always be 0

  script: {
    hex: string
    type: string
  }
}
