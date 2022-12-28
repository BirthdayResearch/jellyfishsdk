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

  async list (
    query: PaginationQuery,
    type?: ListProposalsType,
    status?: ListProposalsStatus
  ): Promise<ApiPagedResponse<GovernanceProposal>> {
    // const next = query.next !== undefined ? String(query.next) : undefined; // TODO: implement pagination after available on ain
    const size = query.size > 30 ? 30 : query.size
    const list = await this.client.governance.listGovProposals({
      type,
      status
    })

    const proposals = list.map((proposal: ProposalInfo) => {
      return this.mapGovernanceProposal(proposal)
    })

    return ApiPagedResponse.of(proposals, size, (proposal) => {
      return proposal.proposalId
    })
  }

  async get (id: string): Promise<GovernanceProposal> {
    try {
      const proposal = await this.client.governance.getGovProposal(id)
      return this.mapGovernanceProposal(proposal)
    } catch (err) {
      if (
        err instanceof RpcApiError &&
        (err?.payload?.message === `Proposal <${id}> not found` ||
          err?.payload?.message ===
            "proposalId must be of length 64 (not 3, for '999')")
      ) {
        throw new NotFoundApiException('Unable to find proposal')
      } else {
        throw new BadRequestException(err)
      }
    }
  }

  async getProposalVotes (
    id: string,
    masternode: string | ProposalMasternodeType,
    cycle: number
  ): Promise<ProposalVotesResult[]> {
    try {
      const votes = await this.client.governance.listGovProposalVotes(
        id,
        masternode,
        cycle
      )
      return votes.map((v) => ({
        ...v,
        vote: mapGovernanceProposalVoteResult(v.vote)
      }))
    } catch (err) {
      if (
        err instanceof RpcApiError &&
        (err?.payload?.message === `Proposal <${id}> not found` ||
          err?.payload?.message ===
            "proposalId must be of length 64 (not 3, for '999')")
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
      return ProposalVoteResultType.Unknown
  }
}
