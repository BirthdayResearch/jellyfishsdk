import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const PoolPairTokenMapping: ModelMapping<PoolPairToken> = {
  type: 'pool_pair_token',
  index: {
    token_key: {
      name: 'pool_pair_token_key_sort',
      partition: {
        type: 'string',
        key: (b: PoolPairToken) => b.sort
      }
    }
  }
}

@Injectable()
export class PoolPairTokenMapper {
  public constructor (protected readonly database: Database) {
  }

  async getPair (tokenA: number, tokenB: number): Promise<PoolPairToken | undefined> {
    const result = await this.database.get(PoolPairTokenMapping, `${tokenA}-${tokenB}`)
    if (result !== undefined) {
      return result
    }

    return await this.database.get(PoolPairTokenMapping, `${tokenB}-${tokenA}`)
  }

  async list (limit: number, gt?: string): Promise<PoolPairToken[]> {
    return await this.database.query(PoolPairTokenMapping.index.token_key, {
      limit: limit,
      order: SortOrder.ASC,
      gt: gt
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
  id: string // ---------| tokenA-tokenB
  sort: string // -------| poolPairId (hex encoded)
  poolPairId: number

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
