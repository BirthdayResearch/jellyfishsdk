import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('Oracle getFutureSwapBlock', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  const collateralAddress = RegTestFoundationKeys[0].owner.address
  const futureRewardPercentage = '0.05'
  const futureInterval = 25

  async function setup (): Promise<void> {
    const oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(), [
      {
        currency: 'USD',
        token: 'TSLA'
      }
    ],
    { weightage: 1 }
    )
    await testing.generate(1)

    await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
      prices: [
        {
          currency: 'USD',
          tokenAmount: '2.1@TSLA'
        }
      ]
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)

    await testing.token.mint({
      symbol: 'TSLA',
      amount: 1
    })
    await testing.generate(1)

    const tslaAddress = await testing.generateAddress()

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [tslaAddress]: '1@TSLA'
    })
    await testing.generate(1)
  }

  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  describe('Should getFutureSwapBlock with number > 0', () => {
    it('Should getFutureSwapBlock If GOV attributes: reward_pct, block_period and active values are set', async () => {
      // Add GOV attributes
      await testing.rpc.masternode.setGov({
        ATTRIBUTES: {
          'v0/params/dfip2203/reward_pct': futureRewardPercentage,
          'v0/params/dfip2203/block_period': futureInterval.toString()
        }
      })
      await testing.generate(1)

      await testing.rpc.masternode.setGov({
        ATTRIBUTES: {
          'v0/params/dfip2203/active': 'true'
        }
      })
      await testing.generate(1)

      // Call getfutureswapblock
      {
        const futureSwapBlock = await testing.container.call('getfutureswapblock')
        const currentBlockCount = await testing.rpc.blockchain.getBlockCount()
        expect(currentBlockCount).toStrictEqual(108)
        expect(futureSwapBlock).toStrictEqual(125) // 108 + 25 - (108 % 25) = 133 - 8 = 125
      }

      // Generate 25 more blocks
      await testing.generate(25)

      // Call getfutureswapblock again after 25 blocks
      {
        const futureSwapBlock = await testing.container.call('getfutureswapblock')
        const currentBlockCount = await testing.rpc.blockchain.getBlockCount()
        expect(currentBlockCount).toStrictEqual(133)
        expect(futureSwapBlock).toStrictEqual(150) // 133 + 25 - (133 % 25) = 158 - 8 = 150
      }
    })
  })

  describe('Should getFutureSwapBlock with number = 0', () => {
    it('Should getFutureSwapBlock if no GOV attribute is set', async () => {
      const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
      expect(futureSwapBlock).toStrictEqual(0)
    })

    it('Should getFutureSwapBlock if GOV attributes: active is set to false', async () => {
      {
        // Only active is set to false
        await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'false' } })
        await testing.generate(1)

        const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
        expect(futureSwapBlock).toStrictEqual(0)
      }

      {
        // If reward_pct and block_period value are set
        await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/reward_pct': futureRewardPercentage, 'v0/params/dfip2203/block_period': futureInterval.toString() } })
        await testing.generate(1)

        const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
        expect(futureSwapBlock).toStrictEqual(0)
      }
    })

    it('Should getFutureSwapBlock if GOV attributes: active is set to true but reward_pct and block_period are not set', async () => {
      {
        // Only active is set to false
        await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'true' } })
        await testing.generate(1)

        const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
        expect(futureSwapBlock).toStrictEqual(0)
      }
    })
  })
})
