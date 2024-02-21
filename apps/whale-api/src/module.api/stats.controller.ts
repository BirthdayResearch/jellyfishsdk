import { Controller, Get, Inject, NotFoundException } from '@nestjs/common'
import { BurnData, RewardDistributionData, StatsData, SupplyData } from '@defichain/whale-api-client/dist/api/stats'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { BlockMapper } from '../module.model/block'
import { PoolPairService } from './poolpair.service'
import BigNumber from 'bignumber.js'
import { PriceTickerMapper } from '../module.model/price.ticker'
import { MasternodeStats, MasternodeStatsMapper } from '../module.model/masternode.stats'
import { BlockchainInfo } from '@defichain/jellyfish-api-core/dist/category/blockchain'
import { getBlockSubsidy } from './subsidy'
import {
  BlockSubsidy,
  NetworkName,
  getBlockRewardDistribution
} from '@defichain/jellyfish-network'
import { BurnInfo } from '@defichain/jellyfish-api-core/dist/category/account'
import { GetLoanInfoResult } from '@defichain/jellyfish-api-core/dist/category/loan'

const ONE_DFI_IN_SATOSHI = 100_000_000

@Controller('/stats')
export class StatsController {
  constructor (
    protected readonly blockMapper: BlockMapper,
    protected readonly priceTickerMapper: PriceTickerMapper,
    protected readonly masternodeStatsMapper: MasternodeStatsMapper,
    protected readonly poolPairService: PoolPairService,
    protected readonly rpcClient: JsonRpcClient,
    protected readonly cache: SemaphoreCache,
    protected readonly blockSubsidy: BlockSubsidy,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
  }

  @Get()
  async get (): Promise<StatsData> {
    const block = requireValue(await this.blockMapper.getHighest(), 'block')
    const burned = await this.cachedGet('burned', this.getBurned.bind(this), 1806)
    const burnedTotal = await this.getCachedBurnTotal()
    return {
      count: {
        ...await this.cachedGet('count', this.getCount.bind(this), 1801),
        blocks: block.height
      },
      burned: {
        ...burned,
        total: burnedTotal.toNumber()
      },
      tvl: await this.cachedGet('tvl', this.getTVL.bind(this), 310),
      price: await this.cachedGet('price', this.getPrice.bind(this), 220),
      masternodes: await this.cachedGet('masternodes', this.getMasternodes.bind(this), 325),
      loan: await this.getLoan(),
      emission: await this.cachedGet('emission', this.getEmission.bind(this), 1750),
      net: await this.cachedGet('net', this.getNet.bind(this), 1830),
      blockchain: {
        difficulty: block.difficulty
      }
    }
  }

  @Get('/supply')
  async getSupply (): Promise<SupplyData> {
    const height = requireValue(await this.blockMapper.getHighest(), 'block').height

    const max = 1200000000
    const total = this.blockSubsidy.getSupply(height).div(100000000)
    const burnedTotal = await this.getCachedBurnTotal()
    const circulating = total.minus(burnedTotal)

    return {
      max: max,
      total: total.gt(max) ? max : total.toNumber(), // as emission burn is taken into the 1.2b calculation post eunos
      burned: burnedTotal.toNumber(),
      circulating: circulating.toNumber()
    }
  }

  /**
   * Remapped from BurnInfo into BurnData due to upstream standards drift.
   */
  @Get('/burn')
  async getBurn (): Promise<BurnData> {
    const burnInfo = await this.getBurnInfo()
    const paybackBurnDFI = findTokenBalance(burnInfo.paybackburn, 'DFI')

    return {
      address: burnInfo.address,
      amount: burnInfo.amount.toNumber(),
      tokens: burnInfo.tokens,
      feeburn: burnInfo.feeburn.toNumber(),
      emissionburn: burnInfo.emissionburn.toNumber(),
      auctionburn: burnInfo.auctionburn.toNumber(),
      paybackburn: paybackBurnDFI.toNumber(),
      paybackburntokens: burnInfo.paybackburn,
      dexfeetokens: burnInfo.dexfeetokens,
      dfipaybackfee: burnInfo.dfipaybackfee.toNumber(),
      dfipaybacktokens: burnInfo.dfipaybacktokens,
      paybackfees: burnInfo.paybackfees,
      paybacktokens: burnInfo.paybacktokens,
      dfip2203: burnInfo.dfip2203,
      dfip2206f: burnInfo.dfip2206f
    }
  }

