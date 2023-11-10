import { Injectable, Logger } from '@nestjs/common'
import { DeFiDCache, PoolPairInfoWithId } from '../../../module.api/cache/defid.cache'

@Injectable()
export class PoolPairPathMapping {
  private readonly logger = new Logger(PoolPairPathMapping.name)
  private readonly paths: Record<string, PoolPairInfoWithId> = {}

  constructor (
    protected readonly deFiDCache: DeFiDCache
  ) {
  }

  async findPair (tokenA: number, tokenB: number): Promise<PoolPairInfoWithId> {
    const pair = this.paths[`${tokenA}-${tokenB}`]
    if (pair !== undefined) {
      return pair
    }

    await this.updateMapping()
    if (this.paths[`${tokenA}-${tokenB}`] === undefined) {
      this.logger.error(`Pool for pair ${tokenA}, ${tokenB} not found in PoolPairPathMapping`)
      await this.findPair(tokenA, tokenB)
    }
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
