import { PaginationQuery } from '@src/module.api/_core/api.query'
import {
  VaultActive,
  VaultLiquidation,
  VaultLiquidationBatch,
  VaultPagination,
  VaultState
} from '@defichain/jellyfish-api-core/dist/category/loan'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import {
  LoanVaultActive,
  LoanVaultLiquidated,
  LoanVaultLiquidationBatch,
  LoanVaultState,
  LoanVaultTokenAmount
} from '@whale-api-client/api/loan'
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'

@Injectable()
export class LoanVaultService {
  constructor (
    private readonly client: JsonRpcClient,
    private readonly deFiDCache: DeFiDCache
  ) {
  }

  async list (query: PaginationQuery, address?: string): Promise<ApiPagedResponse<LoanVaultActive | LoanVaultLiquidated>> {
    const pagination: VaultPagination = {
      start: query.next !== undefined ? String(query.next) : undefined,
      // including_start: query.next === undefined,
      limit: query.size > 10 ? 10 : query.size // limit size to 10 for vault querying
    }

    const list: Array<VaultActive | VaultLiquidation> = await this.client.loan
      .listVaults(pagination, { ownerAddress: address, verbose: true }) as any
    const vaults = list.map(async (vault: VaultActive | VaultLiquidation) => {
      return await this.mapLoanVault(vault)
    })

    const items = await Promise.all(vaults)
    return ApiPagedResponse.of(items, query.size, item => {
      return item.vaultId
    })
  }

  async get (id: string): Promise<LoanVaultActive | LoanVaultLiquidated> {
    try {
      const vault = await this.client.loan.getVault(id)
      return await this.mapLoanVault(vault)
    } catch (err) {
      if (err?.payload?.message === `Vault <${id}> not found` || err?.payload?.message === 'vaultId must be of length 64 (not 3, for \'999\')'
      ) {
        throw new NotFoundException('Unable to find vault')
      } else {
        throw new BadRequestException(err)
      }
    }
  }

  private async mapLoanVault (details: VaultActive | VaultLiquidation): Promise<LoanVaultActive | LoanVaultLiquidated> {
    if (details.state === VaultState.IN_LIQUIDATION) {
      const data = details as VaultLiquidation
      return {
        vaultId: data.vaultId,
        loanSchemeId: data.loanSchemeId,
        ownerAddress: data.ownerAddress,
        state: LoanVaultState.IN_LIQUIDATION,
        batchCount: data.batchCount,
        liquidationHeight: data.liquidationHeight,
        liquidationPenalty: data.liquidationPenalty,
        batches: await this.mapLiquidationBatches(data.batches)
      }
    }

    const data = details as VaultActive
    return {
      vaultId: data.vaultId,
      loanSchemeId: data.loanSchemeId,
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

  private async mapTokenAmounts (items?: string[]): Promise<LoanVaultTokenAmount[]> {
    if (items === undefined || items.length === 0) {
      return []
    }

    const tokenAmounts = items.map(value => value.split('@'))
    const tokenInfos = await this.deFiDCache
      .batchTokenInfoBySymbol(tokenAmounts.map(([_, symbol]) => symbol))

    return tokenAmounts
      .map(([amount, symbol]): LoanVaultTokenAmount => {
        const result = tokenInfos[symbol]
        if (result === undefined) {
          throw new ConflictException('unable to find token')
        }

        const info = Object.values(result)[0]
        const id = Object.keys(result)[0]

        return mapLoanVaultTokenAmount(id, info, amount)
      }).sort(a => Number.parseInt(a.id))
  }

  private async mapLiquidationBatches (batches: VaultLiquidationBatch[]): Promise<LoanVaultLiquidationBatch[]> {
    if (batches.length === 0) {
      return []
    }

    const items = batches.map(async batch => {
      return {
        index: batch.index as any, // fixed in https://github.com/DeFiCh/jellyfish/pull/805
        collaterals: await this.mapTokenAmounts(batch.collaterals),
        loan: (await this.mapTokenAmounts([batch.loan]))[0]
      }
    })

    return await Promise.all(items)
  }
}

function mapLoanVaultTokenAmount (id: string, tokenInfo: TokenInfo, amount: string): LoanVaultTokenAmount {
  return {
    id: id,
    amount: amount,
    symbol: tokenInfo.symbol,
    symbolKey: tokenInfo.symbolKey,
    name: tokenInfo.name,
    displaySymbol: tokenInfo.isDAT && tokenInfo.symbol !== 'DFI' && !tokenInfo.isLPS ? `d${tokenInfo.symbol}` : tokenInfo.symbol
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
