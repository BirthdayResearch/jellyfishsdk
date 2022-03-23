import { Model, ModelMapping } from '../module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '../module.database/database'
import { OraclePriceAggregated } from '../module.model/oracle.price.aggregated'

const PriceTickerMapping: ModelMapping<PriceTicker> = {
  type: 'price_ticker',
  index: {
    sort: {
      name: 'price_ticker_sort',
      partition: {
        type: 'string',
        key: (b: PriceTicker) => b.sort
      }
    }
  }
}

@Injectable()
export class PriceTickerMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<PriceTicker[]> {
    return await this.database.query(PriceTickerMapping.index.sort, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<PriceTicker | undefined> {
    return await this.database.get(PriceTickerMapping, id)
  }

  async put (price: PriceTicker): Promise<void> {
    return await this.database.put(PriceTickerMapping, price)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(PriceTickerMapping, id)
  }
}

export interface PriceTicker extends Model {
  id: string // ----------| token-currency
  sort: string // --------| count-height-token-currency
  price: OraclePriceAggregated
}
