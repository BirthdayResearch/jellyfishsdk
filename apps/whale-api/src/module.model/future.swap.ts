import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'
import BigNumber from 'bignumber.js'

const FutureSwapMapping: ModelMapping<FutureSwap> = {
  type: 'future_swap',
  index: {
    key_sort: {
      name: 'future_swap_key_sort',
      partition: {
        type: 'string',
        key: (b: FutureSwap) => b.key
      },
      sort: {
        type: 'string',
        key: (b: FutureSwap) => b.sort
      }
    }
  }
}

@Injectable()
export class FutureSwapMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (key: string, limit: number, lt?: string, gt?: string): Promise<FutureSwap[]> {
    return await this.database.query(FutureSwapMapping.index.key_sort, {
      partitionKey: key,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt,
      gt: gt
    })
  }

  async put (futureSwap: FutureSwap): Promise<void> {
    return await this.database.put(FutureSwapMapping, futureSwap)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(FutureSwapMapping, id)
  }
}

export interface FutureSwap extends Model {
  id: string // ---------| txid
  key: string // --------| fromAddress
  sort: string // -------| hexEncodedHeight-txid
  source: {
    token: number
    amount: BigNumber
  }
  destination: number // toTokenId
  withdraw: boolean

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
