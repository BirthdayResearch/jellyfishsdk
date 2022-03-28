import { Model, ModelMapping } from '../module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '../module.database/database'

const OracleHistoryMapping: ModelMapping<OracleHistory> = {
  type: 'oracle_history',
  index: {
    oracle_id_sort: {
      name: 'oracle_history_oracle_id_sort',
      partition: {
        type: 'string',
        key: (b: OracleHistory) => b.oracleId
      },
      sort: {
        type: 'string',
        key: (b: OracleHistory) => b.sort
      }
    }
  }
}

@Injectable()
export class OracleHistoryMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (oracleId: string, limit: number, lt?: string): Promise<OracleHistory[]> {
    return await this.database.query(OracleHistoryMapping.index.oracle_id_sort, {
      partitionKey: oracleId,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async put (oracle: OracleHistory): Promise<void> {
    return await this.database.put(OracleHistoryMapping, oracle)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OracleHistoryMapping, id)
  }
}

export interface OracleHistory extends Model {
  id: string // ---------| oracleId-height-txid
  oracleId: string
  sort: string // -------| height-txid
  ownerAddress: string

  weightage: number
  priceFeeds: Array<{
    token: string
    currency: string
  }>

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
