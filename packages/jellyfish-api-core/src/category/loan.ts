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
   * Creates (and submits to local node and network) a token for a price feed set in collateral token.
   *
   * @param {SetLoanToken} loanToken
   * @param {string} loanToken.symbol Token's symbol (unique), no longer than 8
   * @param {string} loanToken.name Token's name, no longer than 128
   * @param {string} loanToken.priceFeedId Txid of oracle feeding the price
   * @param {boolean} [loanToken.mintable] Token's 'Mintable' property, default=true
   * @param {BigNumber} [loanToken.interest=new BigNumber(0)] // Interest rate, default=0
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>} LoanTokenId, also the txn id for txn created to set loan token
   */
  async setLoanToken (loanToken: SetLoanToken, utxos: UTXO[] = []): Promise<string> {
    const defaultLoanToken = { interest: new BigNumber(0) }
    return await this.client.call('setloantoken', [{ ...defaultLoanToken, ...loanToken }, utxos], 'number')
  }
}

export interface CreateLoanScheme {
  minColRatio: number
  interestRate: BigNumber
  id: string
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

export interface SetLoanToken {
  symbol: string
  name: string
  priceFeedId: string
  mintable?: boolean
  interest?: BigNumber
}

export interface UTXO {
  txid: string
  vout: number
}
