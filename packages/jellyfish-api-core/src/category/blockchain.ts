import BigNumber from 'bignumber.js'
import { ApiClient } from '../.'

/**
 * Blockchain RPCs for DeFi Blockchain
 */
export class Blockchain {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Get various state info regarding blockchain processing.
   *
   * @return {Promise<BlockchainInfo>}
   */
  async getBlockchainInfo (): Promise<BlockchainInfo> {
    return await this.client.call('getblockchaininfo', [], 'number')
  }

  /**
   * Get a hash of block in best-block-chain at height provided.
   *
   * @param {number} height
   * @return {Promise<string>}
   */
  async getBlockHash (height: number): Promise<string> {
    return await this.client.call('getblockhash', [height], 'number')
  }

  /**
   * Get the height of the most-work fully-validated chain.
   *
   * @return {Promise<number>}
   */
  async getBlockCount (): Promise<number> {
    return await this.client.call('getblockcount', [], 'number')
  }

  /**
   * Get block string hex with a provided block header hash.
   *
   * @param {string} hash of the block
   * @param {number} verbosity 0
   * @return {Promise<string>} block as string that is serialized, hex-encoded data
   */
  getBlock (hash: string, verbosity: 0): Promise<string>

  /**
   * Get block data with a provided block header hash.
   *
   * @param {string} hash of the block
   * @param {number} verbosity 1
   * @return {Promise<Block<string>>} block information with transaction as txid
   */
  getBlock (hash: string, verbosity: 1): Promise<Block<string>>

  /**
   * Get block data with a provided block header hash.
   *
   * @param {string} hash of the block
   * @param {number} verbosity 2
   * @return {Promise<Block<Transaction>>} block information and detailed information about each transaction.
   */
  getBlock (hash: string, verbosity: 2): Promise<Block<Transaction>>

  async getBlock<T> (hash: string, verbosity: 0 | 1 | 2): Promise<string | Block<T>> {
    return await this.client.call('getblock', [hash, verbosity], verbosity === 2
      ? {
          tx: {
            vout: {
              value: 'bignumber'
            }
          }
        }
      : 'number')
  }

  /**
   * Get block header data with particular header hash.
   * Returns an Object with information for block header.
   *
   * @param {string} hash of the block
   * @param {boolean} verbosity true
   * @return {Promise<BlockHeader>}
   */
  getBlockHeader (hash: string, verbosity: true): Promise<BlockHeader>

  /**
   * Get block header data with particular header hash.
   * Returns a string that is serialized, hex-encoded data for block header.
   *
   * @param {string} hash of the block
   * @param {boolean} verbosity false
   * @return {Promise<string>}
   */
  getBlockHeader (hash: string, verbosity: false): Promise<string>

  async getBlockHeader (hash: string, verbosity: boolean): Promise<string | BlockHeader> {
    return await this.client.call('getblockheader', [hash, verbosity], 'number')
  }

  /**
   * Return information about all known tips in the block tree
   * including the main chain as well as orphaned branches.
   *
   * @return {Promise<ChainTip[]>}
   */
  async getChainTips (): Promise<ChainTip[]> {
    return await this.client.call('getchaintips', [], 'number')
  }

  /**
   * Get the proof-of-work difficulty as a multiple of the minimum difficulty.
   *
   * @return {Promise<number>}
   */
  async getDifficulty (): Promise<number> {
    return await this.client.call('getdifficulty', [], 'number')
  }

  /**
   * Get details of unspent transaction output (UTXO).
   *
   * @param {string} txId the transaction id
   * @param {number} index vout number
   * @param {boolean} includeMempool default true, whether to include mempool
   * @return {Promise<UTXODetails>}
   */
  async getTxOut (txId: string, index: number, includeMempool = true): Promise<UTXODetails> {
    return await this.client.call('gettxout', [
      txId, index, includeMempool
    ], {
      value: 'bignumber'
    })
  }

  /**
   * Returns statistics about the unspent transaction output set.
   * Note this call may take some time.
   *
   * @return {Promise<TxOutSetInfo>}
   */
  async getTxOutSetInfo (): Promise<TxOutSetInfo> {
    return await this.client.call('gettxoutsetinfo', [], {
      total_amount: 'bignumber'
    })
  }

  /**
   * Get all transaction ids in memory pool as string
   *
   * @param {boolean} verbose false
   * @return {Promise<string[]>}
   */
  getRawMempool (verbose: false): Promise<string[]>

  /**
   * Get all transaction ids in memory pool as json object
   *
   * @param {boolean} verbose true
   * @return {Promise<MempoolTx>}
   */
  getRawMempool (verbose: true): Promise<MempoolTx>

