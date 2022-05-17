import { ApiClient } from '../.'

export enum MasternodeState {
  PRE_ENABLED = 'PRE_ENABLED',
  ENABLED = 'ENABLED',
  PRE_RESIGNED = 'PRE_RESIGNED',
  RESIGNED = 'RESIGNED',
  PRE_BANNED = 'PRE_BANNED',
  BANNED = 'BANNED',
  UNKNOWN = 'UNKNOWN'
}

export enum MasternodeTimeLock {
  FIVE_YEAR = 'FIVEYEARTIMELOCK',
  TEN_YEAR = 'TENYEARTIMELOCK'
}

/**
 * Masternode RPCs for DeFi Blockchain
 */
export class Masternode {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Creates a masternode creation transaction with given owner and operator addresses.
   *
   * @param {string} ownerAddress Any valid address for keeping collateral amount
   * @param {string} [operatorAddress]  Masternode operator auth address (P2PKH only, unique). If empty, owner address will be used.
   * @param {CreateMasternodeOptions} [options]
   * @param {UTXO[]} [options.utxos = []] Specific UTXOs to spend
   * @param {string} [options.utxos.txid] The transaction id
   * @param {number} [options.utxos.vout] The output number
   * @param {MasternodeTimeLock} [options.timelock] specify a fix period (5 or 10 years) lock which cannot be resigned and cannot spend the collateral
   * @return {Promise<string>}
   */
  async createMasternode (
    ownerAddress: string,
    operatorAddress?: string,
    options: CreateMasternodeOptions = { utxos: [] }
  ): Promise<string> {
    const params = [
      ownerAddress,
      operatorAddress ?? ownerAddress,
      options.utxos,
      ...(options.timelock !== undefined ? [options.timelock] : [])
    ]
    return await this.client.call('createmasternode', params, 'number')
  }

  /**
   * Creates a masternode update transaction.
   *
   * @param {string} id The Masternode's ID
   * @param {UpdateMasternodeOptions} options
   * @param {string} [options.ownerAddress] The new masternode owner address, requires masternode collateral fee (P2PKH or P2WPKH)
   * @param {string} [options.operatorAddress] The new masternode operator address (P2PKH or P2WPKH)
   * @param {string} [options.rewardAddress] Masternode`s new reward address, empty to remove old reward address
   * @param {UTXO[]} [options.utxos = []] Specific UTXOs to spend
   * @param {string} [options.utxos.txid] The transaction id
   * @param {number} [options.utxos.vout] The output number
   * @return {Promise<string>}
   */
  async updateMasternode (id: string, options: UpdateMasternodeOptions, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('updatemasternode', [id, options, utxos], 'number')
  }

  /**
   * Returns information about multiple masternodes.
   *
   * @param {MasternodePagination} pagination
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start = true] Include starting position.
   * @param {string} [pagination.limit = 100] Maximum number of orders to return.
   * @param {boolean} [verbose = true] Flag for verbose list. Only ids are returned when false.
   * @return {Promise<MasternodeResult<MasternodeInfo>>}
   */
  listMasternodes (pagination?: MasternodePagination, verbose?: boolean): Promise<MasternodeResult<MasternodeInfo>>

  /**
   * Returns information about multiple masternodes.
   *
   * @param {MasternodePagination} pagination
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start = true] Include starting position.
   * @param {string} [pagination.limit = 100] Maximum number of orders to return.
   * @param {boolean} verbose true
   * @return {Promise<MasternodeResult<MasternodeInfo>>}
   */
  listMasternodes (pagination: MasternodePagination, verbose: true): Promise<MasternodeResult<MasternodeInfo>>

  /**
   * Returns information about multiple masternodes.
   *
   * @param {MasternodePagination} pagination
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start = true] Include starting position.
   * @param {string} [pagination.limit = 100] Maximum number of orders to return.
   * @param {boolean} verbose false.
   * @return {Promise<MasternodeResult<string>>}
   */
  listMasternodes (pagination: MasternodePagination, verbose: false): Promise<MasternodeResult<string>>

  /**
   * Returns information about multiple masternodes.
   *
   * @param {MasternodePagination} pagination
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start = true] Include starting position.
   * @param {string} [pagination.limit = 100] Maximum number of orders to return.
   * @param {boolean} [verbose = true] Flag for verbose list. Only ids are returned when false.
   * @return {Promise<MasternodeResult>}
   */
  async listMasternodes<T> (
    pagination: MasternodePagination = {
      including_start: true,
      limit: 100
    },
    verbose: boolean = true
  ): Promise<MasternodeResult<T>> {
    return await this.client.call('listmasternodes', [pagination, verbose], 'number')
  }

  /**
   * Returns information about a single masternode
   *
   * @param {string} masternodeId The masternode's id.
   * @return {Promise<MasternodeResult>}
   */
  async getMasternode (masternodeId: string): Promise<MasternodeResult<MasternodeInfo>> {
    return await this.client.call('getmasternode', [masternodeId], 'number')
  }

  /**
   * Creates a masternode creation transaction with given owner and operator addresses.
   *
   * @param {MasternodeBlock} identifier
   * @param {string} [identifier.id] Masternode's id.
   * @param {string} [identifier.ownerAddress] Masternode owner address.
   * @param {string} [identifier.operatorAddress]  Masternode operator address.
   * @param {number} [depth] Maximum depth, from the genesis block is the default.
   * @return {Promise<MasternodeResult<string>>}
   */
  async getMasternodeBlocks (identifier: MasternodeBlock, depth?: number): Promise<MasternodeResult<string>> {
    return await this.client.call('getmasternodeblocks', [identifier, depth], 'number')
  }

