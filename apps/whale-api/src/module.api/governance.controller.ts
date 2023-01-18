import { ListProposalsStatus, ListProposalsType, MasternodeType } from '@defichain/jellyfish-api-core/dist/category/governance'
import {
  GovernanceProposal,
  ProposalVotesResult
} from '@defichain/whale-api-client/dist/api/governance'
import { Controller, DefaultValuePipe, Get, Param, ParseEnumPipe, ParseIntPipe, Query } from '@nestjs/common'
import { GovernanceService } from './governance.service'
import { EnumCustomException } from './pipes/api.validation.pipe'
import { ApiPagedResponse } from './_core/api.paged.response'
import { PaginationQuery } from './_core/api.query'

@Controller('/governance')
export class GovernanceController {
  constructor (private readonly governanceService: GovernanceService) {}

  /**
   * Return paginated governance proposals.
   *
   * @param {ListProposalsStatus} [status=ListProposalsStatus.ALL] type of proposals
   * @param {ListProposalsType} [type=ListProposalsType.ALL] status of proposals
   * @param {number} [cycle=0]  cycle: 0 (show all), cycle: N (show cycle N), cycle: -1 (show previous cycle)
   * @param {boolean} [all=false] flag to return all records
   * @param {PaginationQuery} query pagination query
   * @returns {Promise<ApiPagedResponse<GovernanceProposal>>}
   */
  @Get('/proposals')
  async listProposals (
    @Query('status', new ParseEnumPipe(ListProposalsStatus, { exceptionFactory: () => EnumCustomException('status', ListProposalsStatus) }), new DefaultValuePipe(ListProposalsStatus.ALL)) status?: ListProposalsStatus,
      @Query('type', new ParseEnumPipe(ListProposalsType, { exceptionFactory: () => EnumCustomException('type', ListProposalsType) }), new DefaultValuePipe(ListProposalsType.ALL)) type?: ListProposalsType,
      @Query('cycle', new DefaultValuePipe(0), ParseIntPipe) cycle?: number,
      @Query('all', new DefaultValuePipe(false)) all?: boolean,
      @Query() query?: PaginationQuery
  ): Promise<ApiPagedResponse<GovernanceProposal>> {
    return await this.governanceService.listGovernanceProposal(query, status, type, cycle, all)
  }

  /**
   * Get information about a proposal with given proposal id.
   *
   * @param {string} id proposal ID
   * @returns {Promise<GovernanceProposal>}
   */
  @Get('/proposals/:id')
  async getProposal (@Param('id') proposalId: string): Promise<GovernanceProposal> {
    return await this.governanceService.getGovernanceProposal(proposalId)
  }

  /**
   * Returns information about proposal votes.
   *
   * @param {string} id proposalId
   * @param {MasternodeType | string} [masternode=MasternodeType.ALL] masternode id or reserved words 'mine' to list votes for all owned accounts or 'all' to list all votes
   * @param {number} [cycle=0] cycle: 0 (show current), cycle: N (show cycle N), cycle: -1 (show all)
   * @param {PaginationQuery} query
   * @return {Promise<ProposalVotesResult[]>} Proposal vote information
   */
  @Get('/proposals/:id/votes')
  async listProposalVotes (
    @Param('id') id: string,
      @Query('masternode', new DefaultValuePipe(MasternodeType.MINE)) masternode?: MasternodeType | string,
      @Query('cycle', new DefaultValuePipe(0), ParseIntPipe) cycle?: number,
      @Query('all', new DefaultValuePipe(false)) all?: boolean,
      @Query() query?: PaginationQuery
  ): Promise<ApiPagedResponse<ProposalVotesResult>> {
    return await this.governanceService.getGovernanceProposalVotes(query, id, masternode, cycle, all)
  }
}
