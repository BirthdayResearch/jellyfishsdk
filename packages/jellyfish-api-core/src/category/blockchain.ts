import { ApiClient } from '../.'

/**
 * Blockchain related RPC calls for DeFiChain
 */
export class Blockchain {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Returns an object containing various state info regarding blockchain processing.
   * @return Promise<BlockchainInfo>
   */
  async getBlockchainInfo (): Promise<BlockchainInfo> {
    return await this.client.call('getblockchaininfo', [], 'number')
  }
}

/**
 * TODO(fuxingloh): defid prune=1 is not type supported yet
 */
export interface BlockchainInfo {
  chain: 'main' | 'test' | 'regtest' | string
  blocks: number
  headers: number
  bestblockhash: string
  difficulty: number
  mediantime: number
  verificationprogress: number
  initialblockdownload: boolean
  chainwork: string
  size_on_disk: number
  pruned: boolean
  softforks: {
    [id: string]: {
      type: 'buried' | 'bip9'
      active: boolean
      height: number
    }
  }
  warnings: string
}
