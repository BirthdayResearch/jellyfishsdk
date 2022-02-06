import {
  BlockSubsidy,
  CoinbaseSubsidyOptions,
  MainNetCoinbaseSubsidyOptions,
  TestNetCoinbaseSubsidyOptions
} from '../src/BlockSubsidy'
import BigNumber from 'bignumber.js'
import { getBlockRewardDistribution } from '../src/BlockRewardDistribution'

function getReductionHeight (count: number, options: CoinbaseSubsidyOptions): number {
  return options.eunosHeight + count * options.emissionReductionInterval
}

describe('blockreward_dfip8_reductions', () => {
  // Test vector taken from https://github.com/DeFiCh/ain/blob/fabc60699afd4e92c73db23a4c366de76c575fab/src/test/dip1fork_tests.cpp#L147-L233

  const blockSubsidy = new BlockSubsidy()

  it('should get coinbase rewards for reduction 0', () => {
    const height = getReductionHeight(0, MainNetCoinbaseSubsidyOptions)
    const subsidy = blockSubsidy.getBlockSubsidy(height)

    expect(subsidy).toStrictEqual(new BigNumber(40504000000))

    expect(getBlockRewardDistribution(subsidy)).toStrictEqual({
      masternode: 13499983200,
      community: 1988746400,
      anchor: 8100800,
      liquidity: 10308268000,
      loan: 9996387200,
      options: 4001795200,
      unallocated: 700719200
    })
  })

  it('should get coinbase rewards for reduction 1', () => {
    const height = getReductionHeight(1, MainNetCoinbaseSubsidyOptions)
    const subsidy = blockSubsidy.getBlockSubsidy(height)

    expect(subsidy).toStrictEqual(new BigNumber(39832443680))

    expect(getBlockRewardDistribution(subsidy)).toStrictEqual({
      masternode: 13276153478,
      community: 1955772984,
      anchor: 7966488,
      liquidity: 10137356916,
      loan: 9830647100,
      options: 3935445435,
      unallocated: 689101275
    })
  })

  it('should get coinbase rewards for reduction 100', () => {
    const height = getReductionHeight(100, MainNetCoinbaseSubsidyOptions)
    const subsidy = blockSubsidy.getBlockSubsidy(height)

    expect(subsidy).toStrictEqual(new BigNumber(7610296073))

    expect(getBlockRewardDistribution(subsidy)).toStrictEqual({
      masternode: 2536511681,
      community: 373665537,
      anchor: 1522059,
      liquidity: 1936820350,
      loan: 1878221070,
      options: 751897252,
      unallocated: 131658122
    })
  })

  it('should get coinbase rewards for reduction 1000', () => {
    const height = getReductionHeight(1000, MainNetCoinbaseSubsidyOptions)
    const subsidy = blockSubsidy.getBlockSubsidy(height)

    expect(subsidy).toStrictEqual(new BigNumber(2250))

    expect(getBlockRewardDistribution(subsidy)).toStrictEqual({
      masternode: 749,
      community: 110,
      anchor: 0,
      liquidity: 572,
      loan: 555,
      options: 222,
      unallocated: 38
    })
  })

  it('should get coinbase rewards for reduction 1251', () => {
    const height = getReductionHeight(1251, MainNetCoinbaseSubsidyOptions)
    const subsidy = blockSubsidy.getBlockSubsidy(height)

    expect(subsidy).toStrictEqual(new BigNumber(60))

    expect(getBlockRewardDistribution(subsidy)).toStrictEqual({
      masternode: 19,
      community: 2,
      anchor: 0,
      liquidity: 15,
      loan: 14,
      options: 5,
      unallocated: 1
    })
  })

  it('should get coinbase rewards for reduction 1252', () => {
    const height = getReductionHeight(1252, MainNetCoinbaseSubsidyOptions)
    const subsidy = blockSubsidy.getBlockSubsidy(height)

    expect(subsidy).toStrictEqual(new BigNumber(0))

    expect(getBlockRewardDistribution(subsidy)).toStrictEqual({
      masternode: 0,
      community: 0,
      anchor: 0,
      liquidity: 0,
      loan: 0,
      options: 0,
      unallocated: 0
    })
  })

  it('should get coinbase rewards for reduction 1253 (not included in cpp)', () => {
    const height = getReductionHeight(1253, MainNetCoinbaseSubsidyOptions)
    const subsidy = blockSubsidy.getBlockSubsidy(height)

    expect(subsidy).toStrictEqual(new BigNumber(0))

    expect(getBlockRewardDistribution(subsidy)).toStrictEqual({
      masternode: 0,
      community: 0,
      anchor: 0,
      liquidity: 0,
      loan: 0,
      options: 0,
      unallocated: 0
    })
  })
})

