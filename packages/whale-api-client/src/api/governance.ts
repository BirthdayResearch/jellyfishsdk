import { ListProposalsStatus, ListProposalsType, MasternodeType } from '@defichain/jellyfish-api-core/dist/category/governance'
import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'
export class Governance {
  constructor (private readonly client: WhaleApiClient) {}

  /**
   * Paginate query on-chain governance proposals
   *
   * @param {ListProposalsStatus} [status=ListProposalsStatus.ALL] proposal status
   * @param {ListProposalsType} [type=ListProposalsType.ALL] proposal type
   * @param {number} [cycle=0] cycle: 0 (show all), cycle: N (show cycle N), cycle: -1 (show previous cycle)
   * @param {number} [size=30] of proposal to query
   * @param {string} next set of proposals
   * @param {boolean} all true to return all records, otherwise it will return based on size param
   * @returns {Promise<ApiPagedResponse<ProposalInfo>>}
   */
  async listGovProposals (option?: GovernanceListGovProposalsOptions): Promise<ApiPagedResponse<GovernanceProposal>> {
    return await this.client.requestList(
      'GET',
      'governance/proposals',
      option?.size ?? 30,
      option?.next,
      {
        status: option?.status ?? ListProposalsStatus.ALL,
        type: option?.type ?? ListProposalsType.ALL,
        cycle: option?.cycle ?? 0,
        all: option?.all ?? false
      }
    )
  }

  /**
   * Get information about a vault with given vault id.
   *
   * @param {string} id proposal ID
   * @returns {Promise<GovernanceProposal>}
   */
  async getGovProposal (id: string): Promise<GovernanceProposal> {
    return await this.client.requestData('GET', `governance/proposals/${id}`)
  }

  /**
   * Returns votes for a proposal
   *
   * @param {string} [option.id] proposal ID
   * @param {MasternodeType | string} [option.masternode=MasternodeType.ALL] masternode id or reserved words 'mine' to list votes for all owned accounts or 'all' to list all votes
   * @param {number} [option.cycle=0] cycle: 0 (show current), cycle: N (show cycle N), cycle: -1 (show all)
   * @param {number} [option.size=30] of proposal to query
   * @param {string} [option.next] set of proposals
   * @param {boolean} [option.all] true to return all records, otherwise it will return based on size param
   * @return {Promise<ProposalVotesResult[]>} Proposal vote information
   */
  async listGovProposalVotes (option?: GovernanceListGovProposalVotesOptions): Promise<ApiPagedResponse<ProposalVotesResult>> {
    return await this.client.requestList(
      'GET',
      `governance/proposals/${option?.id ?? ''}/votes`,
      option?.size ?? 30,
      option?.next,
      {
        masternode: option?.masternode ?? MasternodeType.MINE,
        cycle: option?.cycle ?? 0,
        all: option?.all ?? false
      }
    )
  }
}

export interface GovernanceListGovProposalsOptions {
  status?: ListProposalsStatus
  type?: ListProposalsType
  cycle?: number
  size?: number
  next?: string
  all?: boolean
}

export interface GovernanceListGovProposalVotesOptions {
  id: string
  masternode?: MasternodeType
  cycle?: number
  size?: number
  next?: string
  all?: boolean
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

export interface ProposalVotesResult {
  proposalId: string
  masternodeId: string
  cycle: number
  vote: ProposalVoteResultType
  valid: boolean
}

export enum ProposalVoteResultType {
  YES = 'YES',
  NO = 'NO',
  NEUTRAL = 'NEUTRAL',
  UNKNOWN = 'UNKNOWN'
}
