import { ApiClient } from '../.'

/**
 * Mining RPCs for DeFi Blockchain
 */
export class Mining {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Returns the estimated network hashes per second
   *
   * @param {number} nblocks to estimate since last difficulty change.
   * @param {number} height to estimate at the time of the given height.
   * @return {Promise<number>}
   */
  async getNetworkHashPerSecond (nblocks: number = 120, height: number = -1): Promise<number> {
    return await this.client.call('getnetworkhashps', [nblocks, height], 'number')
  }

  /**
   * Get minting-related information
   * @return {Promise<MintingInfo>}
   */
  async getMintingInfo (): Promise<MintingInfo> {
    return await this.client.call('getmintinginfo', [], 'number')
  }
}

/**
 * Minting related information
 */
export interface MintingInfo {
  blocks: number
  currentblockweight?: number
  currentblocktx?: number
  difficulty: string
  isoperator: boolean
  masternodeid?: string
  masternodeoperator?: string
  masternodestate?: 'PRE_ENABLED' | 'ENABLED' | 'PRE_RESIGNED' | 'RESIGNED' | 'PRE_BANNED' | 'BANNED'
  generate?: boolean
  mintedblocks?: number
  networkhashps: number
  pooledtx: number
  chain: 'main' | 'test' | 'regtest' | string
  warnings: string
}
