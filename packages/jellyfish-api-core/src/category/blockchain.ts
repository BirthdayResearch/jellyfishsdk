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
   * Get various state info regarding blockchain processing.
   * @return Promise<BlockchainInfo>
   */
  async getBlockchainInfo (): Promise<BlockchainInfo> {
    return await this.client.call('getblockchaininfo', [], 'number')
  }

  /**
   * Get details of unspent transaction output (UTXO).
   * @param txId the transaction id
   * @param number vout number
   * @param includeMempool default true, whether to improve mempool
   * @return Promise<UTXO>
   */
  async getTxOut (txId: string, n: number, includeMempool?: boolean): Promise<UTXODetails> {
    return await this.client.call('gettxout', [txId, n, includeMempool], 'number')
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

export interface UTXODetails {
  bestblock: string
  confirmations: number
  value: number
  scriptPubKey: {
    asm: string
    hex: string
    type: string
    reqSigs: number
    addresses: string[]
    tokenId: string
  }
  coinbase: boolean
}
