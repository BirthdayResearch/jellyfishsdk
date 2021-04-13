import { BigNumber, ApiClient } from '../.'

enum Mode {
  UNSET = 'unset',
  ECONOMICAL = 'economical',
  CONSERVATIVE = 'conservative'
}

export enum AddressType {
  LEGACY = 'legacy',
  ['P2SH-SEGWIT'] = 'p2sh-segwit',
  BECH32 = 'bech32'
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
   * Returns a new Defi address for receiving payments.
   * If 'label' is specified, it's added to the address book
   * so payments recevied with the address will be associated with 'label'
   *
   * @param label for address to be linked to. It can also be set as empty string
   * @param addressType to use, eg: legacy, p2sh-segwit, bech32
   * @return Promise<string>
   */
  async getNewAddress (label: string = '', addressType = AddressType['P2SH-SEGWIT']): Promise<string> {
    return await this.client.call('getnewaddress', [label, addressType], 'number')
  }

  /**
   * Validate and return information about the given DFI address
   *
   * @param address
   * @returns Promise<ValidateAddressResult>
   */
  async validateAddress (address: string): Promise<ValidateAddressResult> {
    return await this.client.call('validateaddress', [address], 'number')
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
      comment = '', commentTo = '', subtractFeeFromAmount = false,
      replaceable = false, confTarget = 6, estimateMode = Mode.UNSET,
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

export interface ValidateAddressResult {
  isvalid: boolean
  address: string
  scriptPubKey: string
  isscript: boolean
  iswitness: boolean
  ['witness_version']: number
  ['witness_program']: string
}
