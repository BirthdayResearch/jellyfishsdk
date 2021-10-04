import { Injectable } from '@nestjs/common'
import { SortOrder } from '@src/module.database/database'
import { Model, ModelMapping } from '@src/module.database/model'
import { OraclePriceAggregatedMapper } from './oracle.price.aggregated'

export enum OracleIntervalSeconds {
  FIVE_MINUTES = 5 * 60,
  TEN_MINUTES = 10 * 60,
  ONE_HOUR = 60 * 60,
  ONE_DAY = 24 * 60 * 60
}

const OraclePriceAggregatedIntervalMapping: ModelMapping<OraclePriceAggregatedInterval> = {
  type: 'oracle_price_aggregated_interval',
  index: {
    key_sort: {
      name: 'oracle_price_aggregated_interval_key_sort',
      partition: {
        type: 'string',
        key: (b: OraclePriceAggregatedInterval) => b.key
      },
      sort: {
        type: 'string',
        key: (b: OraclePriceAggregatedInterval) => b.sort
      }
    }
  }
}

@Injectable()
export class OraclePriceAggregatedIntervalMapper extends OraclePriceAggregatedMapper {
  async query (key: string, limit: number, lt?: string): Promise<OraclePriceAggregatedInterval[]> {
    return await this.database.query(OraclePriceAggregatedIntervalMapping.index.key_sort, {
      partitionKey: key,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async put (aggregated: OraclePriceAggregatedInterval): Promise<void> {
    return await this.database.put(OraclePriceAggregatedIntervalMapping, aggregated)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceAggregatedIntervalMapping, id)
  }
}

export interface OraclePriceAggregatedInterval extends Model {
  id: string // ---------| token-currency-interval-height
  key: string // --------| token-currency-interval
  sort: string // -------| medianTime-height

  token: string
  currency: string

  aggregated: {
    amount: string
    weightage: number
    count: number
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
