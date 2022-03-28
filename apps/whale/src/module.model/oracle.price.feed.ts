import { Model, ModelMapping } from '../module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '../module.database/database'

const OraclePriceFeedMapping: ModelMapping<OraclePriceFeed> = {
  type: 'oracle_price_feed',
  index: {
    key_sort: {
      name: 'oracle_price_feed_key_sort',
      partition: {
        type: 'string',
        key: (b: OraclePriceFeed) => b.key
      },
      sort: {
        type: 'string',
        key: (b: OraclePriceFeed) => b.sort
      }
    }
  }
}

@Injectable()
export class OraclePriceFeedMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (key: string, limit: number, lt?: string): Promise<OraclePriceFeed[]> {
    return await this.database.query(OraclePriceFeedMapping.index.key_sort, {
      partitionKey: key,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async put (feed: OraclePriceFeed): Promise<void> {
    return await this.database.put(OraclePriceFeedMapping, feed)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceFeedMapping, id)
  }
}

export interface OraclePriceFeed extends Model {
  id: string // ---------| token-currency-oracleId-txid
  key: string // --------| token-currency-oracleId
  sort: string // -------| height-txid

  token: string
  currency: string
  oracleId: string
  txid: string

  time: number
  amount: string

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