describe('validation', () => {
  const blockSubsidy = new BlockSubsidy()

  it('should not fail if height=1.0 is valid', () => {
    blockSubsidy.getBlockSubsidy(1.0)
  })

  it('should not fail if height=1234567 is valid', () => {
    blockSubsidy.getBlockSubsidy(1234567)
  })

  it('should fail if height is a negative number', () => {
    expect(() => {
      blockSubsidy.getBlockSubsidy(-1)
    }).toThrowError('height must be a positive whole number')
  })

  it('should fail if height is a floating point number', () => {
    expect(() => {
      blockSubsidy.getBlockSubsidy(1.1)
    }).toThrowError('height must be a positive whole number')
  })

  it('should fail if height is a negative floating point number', () => {
    expect(() => {
      blockSubsidy.getBlockSubsidy(-123.4)
    }).toThrowError('height must be a positive whole number')
  })
})

describe('MainNet.getBlockSubsidy', () => {
  const blockSubsidy = new BlockSubsidy()

  it('should get block subsidy for genesis', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(0)
    expect(subsidy).toStrictEqual(new BigNumber(59100003000000000))
  })

  it('should get block subsidy for height=1', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(1)
    expect(subsidy).toStrictEqual(new BigNumber(20000000000))
  })

  it('should get block subsidy for height=100000', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(100000)
    expect(subsidy).toStrictEqual(new BigNumber(20000000000))
  })

  it('should get block subsidy for height=356000', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(356000)
    expect(subsidy).toStrictEqual(new BigNumber(20000000000))
  })

  it('should get block subsidy for height=356500', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(356500)
    expect(subsidy).toStrictEqual(new BigNumber(20000000000))
  })

  it('should get block subsidy for height=893999', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(893999)
    expect(subsidy).toStrictEqual(new BigNumber(20000000000))
  })

  it('should get block subsidy for height=894000 (0th reduction)', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(894000)
    expect(subsidy).toStrictEqual(new BigNumber(40504000000))
  })

  it('should get block subsidy for height=926689 (0th reduction)', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(926689)
    expect(subsidy).toStrictEqual(new BigNumber(40504000000))
  })

  it('should get block subsidy for height=926690 (1st reduction)', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(926690)
    expect(subsidy).toStrictEqual(new BigNumber(39832443680))
  })

  it('should get block subsidy for height=959379 (1nd reduction)', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(959379)
    expect(subsidy).toStrictEqual(new BigNumber(39832443680))
  })

  it('should get block subsidy for height=959380 (2nd reduction)', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(959380)
    expect(subsidy).toStrictEqual(new BigNumber(39172021764))
  })

  it('should get block subsidy for height=33584000', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(33584000)
    expect(subsidy).toStrictEqual(new BigNumber(2250))
  })

  it('should get block subsidy for height=33584001', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(33584001)
    expect(subsidy).toStrictEqual(new BigNumber(2250))
  })

  it('should get block subsidy for height=41789190', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(41789190)
    expect(subsidy).toStrictEqual(new BigNumber(60))
  })

  it('should get block subsidy for height=41789191', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(41789191)
    expect(subsidy).toStrictEqual(new BigNumber(60))
  })

  it('should get block subsidy for height=41821879', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(41821879)
    expect(subsidy).toStrictEqual(new BigNumber(60))
  })

  it('should get block subsidy for height=41821880', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(41821880)
    expect(subsidy).toStrictEqual(new BigNumber(0))
  })

  it('should get block subsidy for height=1,000,000,000', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(1000000000)
    expect(subsidy).toStrictEqual(new BigNumber(0))
  })
})

describe('TestNet.getBlockSubsidy', () => {
  const blockSubsidy = new BlockSubsidy(TestNetCoinbaseSubsidyOptions)

  it('should get block subsidy for genesis', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(0)
    expect(subsidy).toStrictEqual(new BigNumber(30400004000000000))
  })

  it('should get block subsidy for height=1', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(1)
    expect(subsidy).toStrictEqual(new BigNumber(20000000000))
  })

  it('should get block subsidy for height=354949', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(354949)
    expect(subsidy).toStrictEqual(new BigNumber(20000000000))
  })

  it('should get block subsidy for height=354950', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(354950)
    expect(subsidy).toStrictEqual(new BigNumber(40504000000))
  })

  it('should get block subsidy for height=387639', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(387639)
    expect(subsidy).toStrictEqual(new BigNumber(40504000000))
  })

  it('should get block subsidy for height=387640', () => {
    const subsidy = blockSubsidy.getBlockSubsidy(387640)
    expect(subsidy).toStrictEqual(new BigNumber(39832443680))
  })
})

