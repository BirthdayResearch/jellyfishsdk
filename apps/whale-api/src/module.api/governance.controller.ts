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
   * Paginate governance proposals.
   *
   * @param query
   * @returns {Promise<ApiPagedResponse<GovernanceProposal>>}
   */
  @Get('/proposals')
  async listProposals (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<GovernanceProposal>> {
    return await this.governanceService.list(query)
  }

  /**
   * Get information about a proposal with given proposal id.
   *
   * @param id
   * @returns {Promise<GovernanceProposal>}
   */
  @Get('/proposals/:id')
  async getProposal (@Param('id') id: string): Promise<GovernanceProposal> {
    return await this.governanceService.get(id)
  }

  /**
   * Returns votes for a proposal
   *
   * @param {string} id
   * @param {ProposalMasternodeType | string} [masternode=ProposalMasternodeType.ALL] masternode id or reserved words 'mine' to list votes for all owned accounts or 'all' to list all votes
   * @param {number} [cycle=0] cycle: 0 (show current), cycle: N (show cycle N), cycle: -1 (show all)
   * @return {Promise<ProposalVotesResult[]>} Proposal vote information
   */
  @Get('/proposals/:id/votes')
  async listProposalVotes (
    @Param('proposalId') proposalId: string,
      @Query('masternode')
      masternode: string | ProposalMasternodeType = ProposalMasternodeType.MINE,
      @Query('cycle', ParseIntPipe) cycle: number = 0
  ): Promise<ProposalVotesResult[]> {
    return await this.governanceService.getProposalVotes(proposalId, masternode, cycle)
  }
}
