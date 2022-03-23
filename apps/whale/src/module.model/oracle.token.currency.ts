import { Model, ModelMapping } from '../module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '../module.database/database'

const OracleTokenCurrencyMapping: ModelMapping<OracleTokenCurrency> = {
  type: 'oracle_token_currency',
  index: {
    key_oracle_id: {
      name: 'oracle_token_currency_key_oracle_id',
      partition: {
        type: 'string',
        key: (b: OracleTokenCurrency) => b.key
      },
      sort: {
        type: 'string',
        key: (b: OracleTokenCurrency) => b.oracleId
      }
    }
  }
}

@Injectable()
export class OracleTokenCurrencyMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (key: string, limit: number, lt?: string): Promise<OracleTokenCurrency[]> {
    return await this.database.query(OracleTokenCurrencyMapping.index.key_oracle_id, {
      partitionKey: key,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async put (tokenCurrency: OracleTokenCurrency): Promise<void> {
    return await this.database.put(OracleTokenCurrencyMapping, tokenCurrency)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OracleTokenCurrencyMapping, id)
  }
}

export interface OracleTokenCurrency extends Model {
  id: string // ---------| token-currency-oracleId
  key: string // --------| token-currency

  token: string
  currency: string
  oracleId: string
  weightage: number

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
