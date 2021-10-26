import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { GetLoanSchemeResult, LoanSchemeResult } from '@defichain/jellyfish-api-core/dist/category/loan'
import { LoanScheme } from '@whale-api-client/api/loan'

@Controller('/loans')
export class LoanController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * Paginate loan schemes.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<LoanSchemeResult>>}
   */
  @Get('/schemes')
  async listScheme (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<LoanScheme>> {
    const result = (await this.client.loan.listLoanSchemes())
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(value => mapLoanScheme(value))

    let nextIndex = 0

    if (query.next !== undefined) {
      const findIndex = result.findIndex(result => result.id === query.next)
      if (findIndex > 0) {
        nextIndex = findIndex + 1
      } else {
        nextIndex = result.length
      }
    }

    const schemes = result.slice(nextIndex, nextIndex + query.size)
    return ApiPagedResponse.of(schemes, query.size, item => {
      return item.id
    })
  }

  /**
   * Get information about a scheme with given scheme id.
   *
   * @param {string} id
   * @return {Promise<GetLoanSchemeResult>}
   */
  @Get('/schemes/:id')
  async getScheme (@Param('id') id: string): Promise<LoanScheme> {
    try {
      const data = await this.client.loan.getLoanScheme(id)
      return mapLoanScheme(data)
    } catch (err) {
      if (err?.payload?.message === `Cannot find existing loan scheme with id ${id}`) {
        throw new NotFoundException('Unable to find scheme')
      } else {
        throw new BadRequestException(err)
      }
    }
  }
}

function mapLoanScheme (result: LoanSchemeResult | GetLoanSchemeResult): LoanScheme {
  // TODO: default not exposed because getLoanScheme vs listLoanSchemes don't return same data
  return {
    id: result.id,
    minColRatio: result.mincolratio.toFixed(),
    interestRate: result.interestrate.toFixed()
  }
}
