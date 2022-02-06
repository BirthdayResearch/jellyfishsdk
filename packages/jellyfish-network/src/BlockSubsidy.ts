import BigNumber from 'bignumber.js'

// 273,130,999.89

export interface CoinbaseSubsidyOptions {
  eunosHeight: number
  genesisBlockSubsidy: number
  preEunosBlockSubsidy: 20000000000
  eunosBaseBlockSubsidy: 40504000000
  eunosFoundationBurn: number
  emissionReduction: 1658
  emissionReductionInterval: 32690
}

export const MainNetCoinbaseSubsidyOptions: CoinbaseSubsidyOptions = {
  eunosHeight: 894000,
  /**
   * https://defiscan.live/blocks/279b1a87aedc7b9471d4ad4e5f12967ab6259926cd097ade188dfcf22ebfe72a
   */
  genesisBlockSubsidy: 59100003000000000,
  preEunosBlockSubsidy: 20000000000,
  eunosBaseBlockSubsidy: 40504000000,
  eunosFoundationBurn: 27370000000,
  emissionReduction: 1658,
  emissionReductionInterval: 32690
}

export const TestNetCoinbaseSubsidyOptions: CoinbaseSubsidyOptions = {
  eunosHeight: 354950,
  /**
   * https://defiscan.live/blocks/034ac8c88a1a9b846750768c1ad6f295bc4d0dc4b9b418aee5c0ebd609be8f90?network=TestNet
   */
  genesisBlockSubsidy: 30400004000000000,
  preEunosBlockSubsidy: 20000000000,
  eunosBaseBlockSubsidy: 40504000000,
  eunosFoundationBurn: 0,
  emissionReduction: 1658,
  emissionReductionInterval: 32690
}

/**
 * All calculation are in satoshi.
 *
 * This class cache all 1252 reductions block subsidies and milestones allowing instantaneous computation.
 * With very little memory footprint, 1252 x 2 BigNumber classes for both getSupply and getBlockSubsidy.
 */
export class BlockSubsidy {
  private readonly reductionBlockSubsidies: BigNumber[] = this.computeBlockReductionSubsidies()
  private readonly reductionSupplyMilestones: BigNumber[] = this.computeReductionSupplyMilestones(this.reductionBlockSubsidies)

  constructor (private readonly options: CoinbaseSubsidyOptions = MainNetCoinbaseSubsidyOptions) {
  }

  /**
   * @param {number} height
   * @return BigNumber supply in satoshi up to given height
   */
  getSupply (height: number): BigNumber {
    validateHeight(height)

    if (height < this.options.eunosHeight) {
      return this.getPreEunosSupply(height)
    }

    return this.getPostEunosSupply(height)
  }

  /**
   * @param {number} height
   * @return BigNumber total block subsidy in satoshi at the given height
   */
  getBlockSubsidy (height: number): BigNumber {
    validateHeight(height)

    if (height === 0) {
      return new BigNumber(this.options.genesisBlockSubsidy)
    }

    if (height < this.options.eunosHeight) {
      return new BigNumber(this.options.preEunosBlockSubsidy)
    }

    const reductionCount = Math.floor((height - this.options.eunosHeight) / this.options.emissionReductionInterval)
    if (this.reductionBlockSubsidies[reductionCount] !== undefined) {
      return this.reductionBlockSubsidies[reductionCount]
    }

    return new BigNumber(0)
  }

  /**
   * Calculate pre-eunos supply
   */
  private getPreEunosSupply (height: number): BigNumber {
    let supply = new BigNumber(this.options.genesisBlockSubsidy)
    supply = supply.plus(
      new BigNumber(this.options.preEunosBlockSubsidy).times(height)
    )
    return supply
  }

  /**
   * Calculate post-eunos supply
   */
  private getPostEunosSupply (height: number): BigNumber {
    const postEunosDiff = height - (this.options.eunosHeight - 1)
    const reductionCount = Math.floor(postEunosDiff / this.options.emissionReductionInterval)
    const reductionRemainder = postEunosDiff % this.options.emissionReductionInterval

    if (reductionCount >= this.reductionBlockSubsidies.length) {
      return this.reductionSupplyMilestones[this.reductionSupplyMilestones.length - 1]
    }

    return this.reductionSupplyMilestones[reductionCount].plus(
      this.reductionBlockSubsidies[reductionCount].times(reductionRemainder)
    )
  }

  private computeReductionSupplyMilestones (reductionBlockSubsidies: BigNumber[]): BigNumber[] {
    const baseSupply = new BigNumber(this.options.genesisBlockSubsidy).plus(
      new BigNumber(this.options.preEunosBlockSubsidy).times(this.options.eunosHeight - 1)
    )
    // minus eunosFoundationBurn

    const supplyMilestones: BigNumber[] = [
      baseSupply
    ]

    for (let i = 1; i < reductionBlockSubsidies.length; i++) {
      const previousBlockSubsidy = reductionBlockSubsidies[i - 1]
      const previousMilestone = supplyMilestones[i - 1]
      supplyMilestones[i] = previousMilestone.plus(
        previousBlockSubsidy.times(this.options.emissionReductionInterval)
      )
    }

    return supplyMilestones
  }

  private computeBlockReductionSubsidies (): BigNumber[] {
    const subsidyReductions: BigNumber[] = [
      new BigNumber(this.options.eunosBaseBlockSubsidy)
    ]

    while (true) {
      const previousSubsidy = subsidyReductions[subsidyReductions.length - 1]
      const amount = previousSubsidy.times(this.options.emissionReduction).div(100000).integerValue(BigNumber.ROUND_DOWN)

      if (amount.isZero()) {
        subsidyReductions.push(new BigNumber(0))
        break
      }

      subsidyReductions.push(previousSubsidy.minus(amount))
    }

    return subsidyReductions
  }
}

function validateHeight (height: number): void {
  if (height < 0 || height % 1 !== 0) {
    throw new Error('height must be a positive whole number')
  }
}
