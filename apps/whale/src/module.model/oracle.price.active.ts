import { Model, ModelMapping } from '../module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '../module.database/database'

const OraclePriceActiveMapping: ModelMapping<OraclePriceActive> = {
  type: 'oracle_price_active',
  index: {
    key_sort: {
      name: 'oracle_price_active_key_sort',
      partition: {
        type: 'string',
        key: (b: OraclePriceActive) => b.key
      },
      sort: {
        type: 'string',
        key: (b: OraclePriceActive) => b.sort
      }
    }
  }
}

@Injectable()
export class OraclePriceActiveMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (key: string, limit: number, lt?: string): Promise<OraclePriceActive[]> {
    return await this.database.query(OraclePriceActiveMapping.index.key_sort, {
      partitionKey: key,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async put (active: OraclePriceActive): Promise<void> {
    return await this.database.put(OraclePriceActiveMapping, active)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceActiveMapping, id)
  }
}

export interface OraclePriceActive extends Model {
  id: string // ---------| token-currency-height
  key: string // --------| token-currency
  sort: string // -------| height

  active?: {
    amount: string
    weightage: number
    oracles: {
      active: number
      total: number
    }
  }
  next?: {
    amount: string
    weightage: number
    oracles: {
      active: number
      total: number
    }
  }

  isLive: boolean

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