  /**
   * Get all transaction ids in memory pool as string[] if verbose is false
   * else as json object
   *
   * @param {boolean} verbose default = false, true for json object, false for array of transaction ids
   * @return {Promise<string[] | MempoolTx>}
   */
  async getRawMempool (verbose: boolean): Promise<string[] | MempoolTx> {
    return await this.client.call('getrawmempool', [verbose], 'bignumber')
  }

  /**
   * Get all in-mempool ancestors for a given transaction as string[]
   *
   * @param {string} txId the transaction id
   * @param {boolean} verbose false
   * @return {Promise<string[]>}
   */
  getMempoolAncestors (txId: string, verbose?: false): Promise<string[]>

  /**
   * Get all in-mempool ancestors for a given transaction as json object
   *
   * @param {string} txId the transaction id
   * @param {boolean} verbose true
   * @return {Promise<MempoolTx>}
   */
  getMempoolAncestors (txId: string, verbose?: true): Promise<MempoolTx>

  /**
   * Get all in-mempool ancestors if txId is in mempool as string[] if verbose is false
   * else as json object
   *
   * @param {string} txId the transaction id
   * @param {boolean} verbose default = false, true for json object, false for array of transaction ids
   * @return {Promise<string[] | MempoolTx>}
   */
  async getMempoolAncestors (txId: string, verbose: boolean = false): Promise<string[] | MempoolTx> {
    return await this.client.call('getmempoolancestors', [txId, verbose], 'bignumber')
  }

  /**
  * Get all in-mempool descendants for a given transaction as string[]
  *
  * @param {string} txId the transaction id
  * @param {boolean} verbose false
  * @return {Promise<string[]>}
  */
  getMempoolDescendants (txId: string, verbose?: false): Promise<string[]>

  /**
  * Get all in-mempool descendants for a given transaction as json object
  *
  * @param {string} txId the transaction id
  * @param {boolean} verbose true
  * @return {Promise<MempoolTx>}
  */
  getMempoolDescendants (txId: string, verbose?: true): Promise<MempoolTx>

  /**
   * Get all in-mempool descendants if txId is in mempool as string[] if verbose is false
   * else as json object
   *
   * @param {string} txId the transaction id
   * @param {boolean} verbose default = false, true for json object, false for array of transaction ids
   * @return {Promise<string[] | MempoolTx>}
   */
  async getMempoolDescendants (txId: string, verbose: boolean = false): Promise<string[] | MempoolTx> {
    return await this.client.call('getmempooldescendants', [txId, verbose], 'bignumber')
  }

  /**
   * Get mempool data for the given transaction
   * @param {string} txId the transaction id
   * @return {Promise<MempoolTx>}
   */
  async getMempoolEntry (txId: string): Promise<MempoolTx> {
    return await this.client.call('getmempoolentry', [txId], 'bignumber')
  }

  /**
   * Get block statistics for a given window.
   *
   * @param {number} hashOrHeight  The block hash or height of the target block.
   * @param {Array<keyof BlockStats>} stats Default = all values. See BlockStats Interface.
   * @return {Promise<BlockStats>}
   */
  async getBlockStats (hashOrHeight: number | string, stats?: Array<keyof BlockStats>): Promise<BlockStats> {
    return await this.client.call('getblockstats', [hashOrHeight, stats], 'number')
  }

  /**
   * Get the hash of the best (tip) block in the most-work fully-validated chain.
   *
   * @returns {Promise<string>}
   */
  async getBestBlockHash (): Promise<string> {
    return await this.client.call('getbestblockhash', [], 'number')
  }

  /**
   * Returns details on the active state of the TX memory pool.
   *
   * @return {Promise<MempoolInfo>}
   */
  async getMempoolInfo (): Promise<MempoolInfo> {
    return await this.client.call('getmempoolinfo', [], { mempoolminfee: 'bignumber', minrelaytxfee: 'bignumber' })
  }

  /**
   * Wait for any new block
   *
   * @param {number} [timeout=30000] in millis
   * @return Promise<WaitBlockResult> the current block on timeout or exit
   */
  async waitForNewBlock (timeout: number = 30000): Promise<WaitBlockResult> {
    return await this.client.call('waitfornewblock', [timeout], 'number')
  }

  /**
   * Waits for a specific new block and returns useful info about it.
   *
   * @param {string} blockhash Block hash to wait for.
   * @param {number} [timeout=30000] in millis
   * @return Promise<WaitBlockResult> the current block on timeout or exit
   */
  async waitForBlock (blockhash: string, timeout: number = 30000): Promise<WaitBlockResult> {
    return await this.client.call('waitforblock', [blockhash, timeout], 'number')
  }

