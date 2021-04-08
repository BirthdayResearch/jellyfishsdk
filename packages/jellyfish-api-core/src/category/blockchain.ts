import BigNumber from 'bignumber.js'
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
   * Returns a string that is serialized, hex-encoded data for block 'hash'
   *
   * @param hash of the block
   * @param verbosity 0
   * @return Promise<string>
   */
  getBlock (hash: string, verbosity: 0): Promise<string>

  /**
   * Get block data with particular header hash.
   * Returns an Object with information about the block 'hash'.
   *
   * @param hash of the block
   * @param verbosity 1
   * @return Promise<Block<string>>
   */
  getBlock (hash: string, verbosity: 1): Promise<Block<string>>

  /**
   * Get block data with particular header hash.
   * Returns an Object with information about block 'hash' and information about each transaction.
   *
   * @param hash of the block
   * @param verbosity 2
   * @return Promise<Block<Transaction>>
   */
  getBlock (hash: string, verbosity: 2): Promise<Block<Transaction>>

  async getBlock<T> (hash: string, verbosity: 0 | 1 | 2): Promise<string | Block<T>> {
    return await this.client.call('getblock', [hash, verbosity], 'number')
  }

  /**
  * Get details of unspent transaction output (UTXO).
  *
  * @param txId the transaction id
  * @param n vout number
  * @param includeMempool default true, whether to include mempool
  * @return Promise<UTXODetails>
  */
  async getTxOut (txId: string, n: number, includeMempool = true): Promise<UTXODetails> {
    return await this.client.call('gettxout', [txId, n, includeMempool], { value: 'bignumber' })
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

export interface Block<T> {
  hash: string
  confirmations: number
  strippedsize: number
  size: number
  weight: number
  height: number
  masternode: string
  minter: string
  mintedBlocks: number
  stakeModifier: string
  version: number
  versionHex: string
  merkleroot: string
  time: number
  mediantime: number
  bits: string
  difficulty: number
  chainwork: string
  tx: T[]
  nTx: number
  previousblockhash: string
  nextblockhash: string
}

export interface Transaction {
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
  scriptPubKey: ScriptPubKey
}
export interface UTXODetails {
  bestblock: string
  confirmations: number
  value: BigNumber
  scriptPubKey: ScriptPubKey
  coinbase: boolean
}

export interface ScriptPubKey {
  asm: string
  hex: string
  type: string
  reqSigs: number
  addresses: string[]
  tokenId: string
}
