import { Model, ModelMapping } from '../module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '../module.database/database'

const OracleMapping: ModelMapping<Oracle> = {
  type: 'oracle',
  index: {
    oracle_id: {
      name: 'oracle_oracle_id',
      partition: {
        type: 'string',
        key: (b: Oracle) => b.id
      }
    }
  }
}

@Injectable()
export class OracleMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<Oracle[]> {
    return await this.database.query(OracleMapping.index.oracle_id, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<Oracle | undefined> {
    return await this.database.get(OracleMapping, id)
  }

  async put (oracle: Oracle): Promise<void> {
    return await this.database.put(OracleMapping, oracle)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OracleMapping, id)
  }
}

export interface Oracle extends Model {
  id: string // ---------| oracleId
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
