import { ListProposalsStatus, ListProposalsType } from '@defichain/jellyfish-api-core/dist/category/governance'
import {
  GovernanceProposal,
  ProposalMasternodeType,
  ProposalVotesResult
} from '@defichain/whale-api-client/dist/api/governance'
import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common'
import { GovernanceService } from './governance.service'
import { ApiPagedResponse } from './_core/api.paged.response'
import { PaginationQuery } from './_core/api.query'

@Controller('/governance')
export class GovernanceController {
  constructor (private readonly governanceService: GovernanceService) {}

  /**
   * Return paginated governance proposals.
   *
   *
   * @param {ListProposalsStatus} [status=ListProposalsStatus.ALL] type of proposals
   * @param {ListProposalsType} [type=ListProposalsType.ALL] status of proposals
   * @param {number} [cycle=0]  cycle: 0 (show all), cycle: N (show cycle N), cycle: -1 (show previous cycle)
   * @param {PaginationQuery} query pagination query
   * @returns {Promise<ApiPagedResponse<GovernanceProposal>>}
   */
  @Get('/proposals')
  async listProposals (
    @Query() status: ListProposalsStatus = ListProposalsStatus.ALL,
    @Query() type: ListProposalsType = ListProposalsType.ALL,
    @Query('cycle', ParseIntPipe) cycle: number = 0,
    @Query() query?: PaginationQuery
  ): Promise<ApiPagedResponse<GovernanceProposal>> {
    return await this.governanceService.list(query, status, type, cycle)
  }

  /**
   * Get information about a proposal with given proposal id.
   *
   * @param {string} id proposal ID
   * @returns {Promise<GovernanceProposal>}
   */
  @Get('/proposals/:id')
  async getProposal (@Param('id') proposalId: string): Promise<GovernanceProposal> {
    return await this.governanceService.get(proposalId)
  }

  /**
   * Returns information about proposal votes.
   *
   * @param {string} id proposalId
   * @param {ProposalMasternodeType | string} [masternode=ProposalMasternodeType.ALL] masternode id or reserved words 'mine' to list votes for all owned accounts or 'all' to list all votes
   * @param {number} [cycle=0] cycle: 0 (show current), cycle: N (show cycle N), cycle: -1 (show all)
   * @param {PaginationQuery} query
   * @return {Promise<ProposalVotesResult[]>} Proposal vote information
   */
  @Get('/proposals/:id/votes')
  async listProposalVotes (
    @Param('id') id: string,
      @Query('masternode') masternode: string | ProposalMasternodeType = ProposalMasternodeType.MINE,
      @Query('cycle', ParseIntPipe) cycle: number = 0,
      @Query() query?: PaginationQuery
  ): Promise<ApiPagedResponse<ProposalVotesResult>> {
    return await this.governanceService.getProposalVotes(query, id, masternode, cycle)
  }
}
