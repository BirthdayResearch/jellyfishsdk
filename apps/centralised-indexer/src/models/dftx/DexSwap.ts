import { Schema } from 'dynamoose'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel, Model } from 'nestjs-dynamoose'
import { SortOrder } from 'dynamoose/dist/General'

export interface DexSwapKey {
  id: string // ----------------| partition / hash key; the transaction id of fixed length 64
}

export interface DexSwap extends DexSwapKey {
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
}

interface DexSwapKeyInternal extends DexSwapKey {
  _height_txno_id: string // -----| sort key
}

interface DexSwapInternal extends Omit<DexSwap, 'fromAmount'|'toAmount'>, DexSwapKeyInternal {
  fromAmount: string
  toAmount: string
  _fixedPartitionKey?: 0
  _yyyymmdd: string // ---------| UTC date based on `timestamp` field
}

export const DexSwapSchema = new Schema({
  id: {
    type: String,
    hashKey: true
  },
  timestampMs: String,

  txid: String,
  txno: Number,

  fromAmount: String, // 8 decimals
  fromSymbol: String,
  toAmount: String, // 8 decimals
  toSymbol: String,
  block: {
    type: Object,
    schema: {
      hash: String,
      height: Number,
      time: Number,
      medianTime: Number
    }
  },

  // To support queries where only sortKey is provided
  _fixedPartitionKey: {
    default: 0,
    forceDefault: true,
    type: Number,
    index: [
      { // support query for highest block
        global: true,
        name: 'timestamp-sorted-list-index',
        rangeKey: 'timestampMs'
      }
    ]
  },

  // To support querying swaps for a given date
  _height_txno_id: {
    type: String, // #TIME#...#TXNO#...#ID#...
    rangeKey: true
  },
  // support queries for the current date via 'inverted index' strategy
  _yyyymmdd: {
    type: String,
    index: {
      global: true,
      name: 'yyyymmdd-index',
      rangeKey: '_height_txno_id'
    }
  }

})

const fetchAttrs = DexSwapSchema
  .attributes()
  .filter(attr => !attr.startsWith('_'))

@Injectable()
export class DexSwapService {
  constructor (
    @InjectModel('DexSwap')
    private readonly model: Model<DexSwapInternal, DexSwapKeyInternal>
  ) {
  }

  async upsert (dexSwap: DexSwap): Promise<void> {
    const newSwap = {
      ...dexSwap,
      _height_txno_id: `#HEIGHT#${dexSwap.block.height}#TXNO#${dexSwap.txno}#ID#${dexSwap.id}`,
      _yyyymmdd: yyyyMmDd(new Date(Number(dexSwap.timestampMs)))
    }
    await this.model.create(newSwap, {
      overwrite: true,
      return: 'document'
    })
  }

  async get (id: string): Promise<DexSwap | undefined> {
    const dexSwaps = await this.model
      .query('id').eq(id)
      .limit(1)
      .attributes(fetchAttrs)
      .exec()

    if (dexSwaps === undefined || dexSwaps.length === 0) {
      return undefined
    }

    return dexSwaps[0]
  }

  async list (date: Date, order: Sort = Sort.asc, pagination?: Pagination): Promise<DexSwapPaginatedResponse> {
    // console.log('>>> Querying with date', yyyyMmDd(date))
    // console.log((await this.model.scan().exec()).map(s => s._yyyymmdd))

    let request = await this.model
      .query({ _yyyymmdd: { eq: yyyyMmDd(date) } })
      .using('yyyymmdd-index')
      .sort(order === Sort.asc ? SortOrder.ascending : SortOrder.descending)
      .attributes(fetchAttrs)

    console.log(await request.getRequest())

    if (pagination !== undefined) {
      if (pagination.limit !== undefined) {
        request = request.limit(pagination.limit)
      }

      if (pagination.next !== undefined) {
        request = request.startAt(pagination.next)
      }
    }

    console.log('>>> requesting')

    const dexSwaps = await request.exec()
    console.log('>>> done', dexSwaps)
    const response: DexSwapPaginatedResponse = {
      dexSwaps: [...dexSwaps]
    }
    if (dexSwaps.lastKey !== undefined) {
      response.lastKey = dexSwaps.lastKey
    }

    return response
  }

  async delete (id: string): Promise<void> {
    const dexSwaps = await this.model
      .query('id').eq(id)
      .limit(1)
      .attributes(['id', '_height_txno_id'])
      .exec()
    if (dexSwaps === undefined || dexSwaps.length === 0) {
      throw new NotFoundException('Attempt to delete non-existent dexSwap')
    }
    await this.model.delete({ id, _height_txno_id: dexSwaps[0]._height_txno_id })
  }
}

interface Pagination {
  limit?: number
  next?: Object
}

export enum Sort {
  asc = 'asc',
  desc = 'desc'
}

// TODO(eli-lim): abstract
interface DexSwapPaginatedResponse {
  dexSwaps: DexSwap[]
  lastKey?: Object
}

export function yyyyMmDd (date: Date): string {
  const dateStr = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString()
  return dateStr.substr(0, 10).split('-').join('')
}
