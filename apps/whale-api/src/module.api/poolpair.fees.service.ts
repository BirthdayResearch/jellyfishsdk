import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { EstimatedDexFee, SwapPathWithDirection } from '@defichain/whale-api-client/dist/api/poolpairs'
import { DeFiDCache } from './cache/defid.cache'

@Injectable()
export class PoolPairFeesService {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    private readonly deFiDCache: DeFiDCache
  ) {
  }

  public async getDexFees (tokenPathWithDirection: SwapPathWithDirection): Promise<EstimatedDexFee[] | []> {
    const dexFees: EstimatedDexFee[] = []
    const { tokenFrom, tokenTo, poolPairId } = tokenPathWithDirection

    const { poolPairFee, tokenFromFee, tokenToFee } = await this.deFiDCache.getDexFees(poolPairId, tokenFrom.token.id, tokenTo.token.id)

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
    if (poolPairFee !== undefined) {
      dexFees.push({
        token: tokenA,
        amount: new BigNumber(poolPairFee).multipliedBy(tokenFrom.estimatedReturn).toFixed(8)
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
