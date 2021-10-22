import { ApiClient, token } from '..'
import BigNumber from 'bignumber.js'

/**
 * Loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Creates a loan scheme transaction.
   *
   * @param {CreateLoanScheme} scheme
   * @param {number} scheme.minColRatio Minimum collateralization ratio
   * @param {BigNumber} scheme.interestRate Interest rate
   * @param {string} scheme.id Unique identifier of the loan scheme, max 8 chars
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>} LoanSchemeId, also the txn id for txn created to create loan scheme
   */
  async createLoanScheme (scheme: CreateLoanScheme, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('createloanscheme', [scheme.minColRatio, scheme.interestRate, scheme.id, utxos], 'number')
  }

  /**
   * Updates an existing loan scheme.
   *
   * @param {UpdateLoanScheme} scheme
   * @param {number} scheme.minColRatio Minimum collateralization ratio
   * @param {BigNumber} scheme.interestRate Interest rate
   * @param {string} scheme.id Unique identifier of the loan scheme, max 8 chars
   * @param {number} [scheme.activateAfterBlock] Block height at which new changes take effect
   * @param {UTXO[]} [options.utxos = []] Specific UTXOs to spend
   * @param {string} options.utxos.txid Transaction Id
   * @param {number} options.utxos.vout Output number
   * @return {Promise<string>} Hex string of the transaction
   */
  async updateLoanScheme (scheme: UpdateLoanScheme, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('updateloanscheme', [scheme.minColRatio, scheme.interestRate, scheme.id, scheme.activateAfterBlock, utxos], 'number')
  }

  /**
   * Destroys a loan scheme.
   *
   * @param {DestroyLoanScheme} scheme
   * @param {string} scheme.id Unique identifier of the loan scheme, max 8 chars
   * @param {number} [scheme.activateAfterBlock] Block height at which new changes take effect
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>} Hex string of the transaction
   */
  async destroyLoanScheme (scheme: DestroyLoanScheme, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('destroyloanscheme', [scheme.id, scheme.activateAfterBlock, utxos], 'number')
  }

  /**
   * List all available loan schemes.
   *
   * @return {Promise<LoanSchemeResult[]>}
   */
  async listLoanSchemes (): Promise<LoanSchemeResult[]> {
    return await this.client.call('listloanschemes', [], 'bignumber')
  }

  /**
   * Get loan scheme.
   *
   * @param {string} id Unique identifier of the loan scheme, max 8 chars.
   * @return {Promise<GetLoanSchemeResult>}
   */
  async getLoanScheme (id: string): Promise<GetLoanSchemeResult> {
    return await this.client.call('getloanscheme', [id], 'bignumber')
  }

  /**
   * Sets the default loan scheme.
   *
   * @param {string} id Unique identifier of the loan scheme, max 8 chars
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>} Hex string of the transaction
   */
  async setDefaultLoanScheme (id: string, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('setdefaultloanscheme', [id, utxos], 'number')
  }

  /**
   * Set a collateral token transaction.
   *
   * @param {SetCollateralToken} collateralToken
   * @param {string} collateralToken.token Symbol or id of collateral token
   * @param {BigNumber} collateralToken.factor Collateralization factor
   * @param {string} collateralToken.fixedIntervalPriceId token/currency pair to use for price of token
   * @param {number} [collateralToken.activateAfterBlock] changes will be active after the block height
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>} collateralTokenId, also the txn id for txn created to set collateral token
   */
  async setCollateralToken (collateralToken: SetCollateralToken, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('setcollateraltoken', [collateralToken, utxos], 'number')
  }

  /**
   * List collateral tokens.
   *
   * @param {ListCollateralTokens} [collateralToken = {}]
   * @param {number} [collateralToken.height = CurrentBlockheight] Valid at specified height
   * @param {boolean} [collateralToken.all] True = All transactions, false =  Activated transactions
   * @return {Promise<CollateralTokenDetail[]>} Get all collateral tokens
   */
  async listCollateralTokens (collateralToken: ListCollateralTokens = {}): Promise<CollateralTokenDetail[]> {
    return await this.client.call('listcollateraltokens', [collateralToken], 'bignumber')
  }

  /**
   * Get collateral token.
   *
   * @param {string} token symbol or id
   * @return {Promise<CollateralTokenDetail>} Collateral token result
   */
  async getCollateralToken (token: string): Promise<CollateralTokenDetail> {
    return await this.client.call('getcollateraltoken', [token], 'bignumber')
  }

  /**
   * Creates (and submits to local node and network) a token for a price feed set in collateral token.
   *
   * @param {SetLoanToken} loanToken
   * @param {string} loanToken.symbol Token's symbol (unique), no longer than 8
   * @param {string} [loanToken.name] Token's name, no longer than 128
   * @param {string} loanToken.fixedIntervalPriceId token/currency pair to use for price of token
   * @param {boolean} [loanToken.mintable = true] Token's 'Mintable' property
   * @param {BigNumber} [loanToken.interest = 0] Interest rate
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>} LoanTokenId, also the txn id for txn created to set loan token
   */
  async setLoanToken (loanToken: SetLoanToken, utxos: UTXO[] = []): Promise<string> {
    const defaultData = {
      mintable: true,
      interest: 0
    }
    return await this.client.call('setloantoken', [{ ...defaultData, ...loanToken }, utxos], 'number')
  }

  /**
   * Updates an existing loan token.
   *
   * @param {string} oldToken Previous tokens's symbol, id or creation tx (unique)
   * @param {UpdateLoanToken} newTokenDetails
   * @param {string} [newTokenDetails.symbol] New token's symbol (unique), no longer than 8
   * @param {string} [newTokenDetails.name] Token's name, no longer than 128
   * @param {string} [newTokenDetails.fixedIntervalPriceId] token/currency pair to use for price of token
   * @param {boolean} [newTokenDetails.mintable] Token's 'Mintable' property
   * @param {BigNumber} [newTokenDetails.interest] Interest rate
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>} LoanTokenId, also the txn id for txn created to update loan token
   */
  async updateLoanToken (oldToken: string, newTokenDetails: UpdateLoanToken, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('updateloantoken', [oldToken, newTokenDetails, utxos], 'number')
  }

  /**
   * Get interest info
   *
   * @param {string} id Loan scheme id
   * @param {string} [token] Specified by loan token id, loan token name and loan toekn creation tx
   * @return {Promise<Interest[]>}
   */
  async getInterest (id: string, token?: string): Promise<Interest[]> {
    return await this.client.call('getinterest', [id, token], 'bignumber')
  }

  /**
   * Get loan token.
   *
   * @param {string} token Symbol or id of loan token
   * @return {Promise<LoanTokenDetails>} Loan token details
   */
  async getLoanToken (token: string): Promise<LoanTokenDetails> {
    return await this.client.call('getloantoken', [token], 'bignumber')
  }

  /**
   * List all created loan tokens.
   *
   * @return {Promise<ListLoanTokenResult>}
   */
  async listLoanTokens (): Promise<ListLoanTokenResult> {
    return await this.client.call('listloantokens', [], 'bignumber')
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
   * Returns information about vault.
   *
   * @param {string} vaultId vault hex id
   * @return {Promise<VaultDetails>}
   */
  async getVault (vaultId: string): Promise<VaultDetails> {
    return await this.client.call('getvault', [vaultId], 'bignumber')
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
   * List all available vaults.
   *
   * @param {VaultPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @param {ListVaultOptions} [options]
   * @param {string} [options.ownerAddress] Address of the vault owner
   * @param {string} [options.loanSchemeId] Vault's loan scheme id
   * @param {boolean} [options.isUnderLiquidation = false] vaults under liquidation
   * @return {Promise<VaultDetails[]>} Array of objects including details of the vaults.
   */
  async listVaults (pagination: VaultPagination = {}, options: ListVaultOptions = {}): Promise<VaultDetails[]> {
    return await this.client.call('listvaults', [options, pagination], 'bignumber')
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
   * Take loan
   *
   * @param {TakeLoanMetadata} metadata
   * @param {string} metadata.vaultId Vault id
   * @param {string | string[]} metadata.amounts In "amount@symbol" format
   * @param {string} [metadata.to] Address to receive tokens
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>}
   */
  async takeLoan (metadata: TakeLoanMetadata, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('takeloan', [metadata, utxos], 'number')
  }

  /**
   * Return loan in a desired amount.
   *
   * @param {LoanPaybackMetadata} metadata
   * @param {string} metadata.vaultId Vault id
   * @param {string| string[]} metadata.amounts In "amount@symbol" format
   * @param {string} metadata.from Address from transfer tokens
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>} txid
   */
  async loanPayback (metadata: LoanPaybackMetadata, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('loanpayback', [metadata, utxos], 'number')
  }
}

export interface CreateLoanScheme {
  minColRatio: number
  interestRate: BigNumber
  id: string
}

export interface UpdateLoanScheme {
  minColRatio: number
  interestRate: BigNumber
  id: string
  activateAfterBlock?: number
}

export interface DestroyLoanScheme {
  id: string
  activateAfterBlock?: number
}

export interface LoanSchemeResult {
  id: string
  mincolratio: BigNumber
  interestrate: BigNumber
  default: boolean
}

export interface SetCollateralToken {
  token: string
  factor: BigNumber
  fixedIntervalPriceId: string
  activateAfterBlock?: number
}

export interface GetLoanSchemeResult {
  id: string
  interestrate: BigNumber
  mincolratio: BigNumber
}

export interface ListCollateralTokens {
  height?: number
  all?: boolean
}

export interface CollateralTokenDetail {
  token: string
  factor: BigNumber
  fixedIntervalPriceId: string
  activateAfterBlock: BigNumber
  tokenId: string
}

export interface SetLoanToken {
  symbol: string
  name?: string
  fixedIntervalPriceId: string
  mintable?: boolean
  interest?: BigNumber
}

export interface ListLoanTokenResult {
  token: LoanTokenDetails
  fixedIntervalPriceId: string
  interest: BigNumber
}

export interface LoanTokenDetails {
  [key: string]: token.TokenResult
}

export interface UpdateLoanToken {
  symbol?: string
  name?: string
  fixedIntervalPriceId?: string
  mintable?: boolean
  interest?: BigNumber
}

export interface Interest {
  token: string
  totalInterest: BigNumber
  interestPerBlock: BigNumber
}

export interface CreateVault {
  ownerAddress: string
  loanSchemeId?: string
}

export interface VaultDetails {
  vaultId: string
  loanSchemeId: string
  ownerAddress: string
  isUnderLiquidation: boolean
  invalidPrice: boolean
  batches?: AuctionBatchDetails[]
  collateralAmounts?: string[]
  loanAmounts?: string[]
  interestAmounts?: string[]
  collateralValue?: BigNumber
  loanValue?: BigNumber
  interestValue?: BigNumber
  currentRatio?: BigNumber
}

export interface AuctionBatchDetails {
  index: BigNumber
  collaterals: string[]
  loan: string
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

export interface TakeLoanMetadata {
  vaultId: string
  amounts: string | string[] // amount@symbol
  to?: string
}

export interface LoanPaybackMetadata {
  vaultId: string
  amounts: string | string[] // amount@symbol
  from?: string
}

export interface VaultPagination {
  start?: string
  including_start?: boolean
  limit?: number
}

export interface ListVaultOptions {
  ownerAddress?: string
  loanSchemeId?: string
  isUnderLiquidation?: boolean
}

export interface CloseVault {
  vaultId: string
  to: string
}
