import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const TransactionVinMapping: ModelMapping<TransactionVin> = {
  type: 'transaction_vin',
  index: {
    txid_id: {
      name: 'transaction_vin_txid_id',
      partition: {
        type: 'string',
        key: (d: TransactionVin) => d.txid
      },
      sort: {
        type: 'string',
        key: (d: TransactionVin) => d.id
      }
    }
  }
}

@Injectable()
export class TransactionVinMapper {
  public constructor (protected readonly database: Database) {
  }

  /**
   * @param {string} txid of partition
   * @param {number} limit number of results
   * @param {string} gt vout.id
   */
  async query (txid: string, limit: number, gt?: string): Promise<TransactionVin[]> {
    return await this.database.query(TransactionVinMapping.index.txid_id, {
      partitionKey: txid,
      limit: limit,
      order: SortOrder.ASC,
      gt: gt
    })
  }

  async put (vin: TransactionVin): Promise<void> {
    return await this.database.put(TransactionVinMapping, vin)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(TransactionVinMapping, id)
  }
}

export interface TransactionVin extends Model {
  id: string // ----------------| unique id of the vin:    txid + vout.txid + (vout.n 4 bytes encoded hex)
  // ---------------------------| if coinbase transaction: txid + '00'

  txid: string // --------------| transaction id that this vin belongs to
  coinbase?: string

  vout?: { // ------------------| id, txid, n and the exact same as TransactionVout
    id: string
    txid: string
    n: number
    value: string
    tokenId?: number
    script: {
      hex: string
    }
  }

  script?: {
    hex: string
  }

  txInWitness?: string[]
  sequence: string
}
