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
   * Creates a Community Fund Request.
   *
   * @param {CFPData} data Community fund proposal data
   * @param {string} data.title Title of community fund request
   * @param {BigNumber} data.amount Amount per period
   * @param {string} data.payoutAddress Any valid address to receive the funds
   * @param {number} [data.cycles=1] Number of cycles for periodic fund request. Defaults to one cycle.
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

  /**
   * Returns information about the proposal.
   *
   * @param {string} proposalId Proposal id
   * @return {Promise<ProposalInfo>} Information about the proposal
   */
  async getProposal (proposalId: string): Promise<ProposalInfo> {
    return await this.client.call('getproposal', [proposalId], 'number')
  }

  /**
   * Creates a Vote of Confidence.
   *
   * @param {string} [title] Vote of confidence's title
   * @param {UTXO[]} [utxos = []] Specific utxos to spend
   * @param {string} [utxos.txid] The transaction id
   * @param {number} [utxos.vout] The output number
   * @return {Promise<string>} txid
   */
  async createVoc (title: string, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('createvoc', [title, utxos], 'number')
  }
}

export interface CFPData {
  title: string
  amount: BigNumber
  payoutAddress: string
  cycles?: number
}

/** Input UTXO */
export interface UTXO {
  /** transaction id */
  txid: string
  /** output number */
  vout: number
}

export interface ProposalInfo {
  proposalId: string
  title: string
  type: ProposalType
  status: ProposalStatus
  amount: number
  cyclesPaid: number
  totalCycles: number
  finalizeAfter: number
  payoutAddress: string
}
