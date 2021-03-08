import { JellyfishClient } from '../core'

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

/**
 * Minting related RPC calls for DeFiChain
 */
export class Mining {
  private readonly client: JellyfishClient

  constructor (client: JellyfishClient) {
    this.client = client
  }

  /**
   * Get mining-related information
   */
  async getMintingInfo (): Promise<MintingInfo> {
    return await this.client.call('getmintinginfo', [])
  }
}
