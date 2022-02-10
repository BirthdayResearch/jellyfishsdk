import BigNumber from 'bignumber.js'

export interface BlockRewardDistribution {
  masternode: number
  community: number
  anchor: number
  liquidity: number
  loan: number
  options: number
  unallocated: number
}

export const BlockRewardDistributionPercentage: BlockRewardDistribution = {
  masternode: 3333,
  community: 491,
  anchor: 2,
  liquidity: 2545,
  loan: 2468,
  options: 988,
  unallocated: 173
}

/**
 * Get block reward distribution with block base subsidy
 *
 * @param {BigNumber} subsidy
 * @return BlockRewardDistribution
 */
export function getBlockRewardDistribution (subsidy: BigNumber): BlockRewardDistribution {
  return {
    masternode: calculateReward(subsidy, BlockRewardDistributionPercentage.masternode),
    community: calculateReward(subsidy, BlockRewardDistributionPercentage.community),
    anchor: calculateReward(subsidy, BlockRewardDistributionPercentage.anchor),
    liquidity: calculateReward(subsidy, BlockRewardDistributionPercentage.liquidity),
    loan: calculateReward(subsidy, BlockRewardDistributionPercentage.loan),
    options: calculateReward(subsidy, BlockRewardDistributionPercentage.options),
    unallocated: calculateReward(subsidy, BlockRewardDistributionPercentage.unallocated)
  }
}

/**
 * Amount * Percent / 10000 using Integer Arithmetic (matching cpp CAmount)
 *
 * @param {BigNumber} amount
 * @param {number} percent presented in integer as a numerator with denominator of 10000
 * @return number
 */
function calculateReward (amount: BigNumber, percent: number): number {
  return amount.times(percent).div(10000).integerValue(BigNumber.ROUND_DOWN).toNumber()
}
