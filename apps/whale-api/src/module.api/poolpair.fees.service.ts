import { Inject, Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import { EstimatedDexFee, SwapPoolPair } from '@defichain/whale-api-client/dist/api/poolpairs'
import { PoolSwapAggregatedMapper } from '../module.model/pool.swap.aggregated'
import { TransactionVoutMapper } from '../module.model/transaction.vout'
import { NetworkName } from '@defichain/jellyfish-network'
import { DeFiDCache } from './cache/defid.cache'

@Injectable()
export class PoolPairFeesService {
  constructor (
    @Inject('NETWORK') protected readonly network: NetworkName,
    protected readonly rpcClient: JsonRpcClient,
    protected readonly deFiDCache: DeFiDCache,
    protected readonly cache: SemaphoreCache,
    protected readonly poolSwapAggregatedMapper: PoolSwapAggregatedMapper,
    protected readonly voutMapper: TransactionVoutMapper
  ) {
  }

  public async getDexFees (path: SwapPoolPair, estimatedReturnTokenA: BigNumber, estimatedReturnTokenB: BigNumber): Promise<EstimatedDexFee[] | []> {
    const dexFees: EstimatedDexFee[] = []
    const rpcResult = await this.rpcClient.masternode.getGov('ATTRIBUTES')
    const tokenA = {
      symbol: path.tokenA.symbol,
      displaySymbol: path.tokenA.displaySymbol
    }
    const tokenB = {
      symbol: path.tokenB.symbol,
      displaySymbol: path.tokenB.displaySymbol
    }
    const poolpairFee = rpcResult.ATTRIBUTES[`v0/poolpairs/${path.poolPairId}/token_a_fee_pct`]
    const tokenAFee = rpcResult.ATTRIBUTES[`v0/token/${path.tokenA.id}/dex_in_fee_pct`]
    const tokenBFee = rpcResult.ATTRIBUTES[`v0/token/${path.tokenB.id}/dex_out_fee_pct`]

    /*
      v0/poolpairs/{id} takes precedence over v0/token/dex_(in/out)_fee_pct
    */
    if (poolpairFee !== undefined) {
      dexFees.push({
        token: tokenA,
        amount: new BigNumber(poolpairFee).multipliedBy(estimatedReturnTokenA).toFixed(8)
      })

      return dexFees
    }

    if (tokenAFee !== undefined) {
      dexFees.push({
        token: tokenA,
        amount: new BigNumber(tokenAFee).multipliedBy(estimatedReturnTokenA).toFixed(8)
      })
    }

    if (tokenBFee !== undefined) {
      dexFees.push({
        token: tokenB,
        amount: new BigNumber(tokenBFee).multipliedBy(estimatedReturnTokenB).toFixed(8)
      })
    }

    return dexFees
  }
}
