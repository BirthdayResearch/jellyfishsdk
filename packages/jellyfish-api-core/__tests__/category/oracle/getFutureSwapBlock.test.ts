import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'

describe('Oracle getFutureSwapBlock', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  const futureRewardPercentage = '0.05'
  const futureInterval = '25'

  describe('Should getFutureSwapBlock with number > 0', () => {
    it('Should getFutureSwapBlock If GOV attributes: active is set to true, reward_pct and block_period values are set', async () => {
      await testing.rpc.masternode.setGov({
        ATTRIBUTES: {
          'v0/params/dfip2203/reward_pct': futureRewardPercentage,
          'v0/params/dfip2203/block_period': futureInterval
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
        const currentBlockCount = await testing.rpc.blockchain.getBlockCount()
        expect(currentBlockCount).toStrictEqual(103)

        const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
        expect(futureSwapBlock).toStrictEqual(125) // 103 + 25 - (103 % 25) = 128 - 3 = 125
      }

      // Generate 25 more blocks
      await testing.generate(25)

      // Call getfutureswapblock again after 25 blocks
      {
        const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
        const currentBlockCount = await testing.rpc.blockchain.getBlockCount()
        expect(currentBlockCount).toStrictEqual(128)
        expect(futureSwapBlock).toStrictEqual(150) // 128 + 25 - (128 % 25) = 153 - 3 = 150
      }
    })
  })

  describe('Should getFutureSwapBlock with number = 0', () => {
    describe('Should getFutureSwapBlock if GOV attributes: active is set to true', () => {
      it('Should getFutureSwapBlock if GOV attributes: reward_pct value is set but block_period value is not set', async () => {
        await testing.rpc.masternode.setGov({
          ATTRIBUTES: {
            'v0/params/dfip2203/reward_pct': futureRewardPercentage
          }
        })
        await testing.generate(1)

        await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'true' } })
        await testing.generate(1)

        const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
        expect(futureSwapBlock).toStrictEqual(0)
      })

      it('Should getFutureSwapBlock if GOV attributes: block_period value is set but reward_pct value is not set', async () => {
        await testing.rpc.masternode.setGov({
          ATTRIBUTES: {
            'v0/params/dfip2203/block_period': futureInterval
          }
        })
        await testing.generate(1)

        await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'true' } })
        await testing.generate(1)

        const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
        expect(futureSwapBlock).toStrictEqual(0)
      })

      it('Should getFutureSwapBlock if GOV attributes: reward_pct and block_period values are not set', async () => {
        await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'true' } })
        await testing.generate(1)

        const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
        expect(futureSwapBlock).toStrictEqual(0)
      })
    })

    describe('Should getFutureSwapBlock if GOV attributes: active is set to false', () => {
      it('Should getFutureSwapBlock if GOV attributes: reward_pct and block_period values are set', async () => {
        await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'false' } })
        await testing.generate(1)

        await testing.rpc.masternode.setGov({
          ATTRIBUTES: {
            'v0/params/dfip2203/reward_pct': futureRewardPercentage,
            'v0/params/dfip2203/block_period': futureInterval
          }
        })
        await testing.generate(1)

        const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
        expect(futureSwapBlock).toStrictEqual(0)
      })

      it('Should getFutureSwapBlock if GOV attributes: reward_pct value is set but block_period value is not set', async () => {
        await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'false' } })
        await testing.generate(1)

        await testing.rpc.masternode.setGov({
          ATTRIBUTES: {
            'v0/params/dfip2203/reward_pct': futureRewardPercentage
          }
        })
        await testing.generate(1)

        const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
        expect(futureSwapBlock).toStrictEqual(0)
      })

      it('Should getFutureSwapBlock if GOV attributes: block_period value is set but reward_pct value is not set', async () => {
        await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'false' } })
        await testing.generate(1)

        await testing.rpc.masternode.setGov({
          ATTRIBUTES: {
            'v0/params/dfip2203/block_period': futureInterval
          }
        })
        await testing.generate(1)

        const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
        expect(futureSwapBlock).toStrictEqual(0)
      })

      it('Should getFutureSwapBlock if GOV attributes: reward_pct and block_period values are not set', async () => {
        await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'false' } })
        await testing.generate(1)

        const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
        expect(futureSwapBlock).toStrictEqual(0)
      })
    })

    describe('Should getFutureSwapBlock if GOV attributes: active is not set', () => {
      it('Should getFutureSwapBlock', async () => {
        const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
        expect(futureSwapBlock).toStrictEqual(0)
      })
    })
  })
})
