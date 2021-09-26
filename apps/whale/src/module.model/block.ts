import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const BlockMapping: ModelMapping<Block> = {
  type: 'block',
  index: {
    height: {
      name: 'block_height',
      partition: {
        type: 'number',
        key: (b: Block) => b.height
      }
    }
  }
}

@Injectable()
export class BlockMapper {
  public constructor (protected readonly database: Database) {
  }

  async getByHash (hash: string): Promise<Block | undefined> {
    return await this.database.get(BlockMapping, hash)
  }

  async getByHeight (height: number): Promise<Block | undefined> {
    return await this.database.get(BlockMapping.index.height, height)
  }

  async getHighest (): Promise<Block | undefined> {
    const blocks = await this.database.query(BlockMapping.index.height, {
      order: SortOrder.DESC,
      limit: 1
    })
    return blocks.length === 0 ? undefined : blocks[0]
  }

  async queryByHeight (limit: number, lt?: number): Promise<Block[]> {
    return await this.database.query(BlockMapping.index.height, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async put (block: Block): Promise<void> {
    return await this.database.put(BlockMapping, block)
  }

  async delete (hash: string): Promise<void> {
    return await this.database.delete(BlockMapping, hash)
  }
}

/**
 * Information about a block in the best chain.
 */
export interface Block extends Model {
  id: string // ----------------| unique id of the block, same as the hash
  hash: string
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
}
