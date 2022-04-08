import BigNumber from 'bignumber.js'

export function getBlockSubsidy (eunosHeight: number, height: number): BigNumber {
  let blockSubsidy = new BigNumber(405.04)

  if (height >= eunosHeight) {
    const reductionAmount = new BigNumber(0.01658) // 1.658%
    const reductions = Math.floor((height - eunosHeight) / 32690) // Two weeks

    for (let i = reductions; i > 0; i--) {
      const amount = reductionAmount.times(blockSubsidy)
      if (amount.lte(0.00001)) {
        return new BigNumber(0)
      }

      blockSubsidy = blockSubsidy.minus(amount)
    }
  }

  return blockSubsidy
}
