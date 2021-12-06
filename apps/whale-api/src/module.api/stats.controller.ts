import { Controller, Get } from '@nestjs/common'
import { StatsData } from '@whale-api-client/api/stats'
import { SemaphoreCache } from '@src/module.api/cache/semaphore.cache'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { BlockMapper } from '@src/module.model/block'
import { PoolPairService } from '@src/module.api/poolpair.service'
import BigNumber from 'bignumber.js'
import { PriceTickerMapper } from '@src/module.model/price.ticker'
import { MasternodeStats, MasternodeStatsMapper } from '@src/module.model/masternode.stats'
import { BlockchainInfo } from '@defichain/jellyfish-api-core/dist/category/blockchain'
import { getBlockSubsidy } from '@src/module.api/subsidy'

@Controller('/stats')
export class StatsController {
  constructor (
    protected readonly blockMapper: BlockMapper,
    protected readonly priceTickerMapper: PriceTickerMapper,
    protected readonly masternodeStatsMapper: MasternodeStatsMapper,
    protected readonly poolPairService: PoolPairService,
    protected readonly rpcClient: JsonRpcClient,
    protected readonly cache: SemaphoreCache
  ) {
  }

  @Get()
  async get (): Promise<StatsData> {
    const block = requireValue(await this.blockMapper.getHighest(), 'block')

    return {
      count: {
        ...await this.cachedGet('count', this.getCount.bind(this), 1800),
        blocks: block.height
      },
      burned: await this.cachedGet('burned', this.getBurned.bind(this), 1800),
      tvl: await this.cachedGet('tvl', this.getTVL.bind(this), 300),
      price: await this.cachedGet('price', this.getPrice.bind(this), 240),
      masternodes: await this.cachedGet('masternodes', this.getMasternodes.bind(this), 300),
      loan: await this.cachedGet('loan', this.getLoan.bind(this), 300),
      emission: await this.cachedGet('emission', this.getEmission.bind(this), 1800),
      net: await this.cachedGet('net', this.getNet.bind(this), 1800),
      blockchain: {
        difficulty: block.difficulty
      }
    }
  }

  private async cachedGet<T> (field: string, fetch: () => Promise<T>, ttl: number): Promise<T> {
    const object = await this.cache.get(`StatsController.${field}`, fetch, { ttl })
    return requireValue(object, field)
  }

  private async getCount (): Promise<StatsData['count']> {
    const tokens = await this.rpcClient.token.listTokens({
      including_start: true,
      start: 0,
      limit: 1000
    }, false)
    const prices = await this.priceTickerMapper.query(1000)
    const masternodes = await this.masternodeStatsMapper.getLatest()

    return {
      blocks: 0,
      prices: prices.length,
      tokens: Object.keys(tokens).length,
      masternodes: requireValue(masternodes?.stats?.count, 'masternodes.stats.count')
    }
  }

  private async getTVL (): Promise<StatsData['tvl']> {
    let dex = new BigNumber(0)
    const pairs = await this.rpcClient.poolpair.listPoolPairs({
      including_start: true,
      start: 0,
      limit: 1000
    }, true)
    for (const pair of Object.values(pairs)) {
      const liq = await this.poolPairService.getTotalLiquidityUsd(pair)
      if (liq !== undefined) {
        dex = dex.plus(liq)
      }
    }

    const optionalUsd = await this.poolPairService.getUSD_PER_DFI()
    const usd = requireValue(optionalUsd, 'price.usd')
    const masternodes = await this.masternodeStatsMapper.getLatest()
    const masternodeTvl = requireValue(masternodes?.stats?.tvl, 'masternodes.stats.tvl')
    const masternodeTvlUSD = new BigNumber(masternodeTvl).times(usd).toNumber()

    const loan = await this.cachedGet('loan', this.getLoan.bind(this), 1800)

    return {
      dex: dex.toNumber(),
      masternodes: masternodeTvlUSD,
      loan: loan.value.collateral,
      total: dex.toNumber() + masternodeTvlUSD + loan.value.collateral
    }
  }

