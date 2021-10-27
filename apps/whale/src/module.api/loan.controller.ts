import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query
} from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import {
  CollateralTokenDetail,
  GetLoanSchemeResult,
  LoanSchemeResult,
  LoanTokenResult
} from '@defichain/jellyfish-api-core/dist/category/loan'
import { CollateralToken, LoanScheme, LoanToken } from '@whale-api-client/api/loan'
import { mapTokenData } from '@src/module.api/token.controller'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'

@Controller('/loans')
export class LoanController {
  constructor (
    private readonly client: JsonRpcClient,
    private readonly deFiDCache: DeFiDCache
  ) {
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

    return createFakePagination(query, result, item => item.id)
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

  /**
   * Paginate loan collaterals.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<CollateralToken>>}
   */
  @Get('/collaterals')
  async listCollateral (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<CollateralToken>> {
    const result = (await this.client.loan.listCollateralTokens())
      .sort((a, b) => a.tokenId.localeCompare(b.tokenId))
      .map(async value => await this.mapCollateralToken(value))
    const items = await Promise.all(result)

    return createFakePagination(query, items, item => item.tokenId)
  }

  /**
   * Get information about a collateral token with given collateral token.
   *
   * @param {string} id
   * @return {Promise<CollateralTokenDetail>}
   */
  @Get('/collaterals/:id')
  async getCollateral (@Param('id') id: string): Promise<CollateralToken> {
    try {
      const data = await this.client.loan.getCollateralToken(id)
      return await this.mapCollateralToken(data)
    } catch (err) {
      if (err?.payload?.message === `Token ${id} does not exist!`) {
        throw new NotFoundException('Unable to find collateral token')
      } else {
        throw new BadRequestException(err)
      }
    }
  }

  /**
   * Paginate loan tokens.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<LoanToken>>}
   */
  @Get('/tokens')
  async listLoanToken (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<LoanToken>> {
    const result = Object.entries(await this.client.loan.listLoanTokens())
      .map(([, value]) => {
        return mapLoanToken(value)
      }).sort((a, b) => a.tokenId.localeCompare(b.tokenId))

    return createFakePagination(query, result, item => item.tokenId)
  }

  /**
   * Get information about a loan token with given loan token.
   *
   * @param {string} id
   * @return {Promise<LoanTokenResult>}
   */
  @Get('/tokens/:id')
  async getLoanToken (@Param('id') id: string): Promise<LoanToken> {
    try {
      const data = await this.client.loan.getLoanToken(id)
      return mapLoanToken(data)
    } catch (err) {
      if (err?.payload?.message === `Token ${id} does not exist!`) {
        throw new NotFoundException('Unable to find loan token')
      } else {
        throw new BadRequestException(err)
      }
    }
  }

  async mapCollateralToken (detail: CollateralTokenDetail): Promise<CollateralToken> {
    const result = await this.deFiDCache.getTokenInfoBySymbol(detail.token)
    if (result === undefined) {
      throw new ConflictException('unable to find token')
    }

    const id = Object.keys(result)[0]
    const tokenInfo = result[id]

    return {
      tokenId: detail.tokenId,
      token: mapTokenData(id, tokenInfo),
      factor: detail.factor.toFixed(),
      priceFeedId: detail.fixedIntervalPriceId,
      activateAfterBlock: detail.activateAfterBlock.toNumber()
    }
  }
}

function createFakePagination<T> (query: PaginationQuery, items: T[], mapId: (item: T) => string): ApiPagedResponse<T> {
  function findNextIndex (): number {
    if (query.next === undefined) {
      return 0
    }

    const findIndex = items.findIndex(item => mapId(item) === query.next)
    return findIndex > 0 ? findIndex + 1 : items.length
  }

  const index = findNextIndex()
  const sliced = items.slice(index, index + query.size)
  return ApiPagedResponse.of(sliced, query.size, mapId)
}

function mapLoanScheme (result: LoanSchemeResult | GetLoanSchemeResult): LoanScheme {
  // TODO: default not exposed because getLoanScheme vs listLoanSchemes don't return same data
  return {
    id: result.id,
    minColRatio: result.mincolratio.toFixed(),
    interestRate: result.interestrate.toFixed()
  }
}

function mapLoanToken (result: LoanTokenResult): LoanToken {
  const id = Object.keys(result.token)[0]
  const tokenInfo = result.token[id]
  return {
    tokenId: tokenInfo.creationTx,
    token: mapTokenData(id, tokenInfo),
    interest: result.interest.toFixed(),
    fixedIntervalPriceId: result.fixedIntervalPriceId
  }
}
