import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const PoolPairHistoryMapping: ModelMapping<PoolPairHistory> = {
  type: 'pool_pair_history',
  index: {
    poolpair_id: {
      name: 'pool_pair_history_sort',
      partition: {
        type: 'string',
        key: (p: PoolPairHistory) => p.poolPairId
      },
      sort: {
        type: 'string',
        key: (p: PoolPairHistory) => p.sort
      }
    }
  }
}

@Injectable()
export class PoolPairHistoryMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (poolPairId: string): Promise<PoolPairHistory | undefined> {
    const latest = await this.database.query(PoolPairHistoryMapping.index.poolpair_id, {
      partitionKey: poolPairId,
      order: SortOrder.DESC,
      limit: 1
    })
    return latest[0]
  }

  async query (poolPairId: string, limit: number, lt?: string): Promise<PoolPairHistory[]> {
    return await this.database.query(PoolPairHistoryMapping.index.poolpair_id, {
      partitionKey: poolPairId,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<PoolPairHistory | undefined> {
    return await this.database.get(PoolPairHistoryMapping, id)
  }

  async put (poolPair: PoolPairHistory): Promise<void> {
    return await this.database.put(PoolPairHistoryMapping, poolPair)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(PoolPairHistoryMapping, id)
  }
}

export interface PoolPairHistory extends Model {
  id: string // --------------| txid

  poolPairId: string // ------| poolPairId (decimal encoded integer as string)
  sort: string // ------------| blockheight-txnNo

  pairSymbol: string // ------| string
  name: string // ------------| string
  tokenA: {
    id: number // ------------| numerical id
    symbol: string // --------| string
  }
  tokenB: {
    id: number // ------------| numerical id
    symbol: string // --------| string
  }
  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
  status: boolean // ---------| active / not active
  commission: string // ------| bignumber
}
