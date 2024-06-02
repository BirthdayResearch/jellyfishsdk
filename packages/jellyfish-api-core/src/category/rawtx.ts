import { Vin, Vout } from './blockchain'
import { ApiClient } from '../.'
import BigNumber from 'bignumber.js'

export enum SigHashType {
  ALL = 'ALL',
  NONE = 'NONE',
  SINGLE = 'SINGLE',
  ALL_ANYONECANPAY = 'ALL|ANYONECANPAY',
  NONE_ANYONECANPAY = 'NONE|ANYONECANPAY',
  SINGLE_ANYONECANPAY = 'SINGLE|ANYONECANPAY',
}

/**
 * RawTransaction RPCs for DeFi Blockchain
 */
export class RawTx {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Create a transaction spending the given inputs and creating new outputs that returns a hex-encoded raw transaction.
   * Note that the transaction's inputs are not signed, and it is not stored in the wallet or transmitted to the network.
   *
   * @param {CreateRawTxIn[]} inputs array of inputs
   * @param {CreateRawTxOut[]} outputs array with outputs
   * @param {CreateRawTxOptions} [options]
   * @param {number} [options.locktime] Non-0 value also locktime-activates inputs
   * @param {boolean} [options.replaceable] Marks this transaction as BIP125-replaceable
   * @return {Promise<string>} hex string of the transaction
   */
  async createRawTransaction (
    inputs: CreateRawTxIn[],
    outputs: CreateRawTxOut,
    options: CreateRawTxOptions = {}
  ): Promise<string> {
    const { locktime = 0, replaceable = false } = options

    return await this.client.call('createrawtransaction', [
      inputs, outputs, locktime, replaceable
    ], 'number')
  }

  /**
   * Return a JSON object representing the serialized, hex-encoded transaction.
   * If iswitness is not present, heuristic tests will be used in decoding.
   * If true, only witness deserialization will be tried.
   * If false, only non-witness deserialization will be tried.
   * This boolean should reflect whether the transaction has inputs
   * (e.g. fully valid, or on-chain transactions), if known by the caller.
   *
   * @param {string} hexstring The transaction hex string
   * @param {boolean} iswitness Whether the transaction hex is a serialized witness transaction.
   */
  async decodeRawTransaction (
    hexstring: string,
    iswitness: boolean
  ): Promise<RawTransaction> {
    return await this.client.call('decoderawtransaction', [hexstring, iswitness], 'number')
  }

  /**
   * Sign inputs for raw transaction (serialized, hex-encoded), providing an array of base58-encoded private keys that
   * will be the keys used to sign the transaction. An optional array of previous transaction outputs that this
   * transaction depends on but may not yet be in the blockchain.
   *
   * @param {string} rawTx unsigned raw transaction
   * @param {string[]} privKeys array of base58-encoded private keys for signing (WIF)
   * @param {SignRawTxWithKeyOptions} [options]
   * @param {SigHashType} [options.sigHashType] the signature hash type to use
   * @param {SignRawTxWithKeyPrevTx[]} [options.prevTxs] array of previous dependent transaction outputs
   * @return {Promise<SignRawTxWithKeyResult>}
   */
  async signRawTransactionWithKey (
    rawTx: string,
    privKeys: string[],
    options: SignRawTxWithKeyOptions = {}
  ): Promise<SignRawTxWithKeyResult> {
    const { prevTxs = [], sigHashType = SigHashType.ALL } = options

    return await this.client.call('signrawtransactionwithkey', [
      rawTx, privKeys, prevTxs, sigHashType
    ], 'number')
  }

