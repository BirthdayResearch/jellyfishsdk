import { ApiClient } from '../.'
import BigNumber from 'bignumber.js'

/**
 * SPV RPCs for DeFi Blockchain
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
