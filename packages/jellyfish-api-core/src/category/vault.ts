import { ApiClient } from '..'
import BigNumber from 'bignumber.js'

/**
 * Loan RPCs for DeFi Blockchain
 */
export class Vault {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Creates a vault transaction.
   *
   * @param {CreateVault} vault
   * @param {string} vault.ownerAddress Any valid address or "" to generate a new address
   * @param {number} [vault.loanSchemeId] Unique identifier of the loan scheme (8 chars max). If empty, the default loan scheme will be selected
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>} Transaction id of the transaction
   */
  async createVault (vault: CreateVault, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('createvault', [vault.ownerAddress, vault.loanSchemeId, utxos], 'number')
  }

  /**
   * Create update vault transaction.
   *
   * @param {string} vaultId
   * @param {UpdateVault} vault
   * @param {string} [vault.ownerAddress] Any valid address
   * @param {string} [vault.loanSchemeId] Unique identifier of the loan scheme (8 chars max)
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>} Transaction id of the transaction
   */
  async updateVault (vaultId: string, vault: UpdateVault, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('updatevault', [vaultId, vault, utxos], 'number')
  }

  /**
   * Returns information about vault.
   *
   * @param {string} vaultId vault hex id
   * @return {Promise<VaultActive | VaultLiquidation>}
   */
  async getVault (vaultId: string): Promise<VaultActive | VaultLiquidation> {
    return await this.client.call(
      'getvault',
      [vaultId],
      {
        collateralValue: 'bignumber',
        loanValue: 'bignumber',
        interestValue: 'bignumber',
        informativeRatio: 'bignumber'
      }
    )
  }

  /**
   * List all available vaults.
   *
   * @param {VaultPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @param {ListVaultOptions} [options]
   * @param {string} [options.ownerAddress] Address of the vault owner
   * @param {string} [options.loanSchemeId] Vault's loan scheme id
   * @param {VaultState} [options.state = VaultState.UNKNOWN] vault's state
   * @param {boolean} [options.verbose = false] true to return same information as getVault
   * @return {Promise<Vault | VaultActive | VaultLiquidation[]>} Array of objects including details of the vaults.
   */
  async listVaults (pagination: VaultPagination = {}, options: ListVaultOptions = {}): Promise<Array<Vault | VaultActive | VaultLiquidation>> {
    return await this.client.call(
      'listvaults',
      [options, pagination],
      {
        collateralValue: 'bignumber',
        loanValue: 'bignumber',
        interestValue: 'bignumber',
        informativeRatio: 'bignumber'
      }
    )
  }

  /**
   * Close vault
   *
   * @param {CloseVault} closeVault
   * @param {string} closeVault.vaultId Vault id
   * @param {string} closeVault.to Valid address to receive collateral tokens
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>}
   */
  async closeVault (closeVault: CloseVault, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('closevault', [closeVault.vaultId, closeVault.to, utxos], 'number')
  }

  /**
   * Deposit to vault
   *
   * @param {DepositVault} depositVault
   * @param {string} depositVault.vaultId Vault id
   * @param {string} depositVault.from Collateral address
   * @param {string} depositVault.amount In "amount@symbol" format
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>}
   */
  async depositToVault (depositVault: DepositVault, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('deposittovault', [depositVault.vaultId, depositVault.from, depositVault.amount, utxos], 'number')
  }

  /**
   * Withdraw from vault
   *
   * @param {WithdrawVault} withdrawVault
   * @param {string} withdrawVault.vaultId Vault id
   * @param {string} withdrawVault.to Collateral address
   * @param {string} withdrawVault.amount In "amount@symbol" format
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>}
   */
  async withdrawFromVault (withdrawVault: WithdrawVault, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('withdrawfromvault', [withdrawVault.vaultId, withdrawVault.to, withdrawVault.amount, utxos], 'number')
  }

  /**
   * Bid to vault in auction
   *
   * @param {PlaceAuctionBid} placeAuctionBid
   * @param {string} placeAuctionBid.vaultId Vault Id
   * @param {index} placeAuctionBid.index Auction index
   * @param {from} placeAuctionBid.from Address to get token
   * @param {amount} placeAuctionBid.amount in "amount@symbol" format
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>} The transaction id
   */
  async placeAuctionBid (placeAuctionBid: PlaceAuctionBid, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call(
      'placeauctionbid',
      [placeAuctionBid.vaultId, placeAuctionBid.index, placeAuctionBid.from, placeAuctionBid.amount, utxos],
      'number'
    )
  }

  /**
   * List all available auctions.
   *
   * @param {AuctionPagination} pagination
   * @param {AuctionPaginationStart} [pagination.start]
   * @param {string} [pagination.start.vaultId]
   * @param {number} [pagination.start.height]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @return {Promise<VaultLiquidation[]>}
   */
  async listAuctions (pagination: AuctionPagination = {}): Promise<VaultLiquidation[]> {
    const defaultPagination = {
      limit: 100
    }
    return await this.client.call('listauctions', [{ ...defaultPagination, ...pagination }], 'number')
  }

  /**
   * Returns information about auction history.
   *
   * @param {string} [owner] address or reserved word : mine / all (Default to mine)
   * @param {ListAuctionHistoryPagination} pagination
   * @param {number} [pagination.maxBlockHeight] Maximum block height
   * @param {string} [pagination.vaultId] Vault Id
   * @param {number} [pagination.index] Auction index
   * @param {number} [pagination.limit = 100]
   * @return {Promise<ListAuctionHistoryDetail>}
   */
  async listAuctionHistory (owner: string = 'mine', pagination?: ListAuctionHistoryPagination): Promise<ListAuctionHistoryDetail[]> {
    const defaultPagination = {
      limit: 100
    }
    return await this.client.call('listauctionhistory', [owner, { ...defaultPagination, ...pagination }], 'number')
  }

  /**
   * Returns amount of collateral tokens needed to take an amount of loan tokens for a target collateral ratio.
   *
   * @param {string[]} loanAmounts Amount as array. Example: [ "amount@token" ]
   * @param {number} targetRatio Target collateral ratio.
   * @param {TokenPercentageSplit} [tokenSplit] Object with loans token as key and their percent split as value
   * @return {Promise<string[]>} Array of <amount@token> strings
   */
  async estimateCollateral (loanAmounts: string[], targetRatio: number, tokenSplit: TokenPercentageSplit = { DFI: 1 }): Promise<string[]> {
    return await this.client.call('estimatecollateral', [loanAmounts, targetRatio, tokenSplit], 'number')
  }

  /**
   * Returns amount of loan tokens a vault can take depending on a target collateral ratio.
   *
   * @param {string} vaultId vault hex id
   * @param {TokenPercentageSplit} tokenSplit Object with loans token as key and their percent split as value
   * @param {number} [targetRatio] Target collateral ratio. (defaults to vault's loan scheme ratio)
   * @return {Promise<string[]>} Array of `token@amount`
   */
  async estimateLoan (vaultId: string, tokenSplit: TokenPercentageSplit, targetRatio?: number): Promise<string[]> {
    const params = targetRatio === undefined ? [vaultId, tokenSplit] : [vaultId, tokenSplit, targetRatio]
    return await this.client.call('estimateloan', params, 'number')
  }
}

