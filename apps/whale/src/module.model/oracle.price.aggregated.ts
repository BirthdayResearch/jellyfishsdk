import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const OraclePriceAggregatedMapping: ModelMapping<OraclePriceAggregated> = {
  type: 'oracle_price_aggregated',
  index: {
    key_sort: {
      name: 'oracle_price_aggregated_key_sort',
      partition: {
        type: 'string',
        key: (b: OraclePriceAggregated) => b.key
      },
      sort: {
        type: 'string',
        key: (b: OraclePriceAggregated) => b.sort
      }
    }
  }
}

@Injectable()
export class OraclePriceAggregatedMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (key: string, limit: number, lt?: string): Promise<OraclePriceAggregated[]> {
    return await this.database.query(OraclePriceAggregatedMapping.index.key_sort, {
      partitionKey: key,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async put (aggregated: OraclePriceAggregated): Promise<void> {
    return await this.database.put(OraclePriceAggregatedMapping, aggregated)
  }

  async get (id: string): Promise<OraclePriceAggregated | undefined> {
    return await this.database.get(OraclePriceAggregatedMapping, id)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceAggregatedMapping, id)
  }
}

export interface OraclePriceAggregated extends Model {
  id: string // ---------| token-currency-height
  key: string // --------| token-currency
  sort: string // -------| medianTime-height

  token: string
  currency: string

  aggregated: {
    amount: string
    weightage: number
    oracles: {
      active: number
      total: number
    }
  }

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
