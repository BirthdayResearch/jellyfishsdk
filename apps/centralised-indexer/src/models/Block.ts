import { Schema } from 'dynamoose'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel, Model } from 'nestjs-dynamoose'
import { SortOrder } from 'dynamoose/dist/General'

export interface BlockKey {
  hash: string // ----------------| partition / hash key; unique id of the block, same as the hash
}

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

  // To support queries where only sortKey is provided
  _fixedPartitionKey: {
    type: Number, // 0
    index: [
      { // support query for highest block
        global: true,
        name: 'height-sorted-list-index',
        rangeKey: 'height'
      }
    ]
  }
})

const FIXED_PARTITION_KEY = 0

function getBlockKey (block: Block): BlockKey {
  return { hash: block.hash }
}

@Injectable()
export class BlockService {
  constructor (
    @InjectModel('Block')
    private readonly model: Model<Block, BlockKey>
  ) {
  }

  async upsert (block: Block): Promise<void> {
    await this.model.create(
      { ...block, _fixedPartitionKey: FIXED_PARTITION_KEY },
      { overwrite: true, return: 'document' }
    )
  }

  async getByHash (hash: string): Promise<Block | undefined> {
    const block = await this.model.query('hash').eq(hash).limit(1).exec()
    return block[0]
  }

  async getByHeight (height: number): Promise<Block | undefined> {
    const blocks = await this.model.query('height').eq(height).exec()
    return blocks[0] ?? undefined
  }

  async getHighest (): Promise<Block | undefined> {
    const blocks = await this.model
      .query('_fixedPartitionKey').eq(FIXED_PARTITION_KEY)
      .using('height-sorted-list-index')
      .sort(SortOrder.descending)
      .limit(1)
      .exec()
    if (blocks.length === 0) {
      return undefined
    }
    return blocks[0]
  }

  async delete (hash: string): Promise<void> {
    const block = await this.model.get({ hash: hash })
    if (block === undefined) {
      throw new NotFoundException('Attempt to delete non-existent block')
    }
    await this.model.delete(getBlockKey(block))
  }
}
