import { Controller, Get, Inject, Query } from '@nestjs/common'
import { NetworkName } from '@defichain/jellyfish-network'
import { ApiRawResponse } from './_core/api.response'
import { LegacySubgraphService, LegacySubgraphSwapsResponse, NextToken } from './legacy.subgraph.service'

/**
 * Specifically for bypassing response interceptor
 */
class LegacyApiRawResponse extends ApiRawResponse {
  readonly data: LegacySubgraphSwapsResponse['data']
  readonly page: LegacySubgraphSwapsResponse['page']

  constructor (swaps: LegacySubgraphSwapsResponse) {
    super()
    this.data = swaps.data
    this.page = swaps.page
  }
}

@Controller('/legacy')
export class LegacyController {
  constructor (
    private readonly legacySubgraphService: LegacySubgraphService,
    @Inject('NETWORK')
    private readonly network: NetworkName
  ) {
  }

  @Get('getsubgraphswaps')
  async getSubgraphSwaps (
    @Query('limit') limit: number = 20,
    @Query('next') nextString?: string
  ): Promise<LegacySubgraphSwapsResponse> {
    limit = Math.min(20, limit ?? 20)
    const nextToken: NextToken = (nextString !== undefined)
      ? this.legacySubgraphService.decodeNextToken(nextString)
      : {}

    const {
      swaps,
      next
    } = await this.legacySubgraphService.getSwapsHistory(this.network, limit, nextToken)

    return new LegacyApiRawResponse({
      data: {
        swaps: swaps
      },
      page: {
        next: this.legacySubgraphService.encodeNextToken(next)
      }
    })
  }
}
