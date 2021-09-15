import { ApiClient } from '../.'
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
   * @param {string} collateralToken.priceFeedId txid of oracle feeding the price
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
   * @param {string} loanToken.priceFeedId Txid of oracle feeding the price
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
  [key: string]: CollateralTokenDetail
}

export interface CollateralTokenDetail {
  token: string
  factor: BigNumber
  priceFeedId: string
  activateAfterBlock: BigNumber
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
  [key: string]: ListLoanDetail
}

export interface ListLoanDetail {
  token: LoanTokenData
  priceFeedId: string
  interest: BigNumber
}

export interface LoanTokenData {
  [key: string]: LoanTokenInfo
}

export interface LoanTokenInfo {
  collateralAddress: string
  creationHeight: BigNumber
  creationTx: string
  decimal: BigNumber
  destructionHeight: BigNumber
  destructionTx: string
  finalized: false
  isDAT: boolean
  isLPS: boolean
  isLoanToken: boolean
  limit: BigNumber
  mintable: boolean
  minted: BigNumber
  name: string
  symbol: string
  symbolKey: string
  tradeable: boolean
}

export interface CreateVault {
  ownerAddress: string
  loanSchemeId?: string
}

export interface UTXO {
  txid: string
  vout: number
}
