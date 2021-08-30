import { ApiClient } from '../.'
import BigNumber from 'bignumber.js'

export const HTLC_MINIMUM_BLOCK_COUNT = 9

/**
 * SPV RPCs for Bitcoin Blockchain
 */
export class Spv {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Creates and adds a Bitcoin address to the SPV wallet.
   *
   * @return {Promise<string>} Returns a new Bitcoin address
   */
  async getNewAddress (): Promise<string> {
    return await this.client.call('spv_getnewaddress', [], 'number')
  }

  /**
   * Returns a Bitcoin address's public key.
   *
   * @param {string} address Bitcoin address
   * @return {Promise<string>} Public key
   */
  async getAddressPubKey (address: string): Promise<string> {
    return await this.client.call('spv_getaddresspubkey', [address], 'number')
  }

  /**
   * List balances by receiving address.
   *
   * @param {string} [minConfirmation=1] The minimum number of confirmations
   * @param {string} [address] Filter by address
   * @return {Promise<ReceivedByAddressInfo[]>}
   */
  async listReceivedByAddress (minConfirmation: number = 1, address?: string): Promise<ReceivedByAddressInfo[]> {
    return await this.client.call('spv_listreceivedbyaddress', [minConfirmation, address], {
      amount: 'bignumber'
    })
  }

  /**
   * Send a Bitcoin amount to a given address.
   *
   * @param {string} address Bitcoin address
   * @param {BigNumber} amount Bitcoin amount
   * @param {SpvDefaultOptions} [options]
   * @param {BigNumber} [options.feeRate=10000] Fee rate in satoshis per KB. Minimum is 1000.
   * @return {Promise<SendMessageResult>}
   */
  async sendToAddress (address: string, amount: BigNumber, options: SpvDefaultOptions = { feeRate: new BigNumber('10000') }): Promise<SendMessageResult> {
    return await this.client.call('spv_sendtoaddress', [address, amount, options.feeRate], 'bignumber')
  }

  /**
   * Creates a Bitcoin address whose funds can be unlocked with a seed or as a refund.
   *
   * @param {string} receiverPubKey The public key of the possessor of the seed
   * @param {string} ownerPubKey The public key of the recipient of the refund
   * @param {CreateHtlcOptions} options
   * @param {string} options.timeout  Timeout of the contract (denominated in blocks) relative to its placement in the blockchain. Minimum 9. See HTLC_MINIMUM_BLOCK_COUNT
   * @param {string} [options.seedhash] SHA256 hash of the seed. If none provided one will be generated
   * @return {Promise<CreateHtlcResult>}
   */
  async createHtlc (receiverPubKey: string, ownerPubKey: string, options: CreateHtlcOptions): Promise<CreateHtlcResult> {
    return await this.client.call('spv_createhtlc', [receiverPubKey, ownerPubKey, options.timeout, options.seedhash], 'number')
  }

  /**
   * Decode and return value in a HTLC redeemscript.
   *
   * @param {string} redeemScript HTLC redeem script
   * @return {Promise<DecodeHtlcResult>}
   */
  async decodeHtlcScript (redeemScript: string): Promise<DecodeHtlcResult> {
    return await this.client.call('spv_decodehtlcscript', [redeemScript], 'number')
  }

  /**
   * Claims all coins in HTLC address.
   *
   * @param {string} scriptAddress HTLC address
   * @param {string} destinationAddress Destination address to send HTLC funds to
   * @param {ClaimHtlcOptions} options
   * @param {string} options.seed HTLC seed
   * @param {BigNumber} [options.feeRate=10000] Fee rate in satoshis per KB. Minimum is 1000.
   * @return {Promise<SendMessageResult>}
   */
  async claimHtlc (scriptAddress: string, destinationAddress: string, options: ClaimHtlcOptions): Promise<SendMessageResult> {
    return await this.client.call('spv_claimhtlc', [scriptAddress, destinationAddress, options.seed, options.feeRate], 'bignumber')
  }

  /**
   * Returns the HTLC secret if available.
   *
   * @param {string} address HTLC address
   * @return {Promise<string>} HTLC secret
   */
  async getHtlcSeed (address: string): Promise<string> {
    return await this.client.call('spv_gethtlcseed', [address], 'number')
  }

  /**
   * Refunds all coins in HTLC address.
   * Can be used after the timeout threshold set in createHtlc. See https://en.bitcoin.it/wiki/BIP_0199
   *
   * @param {string} scriptAddress HTLC address
   * @param {string} destinationAddress Destination for funds in the HTLC
   * @param {SpvDefaultOptions} [options]
   * @param {BigNumber} [options.feeRate=10000] Fee rate in satoshis per KB. Minimum is 1000.
   * @return {Promise<SendMessageResult>}
   */
  async refundHtlc (scriptAddress: string, destinationAddress: string, options: SpvDefaultOptions = { feeRate: new BigNumber('10000') }): Promise<SendMessageResult> {
    return await this.client.call('spv_refundhtlc', [scriptAddress, destinationAddress, options.feeRate], 'number')
  }

