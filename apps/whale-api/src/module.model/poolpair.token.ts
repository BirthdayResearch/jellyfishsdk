import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const PoolPairTokenMapping: ModelMapping<PoolPairToken> = {
  type: 'poolpair_token',
  index: {
    sort: {
      name: 'poolpair_token_key_sort',
      partition: {
        type: 'string',
        key: (b: PoolPairToken) => b.key
      }
    }
  }
}

@Injectable()
export class PoolPairTokenMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (key: string, limit: number, lt?: string): Promise<PoolPairToken[]> {
    return await this.database.query(PoolPairTokenMapping.index.sort, {
      partitionKey: key,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async list (limit: number, lt?: string): Promise<PoolPairToken[]> {
    return await this.database.query(PoolPairTokenMapping.index.sort, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async put (pool: PoolPairToken): Promise<void> {
    return await this.database.put(PoolPairTokenMapping, pool)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(PoolPairTokenMapping, id)
  }
}

export interface PoolPairToken extends Model {
  id: string // ---------| tokenA-tokenB-poolPairId
  key: string // --------| tokenA-tokenB
  poolpairId: number

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
