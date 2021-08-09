import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { poolpair } from '@defichain/jellyfish-api-core'

export class TestingPoolPair {
  constructor (
    private readonly container: MasterNodeRegTestContainer,
    private readonly jsonRpc: JsonRpcClient
  ) {
  }

  async create (options: TestingPoolPairCreate): Promise<string> {
    return await this.jsonRpc.poolpair.createPoolPair({
      commission: 0,
      status: true,
      ownerAddress: await this.container.getNewAddress(),
      ...options
    })
  }

  async add (options: TestingPoolPairAdd): Promise<string> {
    const accountA = `${new BigNumber(options.a.amount).toFixed(8)}@${options.a.symbol}`
    const accountB = `${new BigNumber(options.b.amount).toFixed(8)}@${options.b.symbol}`
    const from = { '*': [accountA, accountB] }
    const address = options.address ?? await this.container.getNewAddress()
    return await this.jsonRpc.poolpair.addPoolLiquidity(from, address)
  }

  async remove (options: TestingPoolPairRemove): Promise<string> {
    const { address, symbol, amount } = options
    const account = `${new BigNumber(amount).toFixed(8)}@${symbol}`
    return await this.jsonRpc.poolpair.removePoolLiquidity(address, account)
  }

  async swap (options: poolpair.PoolSwapMetadata): Promise<string> {
    return await this.jsonRpc.poolpair.poolSwap(options)
  }
}

interface TestingPoolPairCreate {
  tokenA: string
  tokenB: string
  commission?: number
  status?: boolean
  ownerAddress?: string
  customRewards?: string[]
  pairSymbol?: string
}

interface TestingPoolPairAdd {
  a: {
    symbol: string
    amount: number | string
  }
  b: {
    symbol: string
    amount: number | string
  }
  address?: string
}

interface TestingPoolPairRemove {
  address: string
  symbol: string
  amount: number | string
}
