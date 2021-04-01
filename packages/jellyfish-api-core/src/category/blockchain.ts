import { ApiClient } from '../.'

type BlockVerbo0 = 'string'
export type BlockVerbo = BlockVerbo2 | BlockVerbo1 | BlockVerbo0

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
   * Get a hash of block in best-block-chain at height provided.
   * @param height
   * @return Promise<string>
   */
  async getBlockHash (height: number): Promise<string> {
    return await this.client.call('getblockhash', [height], 'number')
  }

  /**
   * Get the height of the most-work fully-validated chain.
   * @return Promise<number>
   */
  async getBlockCount (): Promise<number> {
    return await this.client.call('getblockcount', [], 'number')
  }

  /**
   * Get block data with particular header hash.
   * @param blockHash
   * @param verbosity optional, default is 1, 0 for hex encoded
   * @return Promise<BlockVerbo>
   */
  async getBlock (blockHash: string, verbosity?: number): Promise<BlockVerbo2>
  async getBlock (blockHash: string, verbosity?: number): Promise<BlockVerbo1>
  async getBlock (blockHash: string, verbosity?: number): Promise<BlockVerbo0>
  async getBlock (blockHash: string, verbosity?: number): Promise<BlockVerbo> {
    return await this.client.call('getblock', [blockHash, verbosity], 'number')
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

export interface BlockBase {
  hash: string
  confirmations: number
  strippedsize: number
  size: number
  weight: number
  height: number
  masternode: string
  minter: string
  mintedBlocks: any
  stakeModifier: any
  version: number
  versionHex: string
  merkleroot: string
  time: number
  mediantime: number
  bits: string
  difficulty: number
  chainwork: string
  nTx: number
  previousblockhash: string
  nextblockhash: string
}

export interface BlockVerbo1 extends BlockBase {
  tx: string[]
}

export interface BlockVerbo2 extends BlockBase {
  tx: RawTx[]
}

export interface RawTx {
  txid: string
  hash: string
  version: number
  size: number
  vsize: number
  weight: number
  locktime: number
  vin: Vin[]
  vout: Vout[]
  hex: string
}

export interface Vin {
  coinbase: string
  txid: string
  vout: number
  scriptSig: {
    asm: string
    hex: string
  }
  txinwitness: string[]
  sequence: string
}

export interface Vout {
  value: number
  n: number
  scriptPubKey: {
    asm: string
    hex: string
    type: string
    reqSigs: number
    addresses: string[]
    tokenId: string
  }
}
