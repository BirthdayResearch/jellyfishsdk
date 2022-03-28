import { RpcApiError } from '@defichain/jellyfish-api-core'
import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  ParseIntPipe,
  Inject
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
import {
  CollateralToken,
  LoanScheme,
  LoanToken,
  LoanVaultActive,
  LoanVaultLiquidated
} from '@whale-api-client/api/loan'
import { mapTokenData } from '@src/module.api/token.controller'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { LoanVaultService } from '@src/module.api/loan.vault.service'
import { OraclePriceActiveMapper } from '@src/module.model/oracle.price.active'
import { VaultAuctionHistoryMapper, VaultAuctionBatchHistory } from '@src/module.model/vault.auction.batch.history'
import { ActivePrice } from '@whale-api-client/api/prices'
import { NetworkName } from '@defichain/jellyfish-network'
import { HexEncoder } from '@src/module.model/_hex.encoder'

@Controller('/loans')
export class LoanController {
  liqBlockExpiry = this.network === 'regtest' ? 36 : 720

  constructor (
    @Inject('NETWORK') protected readonly network: NetworkName,
    private readonly client: JsonRpcClient,
    private readonly deFiDCache: DeFiDCache,
    private readonly vaultService: LoanVaultService,
    private readonly vaultAuctionHistoryMapper: VaultAuctionHistoryMapper,
    private readonly priceActiveMapper: OraclePriceActiveMapper
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
      if (err instanceof RpcApiError && err?.payload?.message === `Cannot find existing loan scheme with id ${id}`) {
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
      if (err instanceof RpcApiError && err?.payload?.message === `Token ${id} does not exist!`) {
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
      .map(async ([, value]) => await this.mapLoanToken(value))
    const items = (await Promise.all(result))
      .sort((a, b) => a.tokenId.localeCompare(b.tokenId))

    return createFakePagination(query, items, item => item.tokenId)
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
      return await this.mapLoanToken(data)
    } catch (err) {
      if (err instanceof RpcApiError && err?.payload?.message === `Token ${id} does not exist!`) {
        throw new NotFoundException('Unable to find loan token')
      } else {
        throw new BadRequestException(err)
      }
    }
  }

  /**
   * Paginate loan vaults.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<LoanVaultActive | LoanVaultLiquidated>>}
   */
  @Get('/vaults')
  async listVault (@Query() query: PaginationQuery): Promise<ApiPagedResponse<LoanVaultActive | LoanVaultLiquidated>> {
    return await this.vaultService.list(query)
  }

  /**
   * Get information about a vault with given vault id.
   *
   * @param {string} id
   * @return {Promise<LoanVaultActive | LoanVaultLiquidated>}
   */
  @Get('/vaults/:id')
  async getVault (@Param('id') id: string): Promise<LoanVaultActive | LoanVaultLiquidated> {
    return await this.vaultService.get(id)
  }

  /**
   * List vault auction history.
   *
   * @param {string} id vaultId
   * @param {number} height liquidation height
   * @param {number} batchIndex batch index
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<VaultAuctionBatchHistory>>}
   */
  @Get('/vaults/:id/auctions/:height/batches/:batchIndex/history')
  async listVaultAuctionHistory (
    @Param('id') id: string,
      @Param('height', ParseIntPipe) height: number, // liquidationHeight
      @Param('batchIndex', ParseIntPipe) batchIndex: number, // batch index
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<VaultAuctionBatchHistory>> {
    const lt = query.next ?? `${HexEncoder.encodeHeight(height)}-${'f'.repeat(64)}`
    const gt = `${HexEncoder.encodeHeight(height - this.liqBlockExpiry)}-${'0'.repeat(64)}`
    const list = await this.vaultAuctionHistoryMapper.query(`${id}-${batchIndex}`, query.size, lt, gt)

    return ApiPagedResponse.of(list, query.size, item => {
      return item.sort
    })
  }

  /**
   * Paginate loan auctions.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<LoanVaultLiquidated>>}
   */
  @Get('/auctions')
  async listAuction (@Query() query: PaginationQuery): Promise<ApiPagedResponse<LoanVaultLiquidated>> {
    return await this.vaultService.listAuction(query)
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
      activateAfterBlock: detail.activateAfterBlock.toNumber(),
      fixedIntervalPriceId: detail.fixedIntervalPriceId,
      activePrice: await this.getActivePrice(detail.fixedIntervalPriceId)
    }
  }

  async mapLoanToken (result: LoanTokenResult): Promise<LoanToken> {
    const id = Object.keys(result.token)[0]
    const tokenInfo = result.token[id]

    return {
      tokenId: tokenInfo.creationTx,
      token: mapTokenData(id, tokenInfo),
      interest: result.interest.toFixed(),
      fixedIntervalPriceId: result.fixedIntervalPriceId,
      activePrice: await this.getActivePrice(result.fixedIntervalPriceId)
    }
  }

  async getActivePrice (fixedIntervalPriceId: string): Promise<ActivePrice | undefined> {
    const [token, currency] = fixedIntervalPriceId.split('/')
    const prices = await this.priceActiveMapper.query(`${token}-${currency}`, 1)
    return prices[0]
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
