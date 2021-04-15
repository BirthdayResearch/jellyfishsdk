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

  /**
   * Create a transaction spending the given inputs and creating new outputs.
   * Returns hex-encoded raw transaction.
   * Note that the transaction's inputs are not signed, and
   * it is not stored in the wallet or transmitted to the network.
   *
   * @param {CreateRawTxIn[]} inputs array of inputs
   * @param {CreateRawTxOut[]} outputs array with outputs
   * @param {CreateRawTxOptions} options
   * @param {number} options.locktime Non-0 value also locktime-activates inputs
   * @param {boolean} options.replaceable Marks this transaction as BIP125-replaceable
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
   * Sign inputs for raw transaction (serialized, hex-encoded).
   * The second argument is an array of base58-encoded private
   * keys that will be the only keys used to sign the transaction.
   * The third optional argument (may be null) is an array of previous transaction outputs that
   * this transaction depends on but may not yet be in the block chain.
   *
   * @param {string} rawTx unsigned raw transaction
   * @param {string[]} privKeys array of base58-encoded private keys for signing (WIF)
   * @param {SignRawTxWithKeyPrevTx[]} prevTxs array of previous dependent transaction outputs
   * @param {SignRawTxWithKeyOptions} options
   * @param {SigHashType} options.sigHashType The signature hash type to use
   * @return {Promise<SignRawTxWithKeyResult>}
   */
  async signRawTransactionWithKey (
    rawTx: string,
    privKeys: string[],
    prevTxs?: SignRawTxWithKeyPrevTx[],
    options: SignRawTxWithKeyOptions = {}
  ): Promise<SignRawTxWithKeyResult> {
    const { sigHashType = SigHashType.ALL } = options
    return await this.client.call('signrawtransactionwithkey', [
      rawTx, privKeys, prevTxs, sigHashType
    ], 'number')
  }

  /**
   * Returns result of mempool acceptance tests indicating if raw transaction would be accepted by mempool.
   * This checks if the transaction violates the consensus or policy rules.
   *
   * @param {string} signedTx signed raw transaction
   * @param {BigNumber} maxFeeRate Reject transactions whose fee rate is higher than the specified value. in DFI/kB
   * @return {Promise<TestMempoolAcceptResult>} transaction mempool accept result
   * @see sendRawTransaction
   * @see createRawTransaction
   * @see signRawTransactionWithKey
   */
  async testMempoolAccept (signedTx: string, maxFeeRate: BigNumber = new BigNumber('0')): Promise<TestMempoolAcceptResult> {
    const results: TestMempoolAcceptResult[] = await this.client.call('testmempoolaccept', [
      [signedTx], maxFeeRate
    ], 'number')
    return results[0]
  }

  /**
   * Submit a raw transaction (serialized, hex-encoded) to connected node and network.
   * Note that the transaction will be sent unconditionally to all peers, so using this
   * for manual rebroadcast may degrade privacy by leaking the transaction's origin, as
   * nodes will normally not rebroadcast non-wallet transactions already in their mempool.
   *
   * @param {string} signedTx signed raw transaction
   * @param {BigNumber} maxFeeRate Reject transactions whose fee rate is higher than the specified value. in DFI/kB
   * @return {Promise<string>} transaction hash in hex
   * @see testMempoolAccept
   * @see createRawTransaction
   * @see signRawTransactionWithKey
   */
  async sendRawTransaction (signedTx: string, maxFeeRate: BigNumber = new BigNumber('0')): Promise<string> {
    return await this.client.call('sendrawtransaction', [
      signedTx, maxFeeRate
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
  'reject-reason'?: string
}