  private async getBurned (): Promise<StatsData['burned']> {
    const {
      emissionburn,
      amount,
      feeburn
    } = await this.rpcClient.account.getBurnInfo()
    return {
      address: amount.toNumber(),
      emission: emissionburn.toNumber(),
      fee: feeburn.toNumber(),
      total: amount.plus(emissionburn).plus(feeburn).toNumber()
    }
  }

  private async getPrice (): Promise<StatsData['price']> {
    const usd = await this.poolPairService.getUSD_PER_DFI()
    return {
      usd: requireValue(usd, 'price.usd').toNumber(),
      usdt: requireValue(usd, 'price.usd').toNumber()
    }
  }

  private async getMasternodes (): Promise<StatsData['masternodes']> {
    const latest = await this.masternodeStatsMapper.getLatest()
    const masternodeStats = requireValue(latest, 'masternode.stats')
    return await this.mapMasternodeStats(masternodeStats)
  }

  private async mapMasternodeStats (masternodeStats: MasternodeStats): Promise<StatsData['masternodes']> {
    const optionalUsd = await this.poolPairService.getUSD_PER_DFI()
    const usd = requireValue(optionalUsd, 'price.usd')
    return {
      locked: masternodeStats.stats.locked.map(x => {
        return {
          ...x,
          tvl: new BigNumber(x.tvl).times(usd).toNumber()
        }
      })
    }
  }

  private async getEmission (): Promise<StatsData['emission']> {
    const blockInfo = requireValue(await this.getBlockChainInfo(), 'emission')
    const eunosHeight = blockInfo.softforks.eunos.height ?? 0

    return getEmission(eunosHeight, blockInfo.blocks)
  }

  private async getLoan (): Promise<StatsData['loan']> {
    const info = await this.rpcClient.loan.getLoanInfo()

    return {
      count: {
        collateralTokens: info.totals.collateralTokens.toNumber(),
        loanTokens: info.totals.loanTokens.toNumber(),
        openAuctions: info.totals.openAuctions.toNumber(),
        openVaults: info.totals.openVaults.toNumber(),
        schemes: info.totals.schemes.toNumber()
      },
      value: {
        collateral: info.totals.collateralValue.toNumber(),
        loan: info.totals.loanValue.toNumber()
      }
    }
  }

  private async getBlockChainInfo (): Promise<BlockchainInfo | undefined> {
    return await this.cache.get<BlockchainInfo>('BLOCK_INFO', async () => {
      return await this.rpcClient.blockchain.getBlockchainInfo()
    })
  }

  private async getNet (): Promise<StatsData['net']> {
    const {
      version,
      subversion,
      protocolversion
    } = await this.rpcClient.net.getNetworkInfo()

    return {
      version: version,
      subversion: subversion,
      protocolversion: protocolversion
    }
  }
}

export function getEmission (eunosHeight: number, height: number): StatsData['emission'] {
  const total = getBlockSubsidy(eunosHeight, height)
  const masternode = new BigNumber(new BigNumber('0.3333').times(total).toFixed(8))
  const dex = new BigNumber(new BigNumber('0.2545').times(total).toFixed(8))
  const community = new BigNumber(new BigNumber('0.0491').times(total).toFixed(8))
  const anchor = new BigNumber(new BigNumber('0.0002').times(total).toFixed(8))
  const burned = total.minus(masternode.plus(dex).plus(community).plus(anchor))

  return {
    masternode: masternode.toNumber(),
    dex: dex.toNumber(),
    community: community.toNumber(),
    anchor: anchor.toNumber(),
    burned: burned.toNumber(),
    total: total.toNumber()
  }
}

function requireValue<T> (value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`failed to compute: ${name}`)
  }
  return value
}
