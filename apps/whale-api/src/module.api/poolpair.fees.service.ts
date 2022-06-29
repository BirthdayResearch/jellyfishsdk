import { Inject, Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import { DexFee, SwapPathPoolPair } from '@defichain/whale-api-client/dist/api/poolpairs'
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

  public async getDexFees (path: SwapPathPoolPair): Promise<DexFee[] | []> {
    const dexFees: DexFee[] = []

    // TODO(PIERRE): How does cache work? and how to cache an item in the ATTRIBUTES?
    // return await this.cache.get<BigNumber>('ATTRIBUTES', async () => {

    const rpcResult = await this.rpcClient.masternode.getGov('ATTRIBUTES')

    const poolpairFee = rpcResult.ATTRIBUTES[`v0/poolpairs/${path.poolPairId}/token_a_fee_pct`]
    const tokenAFee = rpcResult.ATTRIBUTES[`v0/token/${path.tokenA.id}/dex_in_fee_pct`]
    const tokenBFee = rpcResult.ATTRIBUTES[`v0/token/${path.tokenB.id}/dex_out_fee_pct`]

    /*
      v0/poolpairs/{id} takes precedence over v0/token/dex_(in/out)_fee_pct
    */
    if (poolpairFee !== undefined) {
      dexFees.push({
        token: path.tokenA,
        fee: new BigNumber(poolpairFee).toFixed(8)
      })

      return dexFees
    }

    if (tokenAFee !== undefined) {
      dexFees.push({
        token: path.tokenA,
        fee: new BigNumber(tokenAFee).toFixed(8)
      })
    }

    if (tokenBFee !== undefined) {
      dexFees.push({
        token: path.tokenB,
        fee: new BigNumber(tokenBFee).toFixed(8)
      })
    }

    return dexFees
    // }, {
    //     ttl: 0.5 //3600 // 60 minutes
    // })
  }
}
