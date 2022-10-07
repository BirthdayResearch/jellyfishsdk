import { Injectable } from '@nestjs/common'
import { CommunityBalanceData } from '@defichain/jellyfish-api-core/src/category/account'
import {
  BlockRewardDistributionPercentage,
  BlockSubsidy,
  MainNetCoinbaseSubsidyOptions,
  TestNetCoinbaseSubsidyOptions
} from '@defichain/jellyfish-network'
import { WhaleApiClientProvider } from '../../providers/WhaleApiClientProvider'
import BigNumber from 'bignumber.js'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { BurnData, StatsData } from '@defichain/whale-api-client/dist/api/stats'
import { get } from 'lodash'

// region - Needs to be kept in sync with defi-stats-api-master
const REWARDS_TOTAL = 200
const REWARDS_FOUNDATION_SHARE_PERCENT = 9.95
const REWARDS_ANCHOR_SHARE_PERCENT = 0.05
const LIQUIDITY_POOL_SHARE_PERCENT = 22.5

const REWARDS_ANCHOR =
  (REWARDS_TOTAL * REWARDS_ANCHOR_SHARE_PERCENT) / 100 // 0.1

const LIQUIDITY_POOL =
  (REWARDS_TOTAL * LIQUIDITY_POOL_SHARE_PERCENT) / 100 // 45

const COMMUNITY_REWARDS_DISTRIBUTION = {
  masternode: BlockRewardDistributionPercentage.masternode / 10000,
  community: BlockRewardDistributionPercentage.community / 10000,
  anchor: BlockRewardDistributionPercentage.anchor / 10000,
  liquidity: BlockRewardDistributionPercentage.liquidity / 10000,
  options: BlockRewardDistributionPercentage.options / 10000,
  unallocated: BlockRewardDistributionPercentage.unallocated / 10000,
  swap: 12.34 * 0.01, // 12.34%
  futures: 12.34 * 0.01 // 12.34%
}
// endregion

// Format for all BigNumber values
const DECIMAL_PLACES = 8
const ONE_DFI_IN_SATOSHI = 100_000_000

const MAINNET_COMMUNITY_ADDR: string = 'dZcHjYhKtEM88TtZLjp314H2xZjkztXtRc'
const TESTNET_COMMUNITY_ADDR: string = '7Q2nZCcKnxiRiHSNQtLB27RA5efxm2cE7w'

@Injectable()
export class MainnetLegacyStatsProvider {
  protected api: WhaleApiClient
  protected chain: 'main' | 'test' = 'main'
  protected blockSubsidy = new BlockSubsidy(MainNetCoinbaseSubsidyOptions)

  constructor (private readonly clientProvider: WhaleApiClientProvider) {
    this.api = clientProvider.getClient('mainnet')
  }

  async getStats (jsonPath?: string): Promise<LegacyStats | any> {
    const stats: StatsData = await this.api.stats.get()

    // Fire async requests at the same time and await results
    const [
      burnInfo,
      listCommunities,
      communityBalance,
      bestBlock,
      supply
    ] = await Promise.all([
      this.getBurnInfo(),
      this.getListCommunities(),
      this.getCommunityBalance(),
      this.api.blocks.get(stats.count.blocks.toString()),
      this.api.stats.getSupply()
    ])

    const result = {
      chain: this.chain,
      blockHeight: bestBlock.height,
      bestBlockHash: bestBlock.hash, // get the tip
      difficulty: bestBlock.difficulty.toString(),
      medianTime: bestBlock.medianTime, // median time of tip
      burnInfo: burnInfo,
      tokens: {
        max: supply.max,

        supply: {
          total: supply.total,
          circulation: supply.circulating,
          foundation: 0, // all burned as of mid 2021 https://github.com/DeFiCh/dfips/issues/17
          community: communityBalance
        },

        // Initial distribution - fixed numbers
        initDist: this.getInitDist()
      },
      rewards: this.getRewards(bestBlock.height),
      listCommunities: listCommunities,
      timeStamp: Date.now()
    }

    if (jsonPath !== undefined && jsonPath !== null) {
      return get(result, jsonPath)
    }

    return result
  }

  /**
   * Adopted from defi-stats-api-master. Since the values are computed from the current
   * blockchain height, every request requires a fresh calculation.
   * @param blockHeight
   */
  getRewards (blockHeight: number): LegacyRewards {
    const blockSubsidy = this.calculateBlockSubsidy(blockHeight)

    // Apply the blockSubsidy multiplier to each reward
    const newRewards = { ...COMMUNITY_REWARDS_DISTRIBUTION }
    let key: keyof typeof COMMUNITY_REWARDS_DISTRIBUTION
    for (key in newRewards) {
      if (Object.prototype.hasOwnProperty.call(newRewards, key)) {
        newRewards[key] *= blockSubsidy
      }
    }

    return {
      anchorPercent: REWARDS_ANCHOR_SHARE_PERCENT,
      liquidityPoolPercent: LIQUIDITY_POOL_SHARE_PERCENT,
      communityPercent: REWARDS_FOUNDATION_SHARE_PERCENT,
      anchorReward: REWARDS_ANCHOR,
      liquidityPool: LIQUIDITY_POOL,
      total: blockSubsidy,
      minter: newRewards.masternode,
      ...newRewards
    }
  }

