import { Injectable } from '@nestjs/common'
import { DeFiDCache, PoolPairInfoWithId } from '../../../module.api/cache/defid.cache'

@Injectable()
export class PoolPairPathMapping {
  constructor (
    protected readonly deFiDCache: DeFiDCache,
    private readonly paths: Record<string, PoolPairInfoWithId>
  ) {
  }

  async findPair (tokenA: number, tokenB: number): Promise<PoolPairInfoWithId | undefined> {
    const pair = this.paths[`${tokenA}-${tokenB}`]
    if (pair !== undefined) {
      return pair
    }

    await this.updateMapping()
    return this.paths[`${tokenA}-${tokenB}`]
  }

  private async updateMapping (): Promise<void> {
    const pairs = await this.deFiDCache.getPoolPairs(true)

    for (const pair of pairs) {
      this.paths[`${pair.idTokenA}-${pair.idTokenB}`] = pair
      this.paths[`${pair.idTokenB}-${pair.idTokenA}`] = pair
    }
  }
}