  /**
   * Waits for block height equal or higher than provided and returns the height and hash of the current tip.
   *
   *
   * @param {number} height
   * @param {number} [timeout=30000] in millis
   * @return Promise<WaitBlockResult> the current block on timeout or exit
   */
  async waitForBlockHeight (height: number, timeout: number = 30000): Promise<WaitBlockResult> {
    return await this.client.call('waitforblockheight', [height, timeout], 'number')
  }

  /**
   * Get statistics about the total number and rate of transactions in the chain.
   *
   * @param {number} [nBlocks] size of the window in number of blocks. Defaults to 1 month (~86,400) blocks.
   * @param {string} [blockHash] the hash of the block that ends the window. Defaults to the chain tip.
   * @return {Promise<ChainTxStats>}
   */
  async getChainTxStats (nBlocks?: number, blockHash?: string): Promise<ChainTxStats> {
    return await this.client.call('getchaintxstats', [nBlocks, blockHash], 'number')
  }

  /**
   * Permanently marks a block as invalid, as if it violated a consensus rule.
   *
   * @param {string} blockHash the hash of the block to invalidate
   * @return {Promise<void>}
   */
  async invalidateBlock (blockHash: string): Promise<void> {
    return await this.client.call('invalidateblock', [blockHash], 'number')
  }

  /**
   * Removes invalidity status of a block, its ancestors and its descendants, reconsider them for activation.
   * This can be used to undo the effects of invalidateBlock.
   *
   * @param {string} blockHash the hash of the block to invalidate
   * @return {Promise<void>}
   */
  async reconsiderBlock (blockHash: string): Promise<void> {
    return await this.client.call('reconsiderblock', [blockHash], 'number')
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

export interface BlockHeader {
  hash: string
  confirmations: number
  height: number
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
  coinbase?: string
  txid: string
  vout: number
  scriptSig: {
    asm: string
    hex: string
  }
  txinwitness?: string[]
  sequence: string
}

export interface Vout {
  value: BigNumber
  n: number
  scriptPubKey: ScriptPubKey
  tokenId: number
}

export interface UTXODetails {
  bestblock: string
  confirmations: number
  value: BigNumber
  scriptPubKey: ScriptPubKey
  coinbase: boolean
}

export interface TxOutSetInfo {
  height: number
  bestblock: string
  transactions: Number
  txouts: Number
  bogosize: Number
  hash_serialized_2: string
  disk_size: Number
  total_amount: BigNumber
}

export interface ScriptPubKey {
  asm: string
  hex: string
  type: string
  reqSigs: number
  addresses: string[]
}

export interface ChainTip {
  height: number
  hash: string
  branchlen: number
  status: string
}

export interface MempoolTx {
  [key: string]: {
    vsize: BigNumber
    /**
     * @deprecated same as vsize. Only returned if defid is started with -deprecatedrpc=size
     */
    size: BigNumber
    weight: BigNumber
    fee: BigNumber
    modifiedfee: BigNumber
    time: BigNumber
    height: BigNumber
    descendantcount: BigNumber
    descendantsize: BigNumber
    descendantfees: BigNumber
    ancestorcount: BigNumber
    ancestorsize: BigNumber
    ancestorfees: BigNumber
    wtxid: string
    fees: {
      base: BigNumber
      modified: BigNumber
      ancestor: BigNumber
      descendant: BigNumber
    }
    depends: string[]
    spentby: string[]
    'bip125-replaceable': boolean
  }
}

export interface BlockStats {
  avgfee: number
  avgfeerate: number
  avgtxsize: number
  blockhash: string
  height: number
  ins: number
  maxfee: number
  maxfeerate: number
  maxtxsize: number
  medianfee: number
  mediantime: number
  mediantxsize: number
  minfee: number
  minfeerate: number
  mintxsize: number
  outs: number
  subsidy: number
  swtxs: number
  time: number
  totalfee: number
  txs: number
  swtotal_size: number
  swtotal_weight: number
  total_out: number
  total_size: number
  total_weight: number
  utxo_increase: number
  utxo_size_inc: number
  feerate_percentiles: [number, number, number, number, number]
}

export interface MempoolInfo {
  loaded: boolean
  size: number
  bytes: number
  usage: number
  maxmempool: number
  mempoolminfee: BigNumber
  minrelaytxfee: BigNumber
}

export interface WaitBlockResult {
  hash: string
  height: number
}

export interface ChainTxStats {
  time: number
  txcount: number
  window_final_block_hash: string
  window_final_block_height: number
  window_block_count: number
  window_tx_count: number
  window_interval: number
  txrate: number
}
