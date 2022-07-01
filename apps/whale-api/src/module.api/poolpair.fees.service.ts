import { Inject, Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import { EstimatedDexFee, SwapPathWithDirection } from '@defichain/whale-api-client/dist/api/poolpairs'
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

  public async getDexFees (tokenPathWithDirection: SwapPathWithDirection): Promise<EstimatedDexFee[] | []> {
    const dexFees: EstimatedDexFee[] = []
    const rpcResult = await this.rpcClient.masternode.getGov('ATTRIBUTES')

    const { tokenFrom, tokenTo, poolPairId } = tokenPathWithDirection

    const poolpairFee = rpcResult.ATTRIBUTES[`v0/poolpairs/${poolPairId}/token_a_fee_pct`]
    const tokenFromFee = rpcResult.ATTRIBUTES[`v0/token/${tokenFrom.token.id}/dex_in_fee_pct`]
    const tokenToFee = rpcResult.ATTRIBUTES[`v0/token/${tokenTo.token.id}/dex_out_fee_pct`]

    const tokenA = {
      symbol: tokenFrom.token.symbol,
      displaySymbol: tokenFrom.token.displaySymbol
    }
    const tokenB = {
      symbol: tokenTo.token.symbol,
      displaySymbol: tokenTo.token.displaySymbol
    }

    /*
      v0/poolpairs/{id} takes precedence over v0/token/dex_(in/out)_fee_pct
    */
    if (poolpairFee !== undefined) {
      dexFees.push({
        token: tokenA,
        amount: new BigNumber(poolpairFee).multipliedBy(tokenFrom.estimatedReturn).toFixed(8)
      })

      return dexFees
    }

    if (tokenFromFee !== undefined) {
      dexFees.push({
        token: tokenA,
        amount: new BigNumber(tokenFromFee).multipliedBy(tokenFrom.estimatedReturn).toFixed(8)
      })
    }

    if (tokenToFee !== undefined) {
      dexFees.push({
        token: tokenB,
        amount: new BigNumber(tokenToFee).multipliedBy(tokenTo.estimatedReturn).toFixed(8)
      })
    }

    return dexFees
  }
}
