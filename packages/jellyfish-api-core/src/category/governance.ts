import BigNumber from 'bignumber.js'
import { ApiClient } from '../.'

export enum ProposalType {
  COMMUNITY_FUND_PROPOSAL = 'CommunityFundProposal',
  VOTE_OF_CONFIDENCE = 'VoteOfConfidence'
}

export enum ProposalStatus {
  VOTING = 'Voting',
  REJECTED = 'Rejected',
  COMPLETED = 'Completed'
}

export enum ListProposalsType {
  CFP = 'cfp',
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

export enum VoteResult {
  YES = 'YES',
  NO = 'NO',
  NEUTRAL = 'NEUTRAL',
  Unknown = 'Unknown'
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
   * @param {string} data.contextHash Hash of the content which context field point to of community fund request
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
   * @param {VOCData} data Vote of confidence data
   * @param {string} data.title Vote of confidence's title
   * @param {string} data.context Vote of confidence's context
   * @param {string} data.contextHash Hash of the content which context field point to of vote of confidence request
   * @param {boolean} data.emergency Is this emergency VOC
   * @param {UTXO[]} [utxos = []] Specific utxos to spend
   * @param {string} [utxos.txid] The transaction id
   * @param {number} [utxos.vout] The output number
   * @return {Promise<string>} txid
   */
  async createGovVoc (data: VOCData, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('creategovvoc', [data, utxos], 'number')
  }

  /**
   * Returns list of proposals.
   *
   * @param {Object} options List proposal filter options
   * @param {ListProposalsType} [options.type=ListProposalsType.ALL] type of proposals
   * @param {ListProposalsStatus} [options.status=ListProposalsStatus.ALL] status of proposals
   * @param {number} [options.cycle=0] cycle: 0 (show all), cycle: N (show cycle N), cycle: -1 (show previous cycle)
   * @param {ListProposalsPagination} [options.pagination]
   * @param {number} [options.pagination.start=0]
   * @param {boolean} [options.pagination.including_start=true] defaults to false if options.pagination.start is set, true otherwise
   * @param {number} [options.pagination.limit=100] to limit number of records
   * @return {Promise<ProposalInfo[]>}
   */
  async listGovProposals (options: ListProposalsOptions = {}): Promise<ProposalInfo[]> {
    return await this.client.call('listgovproposals', [options], { amount: 'bignumber' })
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
   * @param {ListGovProposalVotesOptions} options
   * @param {string} options.proposalId Proposal id
   * @param {MasternodeType | string} [options.masternode=MasternodeType.MINE] masternode id or reserved words 'mine' to list votes for all owned accounts or 'all' to list all votes
   * @param {number} [options.cycle=0] cycle: 0 (show current), cycle: N (show cycle N), cycle: -1 (show all)
   * @param {ListGovProposalVotesPagination} [options.pagination]
   * @param {number} [options.pagination.start=0]
   * @param {boolean} [options.pagination.including_start=true] defaults to false if options.pagination.start is set, true otherwise
   * @param {number} [options.pagination.limit=100] to limit number of records
   * @return {Promise<ListVotesResult[]>} Proposal vote information
   */
  async listGovProposalVotes (
    options: ListGovProposalVotesOptions
  ): Promise<ListVotesResult[]> {
    return await this.client.call('listgovproposalvotes', [options], 'number')
  }
}

export interface CFPData {
  title: string
  context: string
  contextHash?: string
  amount: BigNumber
  payoutAddress: string
  cycles?: number
}

export interface VOCData {
  title: string
  context: string
  contextHash?: string
  emergency?: boolean
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
  contextHash: string
  type: ProposalType
  status: ProposalStatus
  amount?: BigNumber
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

export interface VoteData {
  proposalId: string
  masternodeId: string
  decision: VoteDecision
}

export interface ListVotesResult {
  proposalId: string
  masternodeId: string
  cycle: number
  vote: VoteResult
}

export interface ListProposalsOptions {
  type?: ListProposalsType
  status?: ListProposalsStatus
  cycle?: number
  pagination?: ListProposalsPagination
}

export interface ListProposalsPagination {
  start?: string
  including_start?: boolean
  limit?: number
}

export interface ListGovProposalVotesOptions {
  proposalId: string
  masternode?: MasternodeType | string
  cycle?: number
  pagination?: ListGovProposalVotesPagination
}

export interface ListGovProposalVotesPagination {
  start?: number
  including_start?: boolean
  limit?: number
}
