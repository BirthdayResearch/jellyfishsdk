import { BigNumber, ApiClient } from '../.'

export enum Mode {
  UNSET = 'UNSET',
  ECONOMICAL = 'ECONOMICAL',
  CONSERVATIVE = 'CONSERVATIVE'
}

export enum AddressType {
  LEGACY = 'legacy',
  P2SH_SEGWIT = 'p2sh-segwit',
  BECH32 = 'bech32'
}

export enum ScriptType {
  NONSTANDARD = 'nonstandard',
  PUBKEY = 'pubkey',
  PUBKEYHASH = 'pubkeyhash',
  SCRIPTHASH = 'scripthash',
  MULTISIG = 'multisig',
  NULLDATA = 'nulldata',
  WITNESS_V0_KEYHASH = 'witness_v0_keyhash',
  WITNESS_UNKNOWN = 'witness_unknown',
}

export enum WalletFlag {
  AVOID_REUSE = 'avoid_reuse'
}

/**
 * Wallet RPCs for DeFi Blockchain
 */
export class Wallet {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Returns the total available balance in wallet.
   *
   * @param {number} minimumConfirmation to include transactions confirmed at least this many times
   * @param {boolean} includeWatchOnly for watch-only wallets
   * @return Promise<BigNumber>
   */
  async getBalance (minimumConfirmation: number = 0, includeWatchOnly: boolean = false): Promise<BigNumber> {
    return await this.client.call('getbalance', ['*', minimumConfirmation, includeWatchOnly], 'bignumber')
  }

  /**
   * Get list of UTXOs in wallet.
   *
   * @param {number} minimumConfirmation default = 1, to filter
   * @param {number} maximumConfirmation default = 9999999, to filter
   * @param {ListUnspentOptions} [options]
   * @param {string[]} [options.addresses] to filter
   * @param {boolean} [options.includeUnsafe=true] default = true, include outputs that are not safe to spend
   * @param {ListUnspentQueryOptions} [options.queryOptions]
   * @param {number} [options.queryOptions.minimumAmount] default = 0, minimum value of each UTXO
   * @param {number} [options.queryOptions.maximumAmount] default is 'unlimited', maximum value of each UTXO
   * @param {number} [options.queryOptions.maximumCount] default is 'unlimited', maximum number of UTXOs
   * @param {number} [options.queryOptions.minimumSumAmount] default is 'unlimited', minimum sum valie of all UTXOs
   * @param {string} [options.queryOptions.tokenId] default is 'all', filter by token
   * @return {Promise<UTXO[]>}
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
   * @param {string} walletName
   * @param {boolean} disablePrivateKeys
   * @param {CreateWalletOptions} [options]
   * @param {boolean} [options.blank]
   * @param {string} [options.passphrase]
   * @param {boolean} [options.avoidReuse]
   * @return {Promise<CreateWalletResult>}
   */
  async createWallet (
    walletName: string,
    disablePrivateKeys = false,
    options: CreateWalletOptions = {}
  ): Promise<CreateWalletResult> {
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
   * @return {Promise<WalletInfo>}
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
   * @param {WalletFlag} flag to change. eg: avoid_reuse
   * @param {boolean} value optional, default = true
   * @return {Promise<WalletFlagResult>}
   */
  async setWalletFlag (flag: WalletFlag, value: boolean = true): Promise<WalletFlagResult> {
    return await this.client.call('setwalletflag', [flag, value], 'number')
  }

  /**
   * Returns a new DeFi address for receiving payments.
   * If 'label' is specified, it's added to the address book
   * so payments received with the address will be associated with 'label'
   *
   * @param {string} label for address to be linked to. It can also be set as empty string
   * @param {AddressType} addressType to use, eg: legacy, p2sh-segwit, bech32
   * @return {Promise<string>}
   */
  async getNewAddress (label: string = '', addressType = AddressType.BECH32): Promise<string> {
    return await this.client.call('getnewaddress', [label, addressType], 'number')
  }

  /**
   * Validate and return information about the given DFI address
   *
   * @param {string} address
   * @return {Promise<ValidateAddressResult>}
   */
  async validateAddress (address: string): Promise<ValidateAddressResult> {
    return await this.client.call('validateaddress', [address], 'number')
  }

  /**
   * Return information about the given address
   *
   * @param {string} address
   * @return {Promise<AddressInfo>}
   */
  async getAddressInfo (address: string): Promise<AddressInfo> {
    return await this.client.call('getaddressinfo', [address], 'number')
  }

  /**
   * Send an amount to given address and return a transaction id
   *
   * @param {string} address
   * @param {number} amount
   * @param {SendToAddressOptions} [options]
   * @param {string} [options.comment]
   * @param {string} [options.commentTo]
   * @param {boolean} [options.subtractFeeFromAmount]
   * @param {boolean} [options.replaceable]
   * @param {number} [options.confTarget]
   * @param {Mode} [options.estimateMode]
   * @param {boolean} [options.avoidReuse]
   * @return {Promise<string>}
   */
  async sendToAddress (
    address: string,
    amount: number,
    options: SendToAddressOptions = {}
  ): Promise<string> {
    const {
      comment = '',
      commentTo = '',
      subtractFeeFromAmount = false,
      replaceable = false,
      confTarget = 6,
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

  /**
   * Lists groups of addresses which have had their common ownership made public
   * by common use as inputs or as the resulting change in past transactions
   *
   * @return {Promise<any[][][]>}
   */
  async listAddressGroupings (): Promise<any[][][]> {
    return await this.client.call('listaddressgroupings', [], 'bignumber')
  }

  /**
   * Send given amounts to multiple given address and return a transaction id
   *
   * @param {Record<string, number>} amounts Dictionary/map with individual addresses and amounts
   * @param {string[]} subtractfeefrom Array of addresses from which fee needs to be deducted.
   * @param {SendManyOptions} options
   * @param {string} [options.comment] A comment
   * @param {boolean} [options.replaceable] Allow this transaction to be replaced by a transaction with higher fees via BIP 125
   * @param {number} [options.confTarget] Confirmation target (in blocks)
   * @param {Mode} [options.estimateMode] The fee estimate mode, must be one of (Mode.UNSET, Mode.ECONOMICAL, Mode.CONSERVATIVE)
   * @return {Promise<string>} hex string of the transaction
   */
  async sendMany (
    amounts: Record<string, number>,
    subtractfeefrom: string [] = [],
    options: SendManyOptions = {}): Promise<string> {
    const {
      comment = '',
      replaceable = false,
      confTarget = 6,
      estimateMode = Mode.UNSET
    } = options

    const dummy: string = '' // Must be set to '' for backward compatibality.
    const minconf: number = 0 // Ignored dummy value

    return await this.client.call(
      'sendmany',
      [
        dummy, amounts, minconf, comment, subtractfeefrom,
        replaceable, confTarget, estimateMode
      ],
      'bignumber'
    )
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

export interface SendManyOptions {
  comment?: string
  replaceable?: boolean
  confTarget?: number
  estimateMode?: Mode
}

export interface CreateWalletResult {
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
  witness_version: number
  witness_program: string
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
  witness_version: number
  witness_program: string
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
    witness_version: number
    witness_program: string
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
  flag_name: string
  flag_state: boolean
  warnings: string
}