  /**
   * Returns result of mempool acceptance tests indicating if raw transaction would be accepted by mempool.
   * This checks if the transaction violates the consensus or policy rules. The fee rate is expressed in DFI/kB,
   * using the vSize of the transaction.
   *
   * @param {string} signedTx signed raw transaction
   * @param {BigNumber} maxFeeRate Reject transactions whose fee rate is higher than the specified value. in DFI/kB
   * @return {Promise<TestMempoolAcceptResult>} transaction mempool accept result
   * @see sendRawTransaction
   * @see createRawTransaction
   * @see signRawTransactionWithKey
   */
  async testMempoolAccept (
    signedTx: string,
    maxFeeRate: BigNumber = new BigNumber('0')
  ): Promise<TestMempoolAcceptResult> {
    const results: TestMempoolAcceptResult[] = await this.client.call('testmempoolaccept', [
      [signedTx], maxFeeRate
    ], 'number')
    return results[0]
  }

  /**
   * Submit a raw transaction (serialized, hex-encoded) to the connected node and network. The transaction will be sent
   * unconditionally to all peers, so using this for manual rebroadcast may degrade privacy by leaking the transaction's
   * origin, as nodes will normally not rebroadcast non-wallet transactions already in their mempool.
   *
   * @param {string} signedTx signed raw transaction
   * @param {BigNumber} maxFeeRate Reject transactions whose fee rate is higher than the specified value. in DFI/kB
   * @return {Promise<string>} transaction hash in hex
   * @see testMempoolAccept
   * @see createRawTransaction
   * @see signRawTransactionWithKey
   */
  async sendRawTransaction (
    signedTx: string, maxFeeRate:
    BigNumber = new BigNumber('0')
  ): Promise<string> {
    return await this.client.call('sendrawtransaction', [
      signedTx, maxFeeRate
    ], 'number')
  }

  /**
   * Get raw transaction in hex-encoded format
   *
   * @param {string} txid the transaction id
   * @param {boolean} verbose false
   * @return {Promise<string>}
   */
  getRawTransaction (txid: string, verbose: false): Promise<string>

  /**
   * Get raw transaction with block hash in hex-encoded format
   *
   * @param {string} txid the transaction id
   * @param {boolean} verbose false
   * @param {string} blockHash the block hash
   * @return {Promise<string>}
   */
  getRawTransaction (txid: string, verbose: false, blockHash: string): Promise<string>

  /**
   * Get raw transaction with block hash in hex-encoded format
   *
   * @param {string} txid the transaction id
   * @param {boolean} verbose true will return object information, false/omitted will return hex-encoded data
   * @return {Promise<string | RawTransaction>}
   */
  getRawTransaction (txid: string, verbose: boolean): Promise<string | RawTransaction>

  /**
   * Get raw transaction as json object
   *
   * @param {string} txid the transaction id
   * @param {boolean} verbose false
   * @return {Promise<RawTransaction>}
   */
  getRawTransaction (txid: string, verbose: true): Promise<RawTransaction>

  /**
   * Get raw transaction from block at first by providing block hash, return as json object
   *
   * @param {string} txid the transaction id
   * @param {string} verbose false
   * @param {string} blockHash the block hash
   * @return {Promise<RawTransaction>}
   */
  getRawTransaction (txid: string, verbose: true, blockHash: string): Promise<RawTransaction>

  /**
   * Get raw transaction
   *
   * @param {string} txid transaction id
   * @param {boolean} [verbose=false] true will return object information, false/omitted will return hex-encoded data
   * @param {string} [blockHash] mempool transaction is returned by default. If blockHash is specified then will get transaction in block.
   * @return {Promise<string | RawTransaction>}
   */
  async getRawTransaction (
    txid: string, verbose?: boolean, blockHash?: string
  ): Promise<string | RawTransaction> {
    return await this.client.call('getrawtransaction', [txid, verbose, blockHash], 'number')
  }

  /**
   * Decode a hex-encoded script.
   *
   * @param {string} hexstring The hex-encoded script
   * @return {Promise<DecodeScriptResult>}
   */
  async decodeScript (hexstring: string): Promise<DecodeScriptResult> {
    return await this.client.call('decodescript', [hexstring], 'number')
  }
}

