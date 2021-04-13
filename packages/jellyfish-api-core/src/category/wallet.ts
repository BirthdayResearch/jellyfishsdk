import { BigNumber, ApiClient } from '../.'

export enum Mode {
  UNSET = 'UNSET',
  ECONOMICAL = 'ECONOMICAL',
  CONSERVATIVE = 'CONSERVATIVE'
}

export enum AddressType {
  LEGACY = 'legacy',
  ['P2SH-SEGWIT'] = 'p2sh-segwit',
  BECH32 = 'bech32'
}

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

export enum WalletFlag {
  ['AVOID_REUSE'] = 'avoid_reuse'
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
   * @return Promise<BigNumber>
   */
  async getBalance (minimumConfirmation: number = 0, includeWatchOnly: boolean = false): Promise<BigNumber> {
    return await this.client.call('getbalance', ['*', minimumConfirmation, includeWatchOnly], 'bignumber')
  }

  /**
   * Get list of UTXOs in wallet.
   *
   * @param minimumConfirmation default = 1, to filter
   * @param maximumConfirmation default = 9999999, to filter
   * @param options
   * @param options.addresses to filter
   * @param options.includeUnsafe default = true, include outputs that are not safe to spend
   * @param options.queryOptions
   * @param options.queryOptions.minimumAmount default = 0, minimum value of each UTXO
   * @param options.queryOptions.maximumAmount default is 'unlimited', maximum value of each UTXO
   * @param options.queryOptions.maximumCount default is 'unlimited', maximum number of UTXOs
   * @param options.queryOptions.minimumSumAmount default is 'unlimited', minimum sum valie of all UTXOs
   * @param options.queryOptions.tokenId default is 'all', filter by token
   * @return Promise<UTXO[]>
  */
  async listUnspent (
    minimumConfirmation = 1,
    maximumConfirmation = 9999999,
    options: ListUnspentOptions = {}
  ): Promise<UTXO[]> {
    const { addresses = [], includeUnsafe = true, queryOptions = {} } = options

    return await this.client.call(
      'listunspent',
      [
        minimumConfirmation, maximumConfirmation,
        addresses, includeUnsafe, queryOptions
      ],
      { amount: 'bignumber' }
    )
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
   * @return Promise<IWallet>
   */
  async createWallet (
    walletName: string,
    disablePrivateKeys = false,
    options: CreateWalletOptions = {}
  ): Promise<IWallet> {
    const { blank = false, passphrase = '', avoidReuse = false } = options

    return await this.client.call(
      'createwallet',
      [walletName, disablePrivateKeys, blank, passphrase, avoidReuse],
      'number'
    )
  }

  /**
   * Return object containing various wallet state info
   *
   * @return Promise<WalletInfo>
   */
  async getWalletInfo (): Promise<WalletInfo> {
    return await this.client.call('getwalletinfo', [], {
      balance: 'bignumber',
      unconfirmed_balance: 'bignumber',
      immature_balance: 'bignumber',
      paytxfee: 'bignumber'
    })
  }

  /**
   * Change the state of the given wallet flag for a wallet
   *
   * @param flag to change. eg: avoid_reuse
   * @param value optional, default = true
   * @return Promise<WalletFlagResult>
   */
  async setWalletFlag (flag: WalletFlag, value: boolean = true): Promise<WalletFlagResult> {
    return await this.client.call('setwalletflag', [flag, value], 'number')
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

  /**
   * Lists groups of addresses which have had their common ownership made public
   * by common use as inputs or as the resulting change in past transactions
   *
   * @return Promise<Array<Array<Array<any>>>>
   */
  async listAddressGroupings (): Promise<any[][][]> {
    return await this.client.call('listaddressgroupings', [], 'bignumber')
  }
}

export interface UTXO {
  txid: string
  vout: number
  address: string
  label: string
  scriptPubKey: string
  amount: BigNumber
  tokenId: number
  confirmations: number
  redeemScript: number
  witnessScript: number
  spendable: boolean
  solvable: boolean
  reused: string
  desc: string
  safe: boolean
}

export interface ListUnspentOptions {
  addresses?: string[]
  includeUnsafe?: boolean
  queryOptions?: ListUnspentQueryOptions
}

export interface ListUnspentQueryOptions {
  minimumAmount?: number
  maximumAmount?: number
  maximumCount?: number
  minimumSumAmount?: number
  tokenId?: string
}

export interface CreateWalletOptions {
  blank?: boolean
  passphrase?: string
  avoidReuse?: boolean
}

export interface SendToAddressOptions {
  comment?: string
  commentTo?: string
  subtractFeeFromAmount?: boolean
  replaceable?: boolean
  confTarget?: number
  estimateMode?: Mode
  avoidReuse?: boolean
}

export interface IWallet {
  name: string
  warning: string
}

export interface WalletInfo {
  walletname: string
  walletversion: number
  balance: BigNumber
  unconfirmed_balance: BigNumber
  immature_balance: BigNumber
  txcount: number
  keypoololdest: number
  keypoolsize: number
  keypoolsize_hd_internal: number
  unlocked_until: number
  paytxfee: BigNumber
  hdseedid: string
  private_keys_enabled: boolean
  avoid_reuse: boolean
  scanning: {
    duration: number
    progress: number
  }
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

export interface WalletFlagResult {
  ['flag_name']: string
  ['flag_state']: boolean
  warnings: string
}
