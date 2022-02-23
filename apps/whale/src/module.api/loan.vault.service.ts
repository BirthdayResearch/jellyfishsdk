import { PaginationQuery } from '@src/module.api/_core/api.query'
import {
  AuctionPagination,
  VaultActive,
  VaultLiquidation,
  VaultPagination,
  VaultState
} from '@defichain/jellyfish-api-core/dist/category/loan'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import {
  LoanScheme,
  LoanVaultActive,
  LoanVaultLiquidated,
  LoanVaultLiquidationBatch,
  LoanVaultState,
  LoanVaultTokenAmount
} from '@whale-api-client/api/loan'
import { Inject, BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { parseDisplaySymbol } from '@src/module.api/token.controller'
import { ActivePrice } from '@whale-api-client/api/prices'
import { OraclePriceActiveMapper } from '@src/module.model/oracle.price.active'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { fromScriptHex } from '@defichain/jellyfish-address'
import { VaultAuctionHistoryMapper } from '@src/module.model/vault.auction.batch.history'
import { NetworkName } from '@defichain/jellyfish-network'
import { HexEncoder } from '@src/module.model/_hex.encoder'

@Injectable()
export class LoanVaultService {
  NUM_AUCTION_EXP_BLOCKS: number = this.network === 'regtest' ? 36 : 720

  constructor (
    @Inject('NETWORK') private readonly network: NetworkName,
    private readonly client: JsonRpcClient,
    private readonly deFiDCache: DeFiDCache,
    private readonly vaultAuctionHistoryMapper: VaultAuctionHistoryMapper,
    private readonly activePriceMapper: OraclePriceActiveMapper
  ) {
  }

  async list (query: PaginationQuery, address?: string): Promise<ApiPagedResponse<LoanVaultActive | LoanVaultLiquidated>> {
    const next = query.next !== undefined ? String(query.next) : undefined
    const size = query.size > 30 ? 30 : query.size
    const pagination: VaultPagination = {
      start: next,
      // including_start: query.next === undefined,
      limit: size
    }

    const list: Array<VaultActive | VaultLiquidation> = await this.client.loan
      .listVaults(pagination, {
        ownerAddress: address,
        verbose: true
      }) as any
    const vaults = list.map(async (vault: VaultActive | VaultLiquidation) => {
      return await this.mapLoanVault(vault)
    })

    const items = await Promise.all(vaults)
    return ApiPagedResponse.of(items, size, item => {
      return item.vaultId
    })
  }

  async get (id: string): Promise<LoanVaultActive | LoanVaultLiquidated> {
    try {
      const vault = await this.client.loan.getVault(id)
      return await this.mapLoanVault(vault)
    } catch (err) {
      if (
        err instanceof RpcApiError && (
          err?.payload?.message === `Vault <${id}> not found` ||
          err?.payload?.message === 'vaultId must be of length 64 (not 3, for \'999\')'
        )
      ) {
        throw new NotFoundException('Unable to find vault')
      } else {
        throw new BadRequestException(err)
      }
    }
  }

  async listAuction (query: PaginationQuery): Promise<ApiPagedResponse<LoanVaultLiquidated>> {
    const next = query.next !== undefined ? String(query.next) : undefined
    const size = query.size > 30 ? 30 : query.size
    let pagination: AuctionPagination

    if (next !== undefined) {
      const vaultId = next.substr(0, 64)
      const height = next.substr(64)

      pagination = {
        start: {
          vaultId,
          height: height !== undefined ? parseInt(height) : 0
        },
        limit: size
      }
    } else {
      pagination = { limit: size }
    }

    const list = (await this.client.loan.listAuctions(pagination))
      .map(async value => await this.mapLoanAuction(value))
    const items = await Promise.all(list)

    return ApiPagedResponse.of(items, size, item => {
      return `${item.vaultId}${item.liquidationHeight}`
    })
  }

  private async mapLoanVault (details: VaultActive | VaultLiquidation): Promise<LoanVaultActive | LoanVaultLiquidated> {
    if (details.state === VaultState.IN_LIQUIDATION) {
      return await this.mapLoanAuction(details as VaultLiquidation)
    }

    const data = details as VaultActive
    return {
      vaultId: data.vaultId,
      loanScheme: await this.mapLoanScheme(data.loanSchemeId),
      ownerAddress: data.ownerAddress,
      state: mapLoanVaultState(data.state) as any,

      informativeRatio: data.informativeRatio.toFixed(),
      collateralRatio: data.collateralRatio.toFixed(),
      collateralValue: data.collateralValue.toFixed(),
      loanValue: data.loanValue.toFixed(),
      interestValue: data.interestValue.toFixed(),

      collateralAmounts: await this.mapTokenAmounts(data.collateralAmounts),
      loanAmounts: await this.mapTokenAmounts(data.loanAmounts),
      interestAmounts: await this.mapTokenAmounts(data.interestAmounts)
    }
  }

  private async mapLoanAuction (data: VaultLiquidation): Promise<LoanVaultLiquidated> {
    return {
      vaultId: data.vaultId,
      loanScheme: await this.mapLoanScheme(data.loanSchemeId),
      ownerAddress: data.ownerAddress,
      state: LoanVaultState.IN_LIQUIDATION,
      batchCount: data.batchCount,
      liquidationHeight: data.liquidationHeight,
      liquidationPenalty: data.liquidationPenalty,
      batches: await this.mapLiquidationBatches(data)
    }
  }

  private async mapLiquidationBatches (data: VaultLiquidation): Promise<LoanVaultLiquidationBatch[]> {
    if (data.batches.length === 0) {
      return []
    }

    const end = data.liquidationHeight
    const start = end - this.NUM_AUCTION_EXP_BLOCKS

    const items = data.batches.map(async batch => {
      const lt = `${HexEncoder.encodeHeight(end)}-${'f'.repeat(64)}`
      const gt = `${HexEncoder.encodeHeight(start)}-${'0'.repeat(64)}`
      const bids = await this.vaultAuctionHistoryMapper.query(`${data.vaultId}-${batch.index}`, Number.MAX_SAFE_INTEGER, lt, gt)

      return {
        index: batch.index,
        collaterals: await this.mapTokenAmounts(batch.collaterals),
        loan: (await this.mapTokenAmounts([batch.loan]))[0],
        froms: bids.map(b => fromScriptHex(b.from, this.network)?.address as string),
        highestBid: batch.highestBid !== undefined
          ? {
              owner: batch.highestBid.owner,
              amount: (await this.mapTokenAmounts([batch.highestBid.amount]))[0]
            }
          : undefined
      }
    })

    return await Promise.all(items)
  }

  private async mapTokenAmounts (items?: string[]): Promise<LoanVaultTokenAmount[]> {
    if (items === undefined || items.length === 0) {
      return []
    }

    const tokenAmounts = items.map(value => value.split('@'))
    const tokenInfos = await this.deFiDCache
      .batchTokenInfoBySymbol(tokenAmounts.map(([_, symbol]) => symbol))

    const mappedItems = tokenAmounts.map(async ([amount, symbol]): Promise<LoanVaultTokenAmount> => {
      const result = tokenInfos[symbol]
      if (result === undefined) {
        throw new ConflictException('unable to find token')
      }

      const info = Object.values(result)[0]
      const id = Object.keys(result)[0]
      const activePrice = await this.activePriceMapper.query(`${symbol}-USD`, 1)
      return mapLoanVaultTokenAmount(id, info, amount, activePrice[0])
    })

    return (await Promise.all(mappedItems))
      .sort(a => Number.parseInt(a.id))
  }

  private async mapLoanScheme (id: string): Promise<LoanScheme> {
    const scheme = await this.deFiDCache.getLoanScheme(id)
    if (scheme === undefined) {
      throw new ConflictException('unable to find loan scheme')
    }
    return {
      id: scheme.id,
      minColRatio: scheme.mincolratio.toFixed(),
      interestRate: scheme.interestrate.toFixed()
    }
  }
}

function mapLoanVaultTokenAmount (id: string, tokenInfo: TokenInfo, amount: string, activePrice?: ActivePrice): LoanVaultTokenAmount {
  return {
    id: id,
    amount: amount,
    symbol: tokenInfo.symbol,
    symbolKey: tokenInfo.symbolKey,
    name: tokenInfo.name,
    displaySymbol: parseDisplaySymbol(tokenInfo),
    activePrice: activePrice
  }
}

function mapLoanVaultState (state: VaultState): LoanVaultState {
  switch (state) {
    case VaultState.UNKNOWN:
      return LoanVaultState.UNKNOWN
    case VaultState.ACTIVE:
      return LoanVaultState.ACTIVE
    case VaultState.FROZEN:
      return LoanVaultState.FROZEN
    case VaultState.IN_LIQUIDATION:
      return LoanVaultState.IN_LIQUIDATION
    case VaultState.MAY_LIQUIDATE:
      return LoanVaultState.MAY_LIQUIDATE
  }
}
