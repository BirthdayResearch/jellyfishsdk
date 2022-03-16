import { Schema } from 'dynamoose'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel, Model } from 'nestjs-dynamoose'
import { SortOrder } from 'dynamoose/dist/General'
import { blockchain as defid } from '@defichain/jellyfish-api-core'

export interface BlockKey {
  hash: string // ----------------| partition / hash key; unique id of the block, same as the hash
}

const FIXED_PARTITION_KEY = 0

/**
 * Information about a block in the best chain.
 */
export interface Block extends BlockKey {
  previousHash: string

  height: number
  version: number
  time: number // --------------| block time in seconds since epoch
  medianTime: number // --------| median time of the past 11 block timestamps

  transactionCount: number

  difficulty: number // --------| difficulty of the block.

  masternode: string
  minter: string
  minterBlockCount: number
  reward: string // ------------| reward string as decimal

  stakeModifier: string
  merkleroot: string

  size: number // --------------| block size in bytes
  sizeStripped: number // ------| block size in bytes, excluding witness data.
  weight: number // ------------| block weight as defined in BIP 141

  txns: defid.Transaction[] // -| nested transactions

  _fixedPartitionKey?: 0
}

export const BlockSchema = new Schema({
  hash: {
    type: String,
    hashKey: true
  },
  height: {
    type: Number,
    index: {
      global: true
    }
  },
  previousHash: String,

  version: Number,
  time: Number,
  medianTime: Number,

  transactionCount: Number,

  difficulty: Number,

  masternode: String,
  minter: String,
  minterBlockCount: Number,
  reward: String,

  stakeModifier: String,
  merkleroot: String,

  size: Number,
  sizeStripped: Number,
  weight: Number,

  txns: {
    type: Array,
    schema: [Object]
  },

  // To support queries where only sortKey is provided
  _fixedPartitionKey: {
    default: FIXED_PARTITION_KEY,
    forceDefault: true,
    type: Number,
    index: [
      {
        global: true,
        name: 'height-sorted-list-index',
        rangeKey: 'height'
      }
    ]
  }
}, {
  saveUnknown: true
})

const fetchAttrs = BlockSchema.attributes()
  .filter(attr => !attr.startsWith('_'))

@Injectable()
export class BlockService {
  constructor (
    @InjectModel('Block')
    private readonly model: Model<Block, BlockKey>
  ) {
  }

  async upsert (block: Block): Promise<void> {
    await this.model.create(block, { overwrite: true, return: 'document' })
  }

  async getByHash (hash: string): Promise<Block | undefined> {
    const blocks = await this.model.query('hash').eq(hash).limit(1).attributes(fetchAttrs).exec()
    return blocks[0] ?? undefined
  }

  async getByHeight (height: number): Promise<Block | undefined> {
    const blocks = await this.model.query('height').eq(height).attributes(fetchAttrs).exec()
    return blocks[0] ?? undefined
  }

  async getHighestBlockIdentifiers (): Promise<{ height: number, hash: string } | undefined> {
    const blocks = await this.model
      .query('_fixedPartitionKey').eq(FIXED_PARTITION_KEY)
      .using('height-sorted-list-index')
      .sort(SortOrder.descending)
      .limit(1)
      .attributes(['height', 'hash'])
      .exec()
    if (blocks.length === 0) {
      return undefined
    }
    const { height, hash } = blocks[0]
    return { height, hash }
  }

  async getHighest (): Promise<Block | undefined> {
    const blocks = await this.model
      .query('_fixedPartitionKey').eq(FIXED_PARTITION_KEY)
      .using('height-sorted-list-index')
      .sort(SortOrder.descending)
      .limit(1)
      .attributes(fetchAttrs)
      .exec()
    if (blocks.length === 0) {
      return undefined
    }
    return blocks[0]
  }

  async delete (hash: string): Promise<void> {
    const block = await this.model.get({ hash: hash }, { attributes: ['hash'], return: 'document' })
    if (block === undefined) {
      throw new NotFoundException('Attempt to delete non-existent block')
    }
    await this.model.delete({ hash: block.hash })
  }
}
