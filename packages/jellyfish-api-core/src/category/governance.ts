import BigNumber from 'bignumber.js'
import { ApiClient } from '../.'

export enum ProposalType {
  COMMUNITY_FUND_REQUEST = 'CommunityFundRequest',
  BLOCK_REWARD_RELLOCATION = 'BlockRewardRellocation',
  VOTE_OF_CONFIDENCE = 'VoteOfConfidence'
}

export enum ProposalStatus {
  VOTING = 'Voting',
  REJECTED = 'Rejected',
  COMPLETED = 'Completed'
}

/**
 * Governance RPCs for DeFi Blockchain
 */
export class Governance {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Creates a Cummunity Fund Request.
   *
   * @param {CFPData} data Community fund proposal data
   * @param {string} data.title Title of community fund request
   * @param {number} [data.cycles=1] Number of cycles for periodic fund request. Defaults to one cycle.
   * @param {BigNumber} data.amount Amount per period
   * @param {string} data.payoutAddress Any valid address to receive the funds
   * @param {UTXO[]} [utxos = []] Specific utxos to spend
   * @param {string} [utxos.txid] The transaction id
   * @param {number} [utxos.vout] The output number
   * @return {Promise<string>} txid
   */
  async createCfp (data: CFPData, utxos: UTXO[] = []): Promise<string> {
    const defaultData = {
      cycles: 1
    }
    return await this.client.call('createcfp', [{ ...defaultData, ...data }, utxos], 'number')
  }
}

export interface CFPData {
  title: string
  cycles?: number
  amount: BigNumber
  payoutAddress: string
}

/** Input UTXO */
export interface UTXO {
  /** transaction id */
  txid: string
  /** output number */
  vout: number
}
