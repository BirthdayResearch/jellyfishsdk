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
   * @param {string} collateralToken.priceFeedId token/currency pair to use for price of token
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
   * @return {Promise<CollateralTokensData>} Get all collateral tokens
   */
  async listCollateralTokens (): Promise<CollateralTokensData> {
    return await this.client.call('listcollateraltokens', [], 'bignumber')
  }

  /**
   * Get collateral token.
   *
   * @param {GetCollateralToken} [collateralToken = {}]
   * @param {string} [collateralToken.token] Symbol of collateral token
   * @param {number} [collateralToken.height = CurrentBlockheight] Valid at specified height
   * @return {Promise<CollateralTokenDetails>} Collateral token result
   */
  async getCollateralToken (collateralToken: GetCollateralToken = {}): Promise<CollateralTokenDetails> {
    return await this.client.call('getcollateraltoken', [collateralToken], 'bignumber')
  }

  /**
   * Creates (and submits to local node and network) a token for a price feed set in collateral token.
   *
   * @param {SetLoanToken} loanToken
   * @param {string} loanToken.symbol Token's symbol (unique), no longer than 8
   * @param {string} [loanToken.name] Token's name, no longer than 128
   * @param {string} loanToken.priceFeedId token/currency pair to use for price of token
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
   * @param {string} [newTokenDetails.priceFeedId] token/currency pair to use for price of token
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
   * List all created loan tokens.
   *
   * @return {Promise<ListLoanTokenResult[]>}
   */
  async listLoanTokens (): Promise<ListLoanTokenResult[]> {
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
   * @param {string} metadata.amounts In "amount@symbol" format
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>}
   */
  async takeLoan (metadata: TakeLoanMetadata, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('takeloan', [metadata, utxos], 'number')
  }

  /**
   * List all available auctions.
   *
   * @return {ListAuction[]}
   */
  async listAuctions (): Promise<AuctionDetail[]> {
    return await this.client.call('listauctions', [], 'bignumber')
  }
}

export interface AuctionDetail {
  vaultId: string
  batchCount: BigNumber
  liquidationPenalty: BigNumber
  batches: AuctionBatchDetails[]
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
  priceFeedId: string
  activateAfterBlock?: number
}

export interface CollateralTokensData {
  [key: string]: CollateralTokenDetails
}

export interface GetLoanSchemeResult {
  id: string
  interestrate: BigNumber
  mincolratio: BigNumber
}

export interface GetCollateralToken {
  token?: string
  height?: number
}

export interface CollateralTokenDetails {
  token: string
  factor: BigNumber
  priceFeedId: string
  activateAfterBlock: BigNumber
}

export interface SetLoanToken {
  symbol: string
  name?: string
  priceFeedId: string
  mintable?: boolean
  interest?: BigNumber
}

export interface ListLoanTokenResult {
  [key: string]: LoanTokenDetails
}

export interface LoanTokenDetails {
  token: token.TokenResult
  priceFeedId: string
  interest: BigNumber
}

export interface UpdateLoanToken {
  symbol?: string
  name?: string
  priceFeedId?: string
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
  loanSchemeId: string
  ownerAddress: string
  isUnderLiquidation: boolean
  batches?: AuctionBatchDetails[]
  collateralAmounts?: string[]
  loanAmount?: string[]
  collateralValue?: BigNumber
  loanValue?: BigNumber
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
  amounts: string // amount@symbol
}
