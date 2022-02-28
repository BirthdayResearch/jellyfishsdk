import { Testing } from './index'
import { poolpair } from '@defichain/jellyfish-api-core'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'

/**
 * TestingFixture setup complex fixtures for jellyfish testing.
 */
export class TestingFixture {
  constructor (
    private readonly testing: Testing<MasterNodeRegTestContainer>
  ) {
  }

  async createPoolPair (options: TestingPoolPairCreateRequest): Promise<poolpair.PoolPairInfo> {
    if (options.a.symbol !== 'DFI') {
      await this.testing.token.create({ symbol: options.a.symbol })
    }
    if (options.b.symbol !== 'DFI') {
      await this.testing.token.create({ symbol: options.b.symbol })
    }
    await this.testing.generate(1)

    await this.testing.poolpair.create({ tokenA: options.a.symbol, tokenB: options.b.symbol })
    if (options.a.symbol !== 'DFI') {
      await this.testing.token.mint({ amount: options.a.amount, symbol: options.a.symbol })
    } else {
      await this.testing.token.dfi({ amount: options.a.amount })
    }
    if (options.b.symbol !== 'DFI') {
      await this.testing.token.mint({ amount: options.b.amount, symbol: options.b.symbol })
    } else {
      await this.testing.token.dfi({ amount: options.b.amount })
    }
    await this.testing.generate(1)

    await this.testing.poolpair.add({
      a: { amount: options.a.amount, symbol: options.a.symbol },
      b: { amount: options.b.amount, symbol: options.b.symbol }
    })
    await this.testing.generate(1)

    return await this.testing.poolpair.get(`${options.a.symbol}-${options.b.symbol}`)
  }
}

export interface TestingPoolPairCreateRequest {
  a: {
    symbol: string
    amount: string | number
  }
  b: {
    symbol: string
    amount: string | number
  }
}
