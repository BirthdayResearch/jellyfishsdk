import { BigNumber, ApiClient } from '../.'

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

  private static asHex (rawTx: string | Buffer): string {
    return Buffer.isBuffer(rawTx) ? rawTx.toString('hex') : rawTx
  }

  /**
   * Create a transaction spending the given inputs and creating new outputs.
   * Returns hex-encoded raw transaction.
   * Note that the transaction's inputs are not signed, and
   * it is not stored in the wallet or transmitted to the network.
   *
   * @param inputs {CreateRawTxIn[]} array of inputs
   * @param outputs {CreateRawTxOut[]} array with outputs
   * @param options {CreateRawTxOptions}
   * @param options.locktime {number} Non-0 value also locktime-activates inputs
   * @param options.replaceable {boolean} Marks this transaction as BIP125-replaceable
   * @return {Promise<string>} hex string of the transaction (Little Endian)
   */
  async createRawTransaction (
    inputs: CreateRawTxIn[],
    outputs: CreateRawTxOut[],
    options: CreateRawTxOptions = {}
  ): Promise<string> {
    const { locktime = 0, replaceable = false } = options

    return await this.client.call('createrawtransaction', [
      inputs, outputs, locktime, replaceable
    ], 'number')
  }

  /**
   * Sign inputs for raw transaction (serialized, hex-encoded).
   * The second argument is an array of base58-encoded private
   * keys that will be the only keys used to sign the transaction.
   * The third optional argument (may be null) is an array of previous transaction outputs that
   * this transaction depends on but may not yet be in the block chain.
   *
   * @param rawTx {string|Buffer} unsigned raw transaction
   * @param privKeys {string[] | Buffer[]} array of base58-encoded private keys for signing (WIF)
   * @param prevTxs {SignRawTxWithKeyPrevTx[]} array of previous dependent transaction outputs
   * @param options {SignRawTxWithKeyOptions}
   * @param options.sigHashType {SigHashType} The signature hash type to use
   * @return {Promise<SignRawTxWithKeyResult>}
   */
  async signRawTransactionWithKey (
    rawTx: string | Buffer,
    privKeys: string[],
    prevTxs: SignRawTxWithKeyPrevTx[],
    options: SignRawTxWithKeyOptions = {}
  ): Promise<SignRawTxWithKeyResult> {
    const hex = RawTx.asHex(rawTx)
    const { sigHashType = SigHashType.ALL } = options
    return await this.client.call('signrawtransactionwithkey', [
      hex, privKeys, prevTxs, sigHashType
    ], 'number')
  }

  /**
   * Returns result of mempool acceptance tests indicating if raw transaction would be accepted by mempool.
   * This checks if the transaction violates the consensus or policy rules.
   *
   * @param signedTx {string|Buffer} signed raw transaction
   * @param maxFeeRate {BigNumber} Reject transactions whose fee rate is higher than the specified value.
   * @return {Promise<TestMempoolAcceptResult>} transaction mempool accept result
   * @see sendRawTransaction
   * @see createRawTransaction
   * @see signRawTransactionWithKey
   */
  async testMempoolAccept (signedTx: string | Buffer, maxFeeRate: BigNumber = new BigNumber('0')): Promise<TestMempoolAcceptResult> {
    const hex = RawTx.asHex(signedTx)
    const results: TestMempoolAcceptResult[] = await this.client.call('testmempoolaccept', [
      [hex], maxFeeRate
    ], 'number')
    return results[0]
  }

  /**
   * Submit a raw transaction (serialized, hex-encoded) to connected node and network.
   * Note that the transaction will be sent unconditionally to all peers, so using this
   * for manual rebroadcast may degrade privacy by leaking the transaction's origin, as
   * nodes will normally not rebroadcast non-wallet transactions already in their mempool.
   *
   * @param signedTx {string|Buffer} signed raw transaction
   * @param maxFeeRate {BigNumber} Reject transactions whose fee rate is higher than the specified value.
   * @return {Promise<string>} transaction hash in hex
   * @see testMempoolAccept
   * @see createRawTransaction
   * @see signRawTransactionWithKey
   */
  async sendRawTransaction (signedTx: string | Buffer, maxFeeRate: BigNumber = new BigNumber('0')): Promise<string> {
    const hex = RawTx.asHex(signedTx)
    return await this.client.call('sendrawtransaction', [
      hex, maxFeeRate
    ], 'number')
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
   * required for P2SH or P2WSH
   */
  redeemScript?: string
  /**
   * The amount spent
   */
  amount: BigNumber
}

export interface SignRawTxWithKeyOptions {
  sigHashType?: SigHashType
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
  errors: Array<{
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
  }>
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
  ['reject-reason']?: string
}
