import {
  ListProposalsStatus,
  ListProposalsType,
  ProposalInfo,
  ProposalStatus,
  ProposalType,
  VoteResult
} from '@defichain/jellyfish-api-core/dist/category/governance'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ApiPagedResponse } from './_core/api.paged.response'
import { PaginationQuery } from './_core/api.query'
import { NotFoundApiException } from './_core/api.error'
import {
  GovernanceProposal,
  GovernanceProposalStatus,
  GovernanceProposalType,
  ProposalMasternodeType,
  ProposalVoteResultType,
  ProposalVotesResult
} from '@defichain/whale-api-client/dist/api/governance'

@Injectable()
export class GovernanceService {
  constructor (private readonly client: JsonRpcClient) {}

  async listGovernanceProposal (
    query: PaginationQuery = {
      size: 30
    },
    status?: ListProposalsStatus,
    type?: ListProposalsType,
    cycle?: number,
    all: boolean = false
  ): Promise<ApiPagedResponse<GovernanceProposal>> {
    const next = query.next !== undefined ? String(query.next) : undefined
    const size = all ? 0 : Math.min(query.size, 30) // blockchain by design to return all records when limit = 0
    const list = await this.client.governance.listGovProposals({
      type,
      status,
      cycle,
      pagination: {
        start: next,
        limit: size
      }
    })

    const proposals = list.map((proposal: ProposalInfo) => {
      return this.mapGovernanceProposal(proposal)
    })

    return ApiPagedResponse.of(proposals, size, (proposal) => {
      return proposal.proposalId
    })
  }

  async getGovernanceProposal (id: string): Promise<GovernanceProposal> {
    try {
      const proposal = await this.client.governance.getGovProposal(id)
      return this.mapGovernanceProposal(proposal)
    } catch (err) {
      if (
        err instanceof RpcApiError &&
        (err?.payload?.message === `Proposal <${id}> not found` ||
          err?.payload?.message.includes('proposalId must be of length 64'))
      ) {
        throw new NotFoundApiException('Unable to find proposal')
      } else {
        throw new BadRequestException(err)
      }
    }
  }

  async getGovernanceProposalVotes (
    query: PaginationQuery = {
      size: 30
    },
    id: string,
    masternode: ProposalMasternodeType | string = ProposalMasternodeType.MINE,
    cycle: number = 0,
    all?: boolean
  ): Promise<ApiPagedResponse<ProposalVotesResult>> {
    try {
      const next = query.next !== undefined ? Number(query.next) : undefined
      const size = all === true ? 0 : Math.min(query.size, 30) // blockchain by design to return all records when limit = 0
      const list = await this.client.governance.listGovProposalVotes({
        proposalId: id,
        masternode,
        cycle,
        pagination: {
          start: next,
          limit: size
        }
      })
      const votes = list.map((v) => ({
        ...v,
        vote: mapGovernanceProposalVoteResult(v.vote)
      }))

      return ApiPagedResponse.of(votes, size, () => {
        return (votes.length - 1).toString()
      })
    } catch (err) {
      if (
        err instanceof RpcApiError &&
        (err?.payload?.message === `Proposal <${id}> not found` ||
          err?.payload?.message.includes('proposalId must be of length 64'))
      ) {
        throw new NotFoundApiException('Unable to find proposal')
      } else {
        throw new BadRequestException(err)
      }
    }
  }

  private mapGovernanceProposal (data: ProposalInfo): GovernanceProposal {
    return {
      ...data,
      type: mapGovernanceProposalType(data.type),
      status: mapGovernanceProposalStatus(data.status),
      amount: data.amount?.toFixed(8)
    }
  }
}

function mapGovernanceProposalType (type: ProposalType): GovernanceProposalType {
  switch (type) {
    case ProposalType.COMMUNITY_FUND_PROPOSAL:
      return GovernanceProposalType.COMMUNITY_FUND_PROPOSAL
    case ProposalType.VOTE_OF_CONFIDENCE:
      return GovernanceProposalType.VOTE_OF_CONFIDENCE
  }
}

function mapGovernanceProposalStatus (
  type: ProposalStatus
): GovernanceProposalStatus {
  switch (type) {
    case ProposalStatus.COMPLETED:
      return GovernanceProposalStatus.COMPLETED
    case ProposalStatus.REJECTED:
      return GovernanceProposalStatus.REJECTED
    case ProposalStatus.VOTING:
      return GovernanceProposalStatus.VOTING
  }
}

function mapGovernanceProposalVoteResult (type: VoteResult): ProposalVoteResultType {
  switch (type) {
    case VoteResult.YES:
      return ProposalVoteResultType.YES
    case VoteResult.NO:
      return ProposalVoteResultType.NO
    case VoteResult.NEUTRAL:
      return ProposalVoteResultType.NEUTRAL
    default:
      return ProposalVoteResultType.UNKNOWN
  }
}