export interface CreateRawTxOptions {
  locktime?: number
  replaceable?: boolean
}

export interface CreateRawTxIn {
  txid: string
  vout: number
  sequence?: number
}

export interface CreateRawTxOut {
  [address: string]: BigNumber
}

export interface SignRawTxWithKeyOptions {
  prevTxs?: SignRawTxWithKeyPrevTx[]
  sigHashType?: SigHashType
}

export interface SignRawTxWithKeyPrevTx {
  /**
   * The transaction id
   */
  txid: string
  /**
   * The output number
   */
  vout: number
  /**
   * Pubkey
   */
  scriptPubKey: string
  /**
   * Required for P2SH or P2WSH
   */
  redeemScript?: string
  /**
   * Required for P2WSH or P2SH-P2WSH witness script
   */
  witnessScript?: string
  /**
   * Required for segwit inputs
   */
  amount?: BigNumber
}

export interface SignRawTxWithKeyResult {
  /**
   * The hex-encoded raw transaction with signature(s)
   */
  hex: string
  /**
   * If the transaction has a complete set of signatures
   */
  complete: boolean
  /**
   * Script verification errors (if there are any)
   */
  errors: SignRawTxWithKeyError[]
}

export interface SignRawTxWithKeyError {
  /**
   * The hash of the referenced, previous transaction
   */
  txid: string
  /**
   * The index of the output to spent and used as input
   */
  vout: number
  /**
   * The hex-encoded signature script
   */
  scriptSig: string
  /**
   * Script sequence number
   */
  sequence: number
  /**
   * Verification or signing error related to the input
   */
  error: string
}

export interface TestMempoolAcceptResult {
  /**
   * The transaction hash in hex
   */
  txid: string
  /**
   * If the mempool allows this tx to be inserted
   */
  allowed: boolean
  /**
   * Rejection string, only present when 'allowed' is false
   */
  'reject-reason'?: string
}

export interface RawTransaction {
  /**
   * Specified the block whether is in active chain
   */
  in_active_chain?: boolean
  /**
   * The transaction id
   */
  txid: string
  /**
   * The transaction hash
   */
  hash: string
  /**
   * The version
   */
  version: number
  /**
   * The serialized transaction size
   */
  size: number
  /**
   * The virtual transaction size
   */
  vsize: number
  /**
   * The transaction's weight (between vsize*4-3 and vsize*3)
   */
  weight: number
  /**
   * The lock time
   */
  locktime: number
  /**
   * Vector input
   */
  vin: Vin[]
  /**
   * Vector output
   */
  vout: Vout[]
  /**
   * The serialized, hex-encoded for 'txid'
   */
  hex: string
  /**
   * the block hash
   */
  blockhash: string
  /**
   * Number of block confirmations
   */
  confirmations: number
  /**
   * Same as 'blocktime'
   */
  time: number
  /**
   * The block time in seconds since epoch (Jan 1 1970 GMT)
   */
  blocktime: number
}

export interface DecodeScriptResult {
  /**
   * Script public key
   */
  asm: string
  /**
   * The output type
   */
  type: string
  /**
   * The required signatures
   */
  reqSigs: number
  /**
   * DeFi address
   */
  addresses: string[]
  /**
   * address of P2SH script wrapping this redeem script (not returned if the script is already a P2SH)
   */
  p2sh: string
  /**
   * Result of a witness script public key wrapping this redeem script (not returned if the script is a P2SH or witness)
   */
  segwit: {
    /**
     * String representation of the script public key
     */
    asm: string
    /**
     * Hex string of the script public key
     */
    hex: string
    /**
     * The type of the script public key (e.g. witness_v0_keyhash or witness_v0_scripthash)
     */
    type: string
    /**
     * The required signatures (always 1)
     */
    reqSigs: number
    /**
     * segwit address
     */
    addresses: string[] // (always length 1)
    /**
     * address of the P2SH script wrapping this witness redeem script
     */
    p2shsegwit: string
  }
}
