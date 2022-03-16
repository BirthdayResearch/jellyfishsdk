import { Schema } from 'dynamoose'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel, Model } from 'nestjs-dynamoose'
import BigNumber from 'bignumber.js'

export interface DexSwapKey {
  id: string // ----------------| partition / hash key; the transaction id of fixed length 64
}

export interface DexSwap extends DexSwapKey {
  timestamp: string // ---------| global sort key

  txno: number

  fromAmount: BigNumber
  fromSymbol: string
  toAmount: BigNumber
  toSymbol: string

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}

interface DexSwapInternal extends Omit<DexSwap, 'fromAmount'|'toAmount'> {
  fromAmount: string
  toAmount: string
  _fixedPartitionKey?: 0
}

export const DexSwapSchema = new Schema({
  id: {
    type: String,
    hashKey: true
  },
  timestamp: String,
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
        rangeKey: 'timestamp'
      }
    ]
  }
})

const fetchAttrs = DexSwapSchema
  .attributes()
  .filter(attr => !attr.startsWith('_'))

@Injectable()
export class DexSwapService {
  constructor (
    @InjectModel('DexSwap')
    private readonly model: Model<DexSwapInternal, DexSwapKey>
  ) {
  }

  async upsert (dexSwap: DexSwap): Promise<void> {
    await this.model.create({
      ...dexSwap,
      fromAmount: dexSwap.fromAmount.toFixed(8),
      toAmount: dexSwap.toAmount.toFixed(8)
    }, { overwrite: true, return: 'document' })
  }

  async get (id: string): Promise<DexSwap | undefined> {
    const dexSwap = await this.model.get({ id }, { attributes: fetchAttrs, return: 'document' })

    if (dexSwap === undefined) {
      return undefined
    }

    return {
      ...dexSwap,
      fromAmount: new BigNumber(dexSwap.fromAmount),
      toAmount: new BigNumber(dexSwap.toAmount)
    }
  }

  async delete (id: string): Promise<void> {
    const dexSwap = await this.model.get({ id }, { attributes: ['id'], return: 'document' })
    if (dexSwap === undefined) {
      throw new NotFoundException('Attempt to delete non-existent dexSwap')
    }
    await this.model.delete({ id })
  }
}
