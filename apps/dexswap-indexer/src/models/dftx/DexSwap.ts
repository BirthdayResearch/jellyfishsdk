import { Injectable } from '@nestjs/common'
import { Database, Model, ModelMapping, Paginated, SortOrder } from '../../indexer/database/_abstract'
import { makeDynamooseSchema } from '../../indexer/database/DynamoDb'

export interface DexSwap extends Model {
  timestampMs: string // ---------| global sort key

  txno: number

  fromAmount: string // bigNumber
  fromSymbol: string
  toAmount: string // bigNumber
  toSymbol: string

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }

  yyyymmdd: string
}

interface _DexSwap extends DexSwap {
  'height_txno_id': string
  _fixedPartitionKey: 0
}

const DexSwapMapping: ModelMapping<_DexSwap> = {
  type: 'DexSwap',
  attributes: [
    'id',
    'timestampMs',
    'txno',
    'fromAmount',
    'fromSymbol',
    'toAmount',
    'toSymbol',
    'block',
    'yyyymmdd'
  ],
  index: {
    yyyymmdd: {
      name: 'yyyymmdd-height_txno_id',
      partition: {
        type: 'string',
        attributeName: 'yyyymmdd'
      },
      sort: {
        type: 'string',
        attributeName: 'height_txno_id'
      }
    },

    timestampGlobalSortedList: {
      name: 'timestamp-sorted-list-index',
      partition: {
        type: 'number',
        attributeName: '_fixedPartitionKey'
      },
      sort: {
        type: 'string',
        attributeName: 'timestampMs'
      }
    }
  }
}

@Injectable()
export class DexSwapMapper {
  constructor (
    private readonly database: Database
  ) {
  }

  async put (dexSwap: DexSwap): Promise<void> {
    await this.database.put<_DexSwap>(DexSwapMapping, {
      ...dexSwap,
      _fixedPartitionKey: 0,
      height_txno_id: `#HEIGHT#${dexSwap.block.height}#TXNO#${dexSwap.txno}#ID#${dexSwap.id}`
    })
  }

  async get (id: string): Promise<DexSwap | undefined> {
    return await this.database.getById<_DexSwap>(DexSwapMapping, id)
  }

  async list (date: Date, sortOrder: SortOrder = SortOrder.ASC): Promise<Paginated<DexSwap>> {
    return await this.database.query<_DexSwap>(DexSwapMapping, DexSwapMapping.index.yyyymmdd, {
      limit: 100,
      order: sortOrder,
      partitionKey: yyyyMmDd(date)
    })
  }

  async delete (id: string): Promise<void> {
    await this.database.delete<_DexSwap>(DexSwapMapping, id)
  }
}

export const DexSwapSchema = makeDynamooseSchema(DexSwapMapping)

export function yyyyMmDd (date: Date): string {
  const dateStr = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString()
  return dateStr.substr(0, 10).split('-').join('')
}
