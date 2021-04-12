import { ApiClient } from '../.'

enum Mode {
  UNSET = 'UNSET',
  ECONOMICAL = 'ECONOMICAL',
  CONSERVATIVE = 'CONSERVATIVE'
}

/**
 * RpcWallet related RPC calls for DeFiChain
 */
export class RpcWallet {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Create a new wallet
   *
   * @param walletName
   * @param disablePrivateKeys
   * @param options
   * @param options.blank
   * @param options.passphrase
   * @param options.avoidReuse
   * @return Promise<Wallet>
   */
  async createWallet (
    walletName: string,
    disablePrivateKeys = false,
    options: CreateWalletOptions = {
      blank: false,
      passphrase: '',
      avoidReuse: false
    }
  ): Promise<Wallet> {
    const { blank, passphrase, avoidReuse } = options

    return await this.client.call(
      'createwallet',
      [walletName, disablePrivateKeys, blank, passphrase, avoidReuse],
      'bignumber'
    )
  }

  /**
   * Send an amount to given address and return a transaction id
   *
   * @param address
   * @param amount
   * @param options
   * @param options.comment
   * @param options.commentTo
   * @param options.subtractFeeFromAmount
   * @param options.replaceable
   * @param options.confTarget
   * @param options.estimateMode
   * @param options.avoidReuse
   * @return Promise<string>
   */
  async sendToAddress (
    address: string,
    amount: string,
    options: SendToAddressOptions
  ): Promise<string> {
    const {
      comment = '',
      commentTo = '',
      subtractFeeFromAmount = false,
      replaceable,
      confTarget,
      estimateMode = Mode.UNSET,
      avoidReuse = true
    } = options

    return await this.client.call(
      'sendtoaddress',
      [
        address, amount, comment, commentTo, subtractFeeFromAmount,
        replaceable, confTarget, estimateMode, avoidReuse
      ],
      'bignumber'
    )
  }
}

export interface CreateWalletOptions {
  blank: boolean
  passphrase: string
  avoidReuse: boolean
}

export interface SendToAddressOptions {
  comment: string
  commentTo: string
  subtractFeeFromAmount: boolean
  replaceable?: boolean
  confTarget?: number
  estimateMode: Mode
  avoidReuse: boolean
}

export interface Wallet {
  ['wallet_name']: string
  warning: string
}
