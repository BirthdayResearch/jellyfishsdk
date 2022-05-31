import BigNumber from 'bignumber.js'
import { ApiClient } from '../.'

export enum ProposalType {
  COMMUNITY_FUND_PROPOSAL = 'CommunityFundProposal',
  BLOCK_REWARD_RELLOCATION = 'BlockRewardRellocation',
  VOTE_OF_CONFIDENCE = 'VoteOfConfidence'
}

export enum ProposalStatus {
  VOTING = 'Voting',
  REJECTED = 'Rejected',
  COMPLETED = 'Completed',
  APPROVED = 'Approved'
}

export enum ListProposalsType {
  CFP = 'cfp',
  BRP = 'brp',
  VOC = 'voc',
  ALL = 'all'
}

export enum ListProposalsStatus {
  VOTING = 'voting',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  ALL = 'all'
}

export enum VoteDecision {
  YES = 'yes',
  NO = 'no',
  NEUTRAL = 'neutral'
}

export enum MasternodeType {
  MINE = 'mine',
  ALL = 'all'
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
   * Creates a Community Fund Proposal.
   *
   * @param {CFPData} data Community fund proposal data
   * @param {string} data.title Title of community fund request
   * @param {string} data.context Context of community fund request
   * @param {BigNumber} data.amount Amount per period
   * @param {string} data.payoutAddress Any valid address to receive the funds
   * @param {number} [data.cycles=1] Number of cycles for periodic fund request. Defaults to one cycle.
   * @param {UTXO[]} [utxos = []] Specific utxos to spend
   * @param {string} [utxos.txid] The transaction id
   * @param {number} [utxos.vout] The output number
   * @return {Promise<string>} txid
   */
  async createGovCfp (data: CFPData, utxos: UTXO[] = []): Promise<string> {
    const defaultData = {
      cycles: 1
    }
    return await this.client.call('creategovcfp', [{ ...defaultData, ...data }, utxos], 'number')
  }

  /**
   * Returns information about the proposal.
   *
   * @param {string} proposalId Proposal id
   * @return {Promise<ProposalInfo>} Information about the proposal
   */
  async getGovProposal (proposalId: string): Promise<ProposalInfo> {
    return await this.client.call('getgovproposal', [proposalId], { amount: 'bignumber' })
  }

  /**
   * Creates a Vote of Confidence.
   *
   * @param {string} title Vote of confidence's title
   * @param {string} context Vote of confidence's context
   * @param {UTXO[]} [utxos = []] Specific utxos to spend
   * @param {string} [utxos.txid] The transaction id
   * @param {number} [utxos.vout] The output number
   * @return {Promise<string>} txid
   */
  async createGovVoc (title: string, context: string, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('creategovvoc', [title, context, utxos], 'number')
  }

  /**
   * Returns list of proposals.
   *
   * @param {Object} options List proposal filter options
   * @param {ListProposalsType} [options.type=ListProposalsType.ALL] type of proposals
   * @param {ListProposalsStatus} [options.status=ListProposalsStatus.ALL] status of proposals
   * @return {Promise<ProposalInfo[]>}
   */
  async listGovProposals ({
    type = ListProposalsType.ALL,
    status = ListProposalsStatus.ALL
  } = {}): Promise<ProposalInfo[]> {
    return await this.client.call('listgovproposals', [type, status], { amount: 'bignumber' })
  }

  /**
   * Vote on a community proposal.
   *
   * @param {VoteData} data Vote data
   * @param {string} data.proposalId Proposal id
   * @param {number} data.masternodeId Masternode id
   * @param {VoteDecision} data.decision Vote decision. See VoteDecision.
   * @param {UTXO[]} [utxos = []] Specific utxos to spend
   * @param {string} [utxos.txid] The transaction id
   * @param {string} [utxos.vout] The output number
   * @return {Promise<string>} txid
   */
  async voteGov (data: VoteData, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('votegov', [data.proposalId, data.masternodeId, data.decision, utxos], 'number')
  }

  /**
   * Returns information about proposal votes.
   *
   * @param {string} proposalId Proposal id
   * @param {MasternodeType | string} [masternode=MasternodeType.MINE] masternode id or reserved words 'mine' to list votes for all owned accounts or 'all' to list all votes
   * @return {Promise<ListVotesResult[]>} Proposal vote information
   */
  async listGovVotes (proposalId: string, masternode: MasternodeType | string = MasternodeType.MINE): Promise<ListVotesResult[]> {
    return await this.client.call('listgovvotes', [proposalId, masternode], 'number')
  }
}

export interface CFPData {
  title: string
  context: string
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
  context: string
  type: ProposalType
  status: ProposalStatus
  amount: BigNumber
  cyclesPaid: number
  totalCycles: number
  finalizeAfter: number
  payoutAddress: string
  approval: string
  validity: string
  ends: string
}

export interface VoteData {
  proposalId: string
  masternodeId: string
  decision: VoteDecision
}

export interface ListVotesResult {
  proposalId: string
  masternodeId: string
  cycle: number
  vote: string
}