  @Get('/rewards/distribution')
  async getRewardDistribution (): Promise<RewardDistributionData> {
    const block = requireValue(await this.blockMapper.getHighest(), 'block')
    const subsidy = this.blockSubsidy.getBlockSubsidy(block.height)

    const distribution = getBlockRewardDistribution(subsidy)

    return {
      anchor: distribution.anchor / ONE_DFI_IN_SATOSHI,
      community: distribution.community / ONE_DFI_IN_SATOSHI,
      liquidity: distribution.liquidity / ONE_DFI_IN_SATOSHI,
      loan: distribution.loan / ONE_DFI_IN_SATOSHI,
      masternode: distribution.masternode / ONE_DFI_IN_SATOSHI,
      options: distribution.options / ONE_DFI_IN_SATOSHI,
      unallocated: distribution.unallocated / ONE_DFI_IN_SATOSHI
    }
  }

  async getBurnInfo (): Promise<BurnInfo> {
    return await this.cachedGet('Controller.stats.getBurnInfo', async () => {
      return await this.rpcClient.account.getBurnInfo()
    }, 666)
  }

  private async getLoanInfo (): Promise<GetLoanInfoResult> {
    return await this.cachedGet('Controller.stats.getLoanInfo', async () => {
      return await this.rpcClient.loan.getLoanInfo()
    }, 1234)
  }

  private async getCachedBurnTotal (): Promise<BigNumber> {
    return await this.cachedGet('Controller.supply.getBurnedTotal', this.getBurnedTotal.bind(this), 1899)
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

    const loan = await this.cachedGet('loan', this.getLoan.bind(this), 1810)

    return {
      dex: dex.toNumber(),
      masternodes: masternodeTvlUSD,
      loan: loan.value.collateral,
      total: dex.toNumber() + masternodeTvlUSD + loan.value.collateral
    }
  }

  private async getBurned (): Promise<StatsData['burned']> {
    const burnInfo = await this.getBurnInfo()

    const utxo = burnInfo.amount
    const account = findTokenBalance(burnInfo.tokens, 'DFI')
    const address = utxo.plus(account)
    const paybackBurnDFI = findTokenBalance(burnInfo.paybackburn, 'DFI')

    return {
      address: address.toNumber(),
      fee: burnInfo.feeburn.toNumber(),
      auction: burnInfo.auctionburn.toNumber(),
      payback: paybackBurnDFI.toNumber(),
      emission: burnInfo.emissionburn.toNumber(),
      total: address
        .plus(burnInfo.feeburn)
        .plus(burnInfo.auctionburn)
        .plus(paybackBurnDFI)
        .plus(burnInfo.emissionburn)
        .toNumber()
    }
  }

  private getBurnAddress (): string {
    switch (this.network) {
      case 'mainnet':
        return '8defichainBurnAddressXXXXXXXdRQkSm'
      case 'testnet':
      case 'changi':
      case 'devnet':
        return '7DefichainBurnAddressXXXXXXXdMUE5n'
      case 'regtest':
        return 'mfburnZSAM7Gs1hpDeNaMotJXSGA7edosG'
      default:
        throw new NotFoundException('Unable to get burn address due to unknown network')
    }
  }

  /**
   * ~~'76a914f7874e8821097615ec345f74c7e5bcf61b12e2ee88ac' is '8defichainBurnAddressXXXXXXXdRQkSm'~~
   * ~~using the hex representation as it's applicable in all network~~
   * update: https://github.com/DeFiCh/ain/pull/2798
   * rpc `getaccount` only expects regular address, no more scriptpubkey
   */
  private async getBurnedTotal (): Promise<BigNumber> {
    const burnAddress = this.getBurnAddress()
    const tokens = await this.rpcClient.account.getAccount(burnAddress)
    const burnInfo = await this.getBurnInfo()

    const utxo = burnInfo.amount
    const account = findTokenBalance(tokens, 'DFI')
    const emission = burnInfo.emissionburn
    const fee = burnInfo.feeburn
    return utxo.plus(account).plus(emission).plus(fee)
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
    const info = await this.getLoanInfo()

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

function findTokenBalance (tokens: string[], symbol: string): BigNumber {
  for (const token of tokens) {
    const [amount, s] = token.split('@')
    if (s === symbol) {
      return new BigNumber(amount)
    }
  }
  return new BigNumber(0)
}

export function requireValue<T> (value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`failed to compute: ${name}`)
  }
  return value
}