  async getBurnInfo (): Promise<LegacyBurnInfo> {
    const burnInfo: BurnData = await this.api.stats.getBurn()
    return {
      address: burnInfo.address,
      amount: new BigNumber(burnInfo.amount).toFixed(DECIMAL_PLACES),
      tokens: burnInfo.tokens,
      feeburn: burnInfo.feeburn,
      auctionburn: burnInfo.auctionburn,
      paybackburn: new BigNumber(burnInfo.paybackburn).toFixed(8),
      paybackburntokens: burnInfo.paybackburntokens,
      dexfeetokens: burnInfo.dexfeetokens,
      dfipaybackfee: burnInfo.dfipaybackfee,
      dfipaybacktokens: burnInfo.dfipaybacktokens,
      emissionburn: new BigNumber(burnInfo.emissionburn).toFixed(8),
      dfip2203: burnInfo.dfip2203,
      dfip2206f: burnInfo.dfip2206f
    }
  }

  /**
   * Makes an rpc call - currently not available on Whale
   */
  async getListCommunities (): Promise<LegacyListCommunities> {
    const communityBalances = await this.api.rpc.call<CommunityBalanceData>('listcommunitybalances', [], 'number')
    return {
      AnchorReward: new BigNumber(communityBalances.AnchorReward).toNumber(),
      Burnt: new BigNumber(communityBalances.Burnt).toFixed(DECIMAL_PLACES)
    }
  }

  calculateBlockSubsidy (blockHeight: number): number {
    return this.blockSubsidy.getBlockSubsidy(blockHeight).div(ONE_DFI_IN_SATOSHI).toNumber()
  }

  async getCommunityBalance (): Promise<number> {
    return new BigNumber(
      await this.api.address.getBalance(MAINNET_COMMUNITY_ADDR)
    ).toNumber()
  }

  getInitDist (): LegacyInitDist {
    return {
      total: 588_000_000,
      totalPercent: 49,
      foundation: 288_120_000,
      foundationPercent: 49,
      circulation: 49,
      circulationPercent: 51
    }
  }
}

@Injectable()
export class TestnetLegacyStatsProvider extends MainnetLegacyStatsProvider {
  constructor (clientProvider: WhaleApiClientProvider) {
    super(clientProvider)
    this.api = clientProvider.getClient('testnet')
    this.chain = 'test'
    this.blockSubsidy = new BlockSubsidy(TestNetCoinbaseSubsidyOptions)
  }

  async getCommunityBalance (): Promise<number> {
    return new BigNumber(
      await this.api.address.getBalance(TESTNET_COMMUNITY_ADDR)
    ).toNumber()
  }

  getInitDist (): LegacyInitDist {
    return {
      total: 300000000,
      totalPercent: 25.00,
      foundation: 0,
      foundationPercent: 0,
      circulation: 300000000,
      circulationPercent: 100
    }
  }
}

export interface LegacyStats {
  chain: string
  blockHeight: number
  bestBlockHash: string
  difficulty: string
  medianTime: number
  burnInfo: LegacyBurnInfo
  timeStamp: number
  tokens: LegacyTokens
  rewards: LegacyRewards
  listCommunities: LegacyListCommunities
}

interface LegacyBurnInfo {
  address: string
  amount: string
  tokens: string[]
  feeburn: number
  auctionburn: number
  paybackburn: string
  paybackburntokens: string[]
  dexfeetokens: string[]
  dfipaybackfee: number
  dfipaybacktokens: string[]
  emissionburn: string
  dfip2203: string[]
  dfip2206f: string[]
}

interface LegacyTokens {
  max: number
  supply: LegacySupply
  initDist: LegacyInitDist
}

interface LegacySupply {
  total: number
  circulation: number
  foundation: number
  community: number
}

interface LegacyInitDist {
  total: number
  totalPercent: number
  foundation: number
  foundationPercent: number
  circulation: number
  circulationPercent: number
}

interface LegacyRewards {
  anchorPercent: number
  liquidityPoolPercent: number
  communityPercent: number
  total: number
  community: number
  minter: number
  anchorReward: number
  liquidityPool: number
  masternode: number
  anchor: number
  liquidity: number
  swap: number
  futures: number
  options: number
  unallocated: number
}

interface LegacyListCommunities {
  AnchorReward: number
  Burnt: string
}
