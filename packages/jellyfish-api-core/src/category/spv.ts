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
   * Returns a Bitcoin address' public key.
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
   * @param {SendToAddressOptions} [options]
   * @param {BigNumber} [options.feeRate=10000] Fee rate in satoshis per KB. Minimum is 1000.
   * @return {Promise<SendMessageResult>}
   */
  async sendToAddress (address: string, amount: BigNumber, options: SendToAddressOptions = { feeRate: new BigNumber('10000') }): Promise<SendMessageResult> {
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

export interface SendToAddressOptions {
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