  /**
   * Creates a transaction resigning a masternode.
   *
   * @param {string} masternodeId The masternode's id.
   * @param {UTXO[]} [utxos = []] Array of specified utxos to spend.
   * @param {string} [utxos.txid] The transaction id.
   * @param {number} [utxos.vout] The output number.
   * @return {Promise<string>} Resignation Transaction.
   */
  async resignMasternode (masternodeId: string, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('resignmasternode', [masternodeId, utxos], 'number')
  }

  /**
   * Set special governance variables
   *
   * @param {Record<string, any>} input json object
   * @param {UTXO[]} [utxos = []] Specific utxos to spend
   * @param {string} [utxos.txid] The transaction id
   * @param {string} [utxos.vout] The output number
   * @return {Promise<string>} hash
   *
   */
  async setGov (input: Record<string, any>, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('setgov', [input, utxos], 'number')
  }

  /**
   * Set special governance variables with activation height specified
   *
   * @param {Record<string, any>} input json object
   * @param {number} activationHeight
   * @param {UTXO[]} [utxos = []] Specific utxos to spend
   * @param {string} [utxos.txid] The transaction id
   * @param {string} [utxos.vout] The output number
   * @return {Promise<string>} hash
   *
   */
  async setGovHeight (input: Record<string, any>, activationHeight: number, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('setgovheight', [input, activationHeight, utxos], 'number')
  }

  /**
   * Get information about governance variable
   *
   * @param {string} name governance name
   * @return {Promise<Record<string, any>} governance information as json object
   */
  async getGov (name: string): Promise<Record<string, any>> {
    return await this.client.call('getgov', [name], 'bignumber')
  }

  /**
   * List all governance variables together if any with activation height
   *
   * @example
   * [
   *   [ { govVarKey: value }, { <activation height number>: value } ],
   *   [ { govVarKey2: value }, { <activation height number>: value } ]
   * ]
   *
   * @returns {Promise<Array<Array<Record<string, any>>>>}
   */
  async listGovs (): Promise<Array<Array<Record<string, any>>>> {
    return await this.client.call('listgovs', [], 'bignumber')
  }

  /**
   * Checks that custom transaction was affected on chain
   *
   * @param {string} transactionId transaction hash
   * @param {number} blockHeight height of block which contain transaction
   * @return {Promise<boolean>} indicate that custom transaction was affected on chain
   */
  async isAppliedCustomTransaction (transactionId: string, blockHeight: number): Promise<boolean> {
    return await this.client.call('isappliedcustomtx', [transactionId, blockHeight], 'number')
  }

  /**
   * Returns the auth and confirm anchor masternode teams at current or specified height
   *
   * @param {number} blockHeight The height of block which contain tx
   * @returns {Promise<AnchorTeamResult>}
   */
  async getAnchorTeams (blockHeight?: number): Promise<AnchorTeamResult> {
    return await this.client.call('getanchorteams', [blockHeight], 'number')
  }

  /**
   * Returns number of unique masternodes in the last specified number of blocks.
   *
   * @param {number} [blockCount=20160] The number of blocks to check for unique masternodes.
   * @return {Promise<number>} Number of unique masternodes seen
   */
  async getActiveMasternodeCount (blockCount: number = 20160): Promise<number> {
    return await this.client.call('getactivemasternodecount', [blockCount], 'number')
  }

  /**
   * Returns an array of anchors if any
   * @return Promise<MasternodeResult<MasternodeAnchor>>
   */
  async listAnchors (): Promise<MasternodeResult<MasternodeAnchor>> {
    return await this.client.call('listanchors', [], 'number')
  }
}

export interface UTXO {
  txid: string
  vout: number
}

export interface CreateMasternodeOptions {
  utxos: UTXO[]
  timelock?: MasternodeTimeLock
}

type UpdateMasternodeOptions = UpdateMasternodeOptions1 | UpdateMasternodeOptions2 | UpdateMasternodeOptions3

export interface UpdateMasternodeOptions1 {
  ownerAddress: string
  operatorAddress?: string
  rewardAddress?: string
}

export interface UpdateMasternodeOptions2 {
  ownerAddress?: string
  operatorAddress: string
  rewardAddress?: string
}

export interface UpdateMasternodeOptions3 {
  ownerAddress?: string
  operatorAddress?: string
  rewardAddress: string
}

export interface MasternodePagination {
  start?: string
  including_start?: boolean
  limit?: number
}

export interface MasternodeBlock {
  id?: string
  ownerAddress?: string
  operatorAddress?: string
}

export interface MasternodeInfo {
  ownerAuthAddress: string
  operatorAuthAddress: string
  creationHeight: number
  resignHeight: number
  resignTx: string
  banTx: string
  state: MasternodeState
  mintedBlocks: number
  ownerIsMine: boolean
  operatorIsMine: boolean
  localMasternode: boolean
  targetMultiplier?: number
  targetMultipliers?: number[]
  timelock?: number
}

export interface MasternodeAnchor {
  anchorHeight: number
  anchorHash: string
  rewardAddress: string
  dfiRewardHash: string
  btcAnchorHeight: number
  btcAnchorHash: string
  confirmSignHash: string
}

export interface AnchorTeamResult {
  auth: string[]
  confirm: string[]
}

export interface MasternodeResult<T> {
  [id: string]: T
}
