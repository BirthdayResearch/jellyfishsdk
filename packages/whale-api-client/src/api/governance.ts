import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

export class Governance {
  constructor (private readonly client: WhaleApiClient) {}

  /**
   * Paginate query on-chain governance proposals
   *
   * @param {number} [size=30] of proposal to query
   * @param {string} next set of proposals
   * @param {GovernanceListProposalsType} [type=GovernanceListProposalsType.ALL] proposal type
   * @param {GovernanceListProposalsStatus} [status=GovernanceListProposalsStatus.ALL] proposal status
   * @param {number} [cycle=0] cycle: 0 (show all), cycle: N (show cycle N), cycle: -1 (show previous cycle)
   * @returns {Promise<ApiPagedResponse<ProposalInfo>>}
   */
  async listGovProposals (
    size: number = 30,
    next?: string,
    type = GovernanceListProposalsType.ALL,
    status = GovernanceListProposalsStatus.ALL,
    cycle = 0
  ): Promise<ApiPagedResponse<GovernanceProposal>> {
    return await this.client.requestList(
      'GET',
      `governance/proposals?type=${type}&status=${status}&cycle=${cycle}`,
      size,
      next
    )
  }

  /**
   * Get information about a vault with given vault id.
   *
   * @param {string} id proposal ID
   * @returns {Promise<GovernanceProposal>}
   */
  async getGovProposal (id: string): Promise<GovernanceProposal> {
    return await this.client.requestData('GET', `governance/proposal/${id}`)
  }

  /**
   * Returns votes for a proposal
   *
   * @param {string} id proposal ID
   * @param {ProposalMasternodeType | string} [masternode=ProposalMasternodeType.ALL] masternode id or reserved words 'mine' to list votes for all owned accounts or 'all' to list all votes
   * @param {number} [cycle=0] cycle: 0 (show current), cycle: N (show cycle N), cycle: -1 (show all)
   * @return {Promise<ProposalVotesResult[]>} Proposal vote information
   */
  async listGovProposalVotes (
    id: string,
    masternode: string | ProposalMasternodeType = ProposalMasternodeType.MINE,
    cycle: number = 0
  ): Promise<ProposalVotesResult> {
    return await this.client.requestData(
      'GET',
      `governance/proposals/${id}/votes?masternode=${masternode}&cycle=${cycle}`
    )
  }
}

export enum GovernanceListProposalsType {
  CFP = 'cfp',
  VOC = 'voc',
  ALL = 'all',
}

export enum GovernanceListProposalsStatus {
  VOTING = 'voting',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  ALL = 'all',
}

export enum GovernanceProposalType {
  COMMUNITY_FUND_PROPOSAL = 'CommunityFundProposal',
  VOTE_OF_CONFIDENCE = 'VoteOfConfidence',
}

export enum GovernanceProposalStatus {
  VOTING = 'Voting',
  REJECTED = 'Rejected',
  COMPLETED = 'Completed',
}

export interface GovernanceProposal {
  proposalId: string
  title: string
  context: string
  contextHash: string
  type: GovernanceProposalType
  status: GovernanceProposalStatus
  amount?: string
  currentCycle: number
  totalCycles: number
  creationHeight: number
  cycleEndHeight: number
  proposalEndHeight: number
  payoutAddress?: string
  votingPeriod: number
  approvalThreshold: string
  quorum: string
  votesPossible?: number
  votesPresent?: number
  votesPresentPct?: string
  votesYes?: number
  votesYesPct?: string
  fee: number
  options?: string[]
}

export enum ProposalMasternodeType {
  MINE = 'mine',
  ALL = 'all',
}

export interface ProposalVotesResult {
  proposalId: string
  masternodeId: string
  cycle: number
  vote: ProposalVoteResultType
}

export enum ProposalVoteResultType {
  YES = 'YES',
  NO = 'NO',
  NEUTRAL = 'NEUTRAL',
  UNKNOWN = 'UNKNOWN'
}
