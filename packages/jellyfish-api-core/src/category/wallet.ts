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

//
export enum ScriptType {
  NONSTANDARD = 'nonstandard',
  PUBKEY = 'pubkey',
  PUBKEYHASH = 'pubkeyhash',
  SCRIPTHASH = 'scripthash',
  MULTISIG = 'multisig',
  NULLDATA = 'nulldata',
  ['WITNESS_V0_KEYHASH'] = 'witness_v0_keyhash',
  ['WITNESS_UNKNOWN'] = 'witness_unknown',
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
   * @return Promise<ValidateAddressResult>
   */
  async validateAddress (address: string): Promise<ValidateAddressResult> {
    return await this.client.call('validateaddress', [address], 'number')
  }

  /**
   * Return information about the given address
   *
   * @param address
   * @return Promise<AddressInfo>
   */
  async getAddressInfo (address: string): Promise<AddressInfo> {
    return await this.client.call('getaddressinfo', [address], 'number')
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
    amount: number,
    options: SendToAddressOptions = {
      comment: '',
      commentTo: '',
      subtractFeeFromAmount: false,
      replaceable: false,
      confTarget: 6,
      estimateMode: Mode.UNSET,
      avoidReuse: true
    }
  ): Promise<string> {
    const {
      comment, commentTo, subtractFeeFromAmount,
      replaceable, confTarget, estimateMode, avoidReuse
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

export interface AddressInfo {
  address: string
  scriptPubKey: string
  ismine: boolean
  iswatchonly: boolean
  solvable: boolean
  desc: string
  isscript: boolean
  ischange: true
  iswitness: boolean
  ['witness_version']: number
  ['witness_program']: string
  script: ScriptType
  hex: string
  pubkeys: string[]
  sigsrequired: number
  pubkey: string
  embedded: {
    address: string
    scriptPubKey: string
    isscript: boolean
    iswitness: boolean
    ['witness_version']: number
    ['witness_program']: string
    script: ScriptType
    hex: string
    sigsrequired: number
    pubkey: string
    pubkeys: string[]
  }
  iscompressed: boolean
  label: string
  timestamp: number
  hdkeypath: string
  hdseedid: string
  hdmasterfingerprint: string
  labels: Label[]
}

export interface Label {
  name: string
  purpose: string
}
