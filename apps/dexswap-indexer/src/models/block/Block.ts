import { Injectable } from '@nestjs/common'
import { blockchain as defid } from '@defichain/jellyfish-api-core'
import { Database, Model, ModelMapping, SortOrder } from '../../indexer/database/_abstract'
import { makeDynamooseSchema } from '../../indexer/database/DynamoDb'

/**
 * Information about a block in the best chain.
 */
export interface Block extends Model {
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
}

interface _Block extends Block {
  _fixedPartitionKey: 0
}

const BlockMapping: ModelMapping<_Block> = {
  type: 'Block',
  attributes: [
    'id',
    'previousHash',
    'height',
    'version',
    'time',
    'medianTime',
    'transactionCount',
    'difficulty',
    'masternode',
    'minter',
    'minterBlockCount',
    'reward',
    'stakeModifier',
    'merkleroot',
    'size',
    'sizeStripped',
    'weight',
    'txns'
  ],
  index: {
    heightSortedList: {
      name: 'height-sorted-list',
      partition: {
        type: 'number',
        attributeName: '_fixedPartitionKey'
      },
      sort: {
        type: 'number',
        attributeName: 'height'
      }
    }
  }
}

@Injectable()
export class BlockMapper {
  constructor (
    private readonly database: Database
  ) {
  }

  async put (block: Block): Promise<void> {
    await this.database.put<_Block>(BlockMapping, { ...block, _fixedPartitionKey: 0 })
  }

  async getByHash (hash: string): Promise<Block | undefined> {
    return await this.database.getById<_Block>(BlockMapping, hash)
  }

  async getByHeight (height: number): Promise<Block | undefined> {
    return await this.database.getByIndex<_Block>(BlockMapping, BlockMapping.index.heightSortedList, 0, height)
  }

  async getHighestBlockIdentifiers (): Promise<{ height: number, hash: string } | undefined> {
    // TODO(eli-lim): Allow database to fetch selected attributes
    const highestBlock = await this.getHighest()
    if (highestBlock === undefined) {
      return undefined
    }
    return {
      hash: highestBlock.id,
      height: highestBlock.height
    }
  }

  async getHighest (): Promise<Block | undefined> {
    const { data: blocks } = await this.database.query<_Block>(BlockMapping, BlockMapping.index.heightSortedList, {
      partitionKey: 0,
      limit: 1,
      order: SortOrder.DESC
    })
    if (blocks === undefined || blocks.length === 0) {
      return undefined
    }
    return blocks[0]
  }

  async delete (hash: string): Promise<void> {
    await this.database.delete<_Block>(BlockMapping, hash)
  }
}

export const BlockSchema = makeDynamooseSchema<_Block>(BlockMapping)
