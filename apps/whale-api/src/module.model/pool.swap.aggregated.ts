import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const PoolSwapAggregatedMapping: ModelMapping<PoolSwapAggregated> = {
  type: 'pool_swap_aggregated',
  index: {
    key_sort: {
      name: 'pool_swap_aggregated_key_bucket',
      partition: {
        type: 'string',
        key: (b: PoolSwapAggregated) => b.key
      },
      sort: {
        type: 'number',
        key: (b: PoolSwapAggregated) => b.bucket
      }
    }
  }
}

@Injectable()
export class PoolSwapAggregatedMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (key: string, limit: number, lt?: string, gt?: string): Promise<PoolSwapAggregated[]> {
    return await this.database.query(PoolSwapAggregatedMapping.index.key_sort, {
      partitionKey: key,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt,
      gt: gt
    })
  }

  async put (aggregated: PoolSwapAggregated): Promise<void> {
    return await this.database.put(PoolSwapAggregatedMapping, aggregated)
  }

  async get (id: string): Promise<PoolSwapAggregated | undefined> {
    return await this.database.get(PoolSwapAggregatedMapping, id)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(PoolSwapAggregatedMapping, id)
  }
}

export interface PoolSwapAggregated extends Model {
  id: string // ---------| poolPairId-interval-blockhash
  key: string // --------| poolPairId-interval
  bucket: number // -----| bucket = (medianTime - medianTime % interval)

  aggregated: {
    amounts: Record<string, string> // -----| amounts[tokenId] = BigNumber(volume)
  }

  block: {
    medianTime: number
  }
}