  /**
   * List all outputs related to HTLC addresses in the wallet.
   *
   * @param {string | undefined} [scriptAddress] HTLC address to filter result
   * @return {Promise<ListHtlcsOutputsResult[]>}
   */
  async listHtlcOutputs (scriptAddress?: string): Promise<ListHtlcsOutputsResult[]> {
    return await this.client.call('spv_listhtlcoutputs', [scriptAddress], { amount: 'bignumber' })
  }

  /**
   * List anchor rewards
   *
   * @return {Promise<ListAnchorRewardsResult[]>}
   */
  async listAnchorRewards (): Promise<ListAnchorRewardsResult[]> {
    return await this.client.call('spv_listanchorrewards', [], 'number')
  }

  /**
   * Create, sign and send anchor tx, using only SPV API
   *
   * @param {CreateAnchorInput[]} createAnchorInputs Info from BTC chain
   * @param {string} createAnchorInput.txid The transaction id of the bitcoin UTXO to spent
   * @param {string} createAnchorInput.vout The output index to spend in UTXO for tx fee
   * @param {number} createAnchorInput.amount Amount of output in satoshis (base unit)
   * @param {string} createAnchorInput.privkey WIF private key of bitcoin for signing this output
   * @param {string} rewardAddress User's P2PKH address (in DeFi chain) for reward
   * @param {CreateAnchorOptions} [options]
   * @param {boolean} [options.send=true] Send it to BTC network
   * @param {BigNumber} [options.feerate=1000] Feerate (satoshis) per KB, default is 1000.
   * @return {Promise<CreateAnchorResult>}
   */
  async createAnchor (
    createAnchorInputs: CreateAnchorInput[],
    rewardAddress: string,
    options: CreateAnchorOptions = { send: true, feerate: 1000 }
  ): Promise<CreateAnchorResult> {
    const opts = { send: true, feerate: 1000, ...options }
    return await this.client.call(
      'spv_createanchor',
      [createAnchorInputs, rewardAddress, opts.send, opts.feerate],
      { cost: 'bignumber', estimatedReward: 'bignumber' }
    )
  }
}

export interface ReceivedByAddressInfo {
  /** Recieving address */
  address: string
  /** Address type */
  type: string
  /** Total amount of BTC recieved by the address */
  amount: BigNumber
  /** The number of confirmations */
  confirmations: number
  /** The ids of transactions received by the address */
  txids: string[]
}

export interface SpvDefaultOptions {
  /** Fee rate in satoshis per KB */
  feeRate?: BigNumber
}

export interface SendMessageResult {
  txid: string
  sendmessage: string
}

export interface CreateHtlcOptions {
  /** Timeout of the contract (denominated in blocks) relative to its placement in the blockchain. Minimum 9. See HTLC_MINIMUM_BLOCK_COUNT */
  timeout: string
  /** SHA256 hash of the seed. If none provided one will be generated */
  seedhash?: string
}

export interface CreateHtlcResult {
  /** The value of the new Bitcoin address */
  address: string
  /** Hex-encoded redemption script */
  redeemScript: string
  /** Hex-encoded seed */
  seed?: string
  /** Hex-encoded seed hash */
  seedhash?: string
}

export interface DecodeHtlcResult {
  /** seller's public key */
  sellerkey: string
  /** buyer's public key */
  buyerkey: string
  /** Timeout of the contract (denominated in blocks) relative to its placement in the blockchain at creation time */
  blocks: number
  /** Hex-encoded seed hash */
  hash: string
}

export interface ClaimHtlcOptions {
  /** HTLC seed */
  seed: string
  /** Fee rate in satoshis per KB */
  feeRate?: BigNumber
}

export interface SpentInfo {
  /** The transaction id */
  txid: string
  /** Number of spent confirmations */
  confirms: number
}

export interface ListHtlcsOutputsResult {
  /** The transaction id */
  txid: string
  /** Output relating to the HTLC address */
  vout: number
  /** Total amount of BTC recieved by the address */
  amount: BigNumber
  /** HTLC address */
  address: string
  /** Number of confirmations */
  confirms: number
  /** Object containing spent info */
  spent: SpentInfo
}

export interface CreateAnchorInput {
  /** The transaction id of the bitcoin UTXO to spend */
  txid: string
  /** The output index to spend in UTXO for tx fee */
  vout: number
  /** Amount of output in satoshis (base unit) */
  amount: number
  /** WIF private key of bitcoin of signing this output */
  privkey: string
}

export interface CreateAnchorOptions {
  /** Send to BTC network */
  send?: boolean
  /** Feerate (satoshis) per 1000 bytes */
  feerate?: number
}

export interface CreateAnchorResult {
  /** the transaction hex */
  txHex: string
  /** the transaction hash  */
  txHash: string
  /** the anchor block hash */
  defiHash: string
  /** the anchor block height */
  defiHeight: number
  /** estimated anchor reward */
  estimatedReward: BigNumber
  /** created anchor cost */
  cost: BigNumber
  /** status of send result */
  sendResult: number
  /** decoded sendResult */
  sendMessage: string
}

export interface ListAnchorRewardsResult {
  /** the anchor transaction hash */
  AnchorTxHash: string
  /** the reward transaction hash */
  RewardTxHash: string
}
