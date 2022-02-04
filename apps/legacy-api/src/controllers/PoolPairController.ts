import { Controller, Get, Query } from '@nestjs/common'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { PoolPairData } from '@defichain/whale-api-client/dist/api/poolpairs'

// For current Stats api endpoints: https://github.com/cakedefi/defi-stats-api/blob/ef46b74cc929003eb72fc39942049efc8681bf66/src/config/v1/v1.controller.ts

@Controller('v1')
export class PoolPairController {
  @Get('getpoolpair')
  async getToken (
    @Query('network') network: string = 'mainnet',
    @Query('id') poolPairId: string
  ): Promise<LegacyPoolPairData> {
    const api = new WhaleApiClient({
      version: 'v0',
      network: network,
      url: 'https://ocean.defichain.com'
    })

    return reformatPoolPairData(await api.poolpairs.get(poolPairId))
  }

  @Get('listpoolpairs')
  async listPoolPairs (
    @Query('network') network: string = 'mainnet'
  ): Promise<{ [key: string]: LegacyPoolPairData }> {
    const api = new WhaleApiClient({
      version: 'v0',
      network: network,
      url: 'https://ocean.defichain.com'
    })

    const data: PoolPairData[] = await api.poolpairs.list(200)

    const results: { [key: string]: LegacyPoolPairData } = {}
    data.forEach(token => {
      results[token.id] = reformatPoolPairData(token)
    })
    return results
  }
}

interface LegacyPoolPairData {
  'symbol': string
  'name': string
  'status': boolean
  'idTokenA': string
  'idTokenB': string
  'reserveA': string
  'reserveB': string
  'commission': number
  'totalLiquidity': number
  'reserveA/reserveB': number
  'reserveB/reserveA': number
  'tradeEnabled': boolean
  'ownerAddress': string
  'blockCommissionA': number
  'blockCommissionB': number
  'rewardPct': number
  // 'rewardLoanPct': number
  'creationTx': string
  'creationHeight': number
  'totalLiquidityLpToken': string
  // 'yearlyPoolReward': number
  // 'apy': number
  // 'priceB': number
  'tokenASymbol': string
  'tokenBSymbol': string
  // 'volumeA': number
  // 'volumeB': number
  // 'volumeA30': number
  // 'volumeB30': number
}

function reformatPoolPairData (data: PoolPairData): LegacyPoolPairData {
  return {
    symbol: data.symbol,
    name: data.name,
    status: data.status,
    idTokenA: data.tokenA.id,
    idTokenB: data.tokenB.id,
    reserveA: data.tokenA.reserve,
    reserveB: data.tokenB.reserve,
    commission: Number(data.commission),
    totalLiquidity: Number(data.totalLiquidity.usd),
    'reserveA/reserveB': Number(data.priceRatio.ab),
    'reserveB/reserveA': Number(data.priceRatio.ba),
    tradeEnabled: data.tradeEnabled,
    ownerAddress: data.ownerAddress,
    blockCommissionA: Number(data.tokenA.blockCommission),
    blockCommissionB: Number(data.tokenB.blockCommission),
    rewardPct: Number(data.rewardPct),
    creationTx: data.creation.tx,
    creationHeight: Number(data.creation.height),
    totalLiquidityLpToken: data.totalLiquidity.token,
    tokenASymbol: data.tokenA.symbol,
    tokenBSymbol: data.tokenB.symbol
  }
}