export interface CreateVault {
  ownerAddress: string
  loanSchemeId?: string
}

export interface UpdateVault {
  ownerAddress?: string
  loanSchemeId?: string
}

export enum VaultState {
  UNKNOWN = 'unknown',
  ACTIVE = 'active',
  IN_LIQUIDATION = 'inLiquidation',
  FROZEN = 'frozen',
  MAY_LIQUIDATE = 'mayLiquidate',
}

export interface Vault {
  vaultId: string
  loanSchemeId: string
  ownerAddress: string
  state: VaultState
}

export interface VaultActive extends Vault {
  collateralAmounts: string[]
  loanAmounts: string[]
  interestAmounts: string[]
  collateralValue: BigNumber
  loanValue: BigNumber
  interestValue: BigNumber
  collateralRatio: number
  informativeRatio: BigNumber
}

export interface VaultLiquidation extends Vault {
  liquidationHeight: number
  liquidationPenalty: number
  batchCount: number
  batches: VaultLiquidationBatch[]
}

export interface UTXO {
  txid: string
  vout: number
}

export interface DepositVault {
  vaultId: string
  from: string
  amount: string // amount@symbol
}

export interface WithdrawVault {
  vaultId: string
  to: string
  amount: string // amount@symbol
}

export interface VaultPagination {
  start?: string
  including_start?: boolean
  limit?: number
}

export interface ListVaultOptions {
  ownerAddress?: string
  loanSchemeId?: string
  state?: VaultState
  verbose?: boolean
}

export interface CloseVault {
  vaultId: string
  to: string
}

export interface PlaceAuctionBid {
  vaultId: string
  index: number
  from: string
  amount: string // amount@symbol
}

export interface AuctionPagination {
  start?: AuctionPaginationStart
  including_start?: boolean
  limit?: number
}

export interface AuctionPaginationStart {
  vaultId?: string
  height?: number
}

export interface VaultLiquidationBatch {
  index: number
  collaterals: string[]
  loan: string
  highestBid?: HighestBid
}

export interface HighestBid {
  amount: string // amount@symbol
  owner: string
}

export interface ListAuctionHistoryPagination {
  maxBlockHeight?: number
  vaultId?: string
  index?: number
  limit?: number
}

export interface ListAuctionHistoryDetail {
  winner: string
  blockHeight: number
  blockHash: string
  blockTime: number
  vaultId: string
  batchIndex: number
  auctionBid: string
  auctionWon: string[]
}

export interface TokenPercentageSplit {
  [token: string]: number // Token: split
}
