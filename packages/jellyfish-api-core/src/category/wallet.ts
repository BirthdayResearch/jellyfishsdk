import { BigNumber, ApiClient } from '../.'

enum Mode {
  UNSET = 'UNSET',
  ECONOMICAL = 'ECONOMICAL',
  CONSERVATIVE = 'CONSERVATIVE'
}

/**
 * Wallet related RPC calls for DeFiChain
 */
export class Wallet {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Returns the total available balance in wallet.
   *
   * @param minimumConfirmation to include transactions confirmed at least this many times
   * @param includeWatchOnly for watch-only wallets
   * @return Promise<number>
   */
  async getBalance (minimumConfirmation: number = 0, includeWatchOnly: boolean = false): Promise<BigNumber> {
    return await this.client.call('getbalance', ['*', minimumConfirmation, includeWatchOnly], 'bignumber')
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
  ): Promise<IWallet> {
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

export interface IWallet {
  ['wallet_name']: string
  warning: string
}
