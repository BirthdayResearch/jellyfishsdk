import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

/**
 * DeFi whale endpoint for masternode related services.
 */
export class Masternodes {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Get list of masternodes.
   *
   * @param {number} size masternodes size to query
   * @param {string} next  set of masternodes to get
   * @return {Promise<ApiPagedResponse<MasternodeData>>}
   */
  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<MasternodeData>> {
    return await this.client.requestList('GET', 'masternodes', size, next)
  }

  /**
   * Get information about a masternode with given id.
   *
   * @param {string} id masternode id to get
   * @return {Promise<MasternodeData>}
   */
  async get (id: string): Promise<MasternodeData> {
    return await this.client.requestData('GET', `masternodes/${id}`)
  }
}

/**
 * Masternode data
 *
 * timelock is the number of weeks the masternode
 * is locked up for
 */
export interface MasternodeData {
  id: string
  sort: string
  state: MasternodeState
  mintedBlocks: number
  owner: {
    address: string
  }
  operator: {
    address: string
  }
  creation: {
    height: number
  }
  resign?: {
    tx: string
    height: number
  }
  timelock: number
}

/**
 * Masternode state
 */
export enum MasternodeState {
  PRE_ENABLED = 'PRE_ENABLED',
  ENABLED = 'ENABLED',
  PRE_RESIGNED = 'PRE_RESIGNED',
  RESIGNED = 'RESIGNED',
  PRE_BANNED = 'PRE_BANNED',
  BANNED = 'BANNED',
  UNKNOWN = 'UNKNOWN'
}