describe('MainNet.getSupply', () => {
  const blockSubsidy = new BlockSubsidy()

  it('should get supply for genesis', () => {
    const supply = blockSubsidy.getSupply(0)
    //              Genesis = 59100003000000000
    expect(supply).toStrictEqual(new BigNumber('59100003000000000'))
  })

  it('should get supply for height=1', () => {
    const supply = blockSubsidy.getSupply(1)
    //              Genesis = 59100003000000000
    //      1 * 20000000000 = 00000020000000000
    expect(supply).toStrictEqual(new BigNumber('59100023000000000'))
  })

  it('should get supply for height=2', () => {
    const supply = blockSubsidy.getSupply(2)
    //              Genesis = 59100003000000000
    //      2 * 20000000000 = 00000040000000000
    expect(supply).toStrictEqual(new BigNumber('59100043000000000'))
  })

  it('should get supply for height=100000', () => {
    const supply = blockSubsidy.getSupply(100000)
    //              Genesis = 59100003000000000
    // 100000 * 20000000000 = 02000000000000000
    expect(supply).toStrictEqual(new BigNumber('61100003000000000'))
  })

  it('should get supply for height=356500', () => {
    const supply = blockSubsidy.getSupply(356500)
    //              Genesis = 59100003000000000
    // 356500 * 20000000000 = 07130000000000000
    expect(supply).toStrictEqual(new BigNumber('66230003000000000'))
  })

  it('should get supply for height=893999', () => {
    const supply = blockSubsidy.getSupply(893999)
    //              Genesis = 59100003000000000
    // 893999 * 20000000000 = 17879980000000000
    // 59100003000000000 + 17879980000000000 = 7.6979983E16
    expect(supply).toStrictEqual(new BigNumber('76979983000000000'))
  })

  it('should get supply for height=894000', () => {
    const supply = blockSubsidy.getSupply(894000)
    //              Genesis = 59100003000000000 - Foundation Burn
    // 893999 * 20000000000 = 17879980000000000
    //      1 * 40504000000 = 40504000000
    expect(supply).toStrictEqual(new BigNumber('76980023504000000'))
  })

  it('should get supply for height=926689', () => {
    const supply = blockSubsidy.getSupply(926689)
    //              Genesis = 59100003000000000 - Foundation Burn
    // 893999 * 20000000000 = 17879980000000000
    //  32690 * 40504000000 =  1324075760000000
    expect(supply).toStrictEqual(new BigNumber('78304058760000000'))
  })

  it('should get supply for height=926690', () => {
    const supply = blockSubsidy.getSupply(926690)
    //              Genesis = 59100003000000000 - Foundation Burn
    // 893999 * 20000000000 = 17879980000000000
    //  32690 * 40504000000 =  1324075760000000
    //      1 * 39832443680 =       39832443680
    expect(supply).toStrictEqual(new BigNumber('78304098592443680'))
  })

  it('should get supply for height=959379', () => {
    const supply = blockSubsidy.getSupply(959379)
    //              Genesis = 59100003000000000 - Foundation Burn
    // 893999 * 20000000000 = 17879980000000000
    //  32690 * 40504000000 =  1324075760000000
    //  32690 * 39832443680 =  1302122583899200
    expect(supply).toStrictEqual(new BigNumber('79606181343899200'))
  })

  it('should get supply for height=959380', () => {
    const supply = blockSubsidy.getSupply(959380)
    //              Genesis = 59100003000000000 - Foundation Burn
    // 893999 * 20000000000 = 17879980000000000
    //  32690 * 40504000000 =  1324075760000000
    //  32690 * 39832443680 =  1302122583899200
    //      1 * 39172021764 =       39172021764
    expect(supply).toStrictEqual(new BigNumber('79606220515920964'))
  })

  it('should get supply for height=41821879', () => {
    const supply = blockSubsidy.getSupply(41821879)
    expect(supply).toStrictEqual(new BigNumber('156839800772831600'))
  })

  it('should get supply for height=41821880', () => {
    const supply = blockSubsidy.getSupply(41821880)
    expect(supply).toStrictEqual(new BigNumber('156839800772831600'))
  })

  it('should get supply for height=1000000000', () => {
    const supply = blockSubsidy.getSupply(1000000000)
    expect(supply).toStrictEqual(new BigNumber('156839800772831600'))
  })
})
