import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'
import { Transaction } from './transactions'

export class Blocks {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * @param {number} [size=30] size to query
   * @param {string} [next] next token for next slice of blocks
   * @return {Promise<ApiPagedResponse<Block>>}
   */
  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<Block>> {
    return await this.client.requestList('GET', 'blocks', size, next)
  }

  /**
   * @param {string} id as hash or height of the block
   * @return {Promise<<Block>}
   */
  async get (id: string): Promise<Block> {
    return await this.client.requestData('GET', `blocks/${id}`)
  }

  /**
   * @param {string} hash of the block
   * @param {number} [size=30] size to query
   * @param {string} [next] next token for next slice of blocks
   * @return {Promise<ApiPagedResponse<Transaction>>}
   */
  async getTransactions (hash: string, size: number = 30, next?: string): Promise<ApiPagedResponse<Transaction>> {
    return await this.client.requestList('GET', `blocks/${hash}/transactions`, size, next)
  }
}

/**
 * Information about a block in the best chain.
 */
export interface Block {
  id: string // ----------------| unique id of the block, same as the hash
  hash: string
  previousHash: string

  height: number
  version: number
  time: number // --------------| block time in seconds since epoch
  medianTime: number // --------| median time of the past 11 block timestamps

  transactionCount: number // TODO(fuxingloh): should be structured as `count: { transaction: number }`, too late to change now

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
