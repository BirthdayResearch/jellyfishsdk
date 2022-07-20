import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { EstimatedDexFeesInPct } from '@defichain/whale-api-client/dist/api/poolpairs'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'

@Injectable()
export class PoolPairFeesService {
  constructor (
    protected readonly rpcClient: JsonRpcClient
  ) {
  }

  public async getDexFeesPct (poolPair: PoolPairInfo, fromToken: string, toToken: string): Promise<EstimatedDexFeesInPct | undefined> {
    const { dexFeeInPctTokenA, dexFeeOutPctTokenA, dexFeeInPctTokenB, dexFeeOutPctTokenB } = poolPair
    const tokenADirection = poolPair.idTokenA === fromToken ? 'in' : 'out'
    const tokenBDirection = poolPair.idTokenB === toToken ? 'out' : 'in'

    if (dexFeeInPctTokenA === undefined && dexFeeOutPctTokenA === undefined && dexFeeInPctTokenB === undefined && dexFeeOutPctTokenB === undefined) {
      return undefined
    }

    return {
      ba: (tokenADirection === 'in'
        ? new BigNumber(dexFeeInPctTokenA ?? 0)
        : new BigNumber(dexFeeOutPctTokenA ?? 0)).toFixed(8),

      ab: (tokenBDirection === 'in'
        ? new BigNumber(dexFeeInPctTokenB ?? 0)
        : new BigNumber(dexFeeOutPctTokenB ?? 0)).toFixed(8)
    }
  }
}
