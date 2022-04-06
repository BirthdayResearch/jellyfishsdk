import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('Account GetPendingFutureSwaps', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  const collateralAddress = RegTestFoundationKeys[0].owner.address
  const futureRewardPercentage = 0.05
  const futureInterval = 25

  let tslaAddress: string

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
          tokenAmount: '2@TSLA'
        }
      ]
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      name: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD',
      mintable: true,
      interest: new BigNumber(0)
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      name: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD',
      mintable: true,
      interest: new BigNumber(1)
    })
    await testing.generate(1)

    await testing.token.mint({
      symbol: 'DUSD',
      amount: 4
    })
    await testing.generate(1)

    await testing.token.mint({
      symbol: 'TSLA',
      amount: 4
    })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'false' } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/reward_pct': futureRewardPercentage.toString(), 'v0/params/dfip2203/block_period': futureInterval.toString() } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'true' } })
    await testing.generate(1)

    tslaAddress = await testing.generateAddress()

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [tslaAddress]: '4@DUSD'
    })
    await testing.generate(1)

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [tslaAddress]: '4@TSLA'
    })
    await testing.generate(1)
  }

  async function getNextSettleBlock (): Promise<number> {
    const blockCount = await testing.rpc.blockchain.getBlockCount()
    return blockCount + futureInterval - (blockCount % futureInterval)
  }

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  describe('Single futureswap', () => {
    it('Should getPendingFutureSwaps if futureswap TSLA for DUSD', async () => {
      // Call getpendingfutureswaps before performing futureswap
      {
        const pendingFutureSwaps = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
        expect(pendingFutureSwaps).toStrictEqual({
          owner: tslaAddress,
          values: []
        })
      }

      // futureswap
      await testing.container.call('futureswap', [tslaAddress, '1@TSLA'])
      await testing.generate(1)

      // Call getpendingfutureswaps after performing futureswap
      const pendingFutureSwaps1 = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
      expect(pendingFutureSwaps1).toStrictEqual({
        owner: tslaAddress,
        values: [
          {
            source: '1.00000000@TSLA',
            destination: 'DUSD'
          }
        ]
      })

      // Wait for 1 block before the next settle block
      const nextSettleBlock = await getNextSettleBlock()
      await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount() - 1)

      const pendingFutureSwaps2 = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
      expect(pendingFutureSwaps2).toStrictEqual(pendingFutureSwaps1) // Nothing change

      // Generate 1 more block to settle
      await testing.generate(1)

      // Call getpendingfutureswaps after futureswap is settled
      {
        const pendingFutureSwaps = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
        expect(pendingFutureSwaps).toStrictEqual({
          owner: tslaAddress,
          values: []
        })
      }
    })

    it('Should getPendingFutureSwaps if futureswap DUSD for TSLA', async () => {
      // Call getpendingfutureswaps before performing futureswap
      {
        const pendingFutureSwaps = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
        expect(pendingFutureSwaps).toStrictEqual({
          owner: tslaAddress,
          values: []
        })
      }

      // futureswap
      await testing.container.call('futureswap', [tslaAddress, '1@DUSD', 'TSLA'])
      await testing.generate(1)

      // Call getpendingfutureswaps after performing futureswap
      const pendingFutureSwaps1 = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
      expect(pendingFutureSwaps1).toStrictEqual({
        owner: tslaAddress,
        values: [
          {
            source: '1.00000000@DUSD',
            destination: 'TSLA'
          }
        ]
      })

      // Wait for 1 block before the next settle block
      const nextSettleBlock = await getNextSettleBlock()
      await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount() - 1)

      const pendingFutureSwaps2 = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
      expect(pendingFutureSwaps2).toStrictEqual(pendingFutureSwaps1) // Nothing change

      // Generate 1 more block to settle
      await testing.generate(1)

      // Call getpendingfutureswaps after futureswap is settled
      {
        const pendingFutureSwaps = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
        expect(pendingFutureSwaps).toStrictEqual({
          owner: tslaAddress,
          values: []
        })
      }
    })
  })

  describe('Multiple futureswaps', () => {
    it('Should getPendingFutureSwaps if futureswap TSLA for DUSD', async () => {
      // Call getpendingfutureswaps before performing futureswap
      {
        const pendingFutureSwaps = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
        expect(pendingFutureSwaps).toStrictEqual({
          owner: tslaAddress,
          values: []
        })
      }

      // futureswap 4 times
      await testing.container.call('futureswap', [tslaAddress, '0.7@TSLA'])
      await testing.generate(1)

      await testing.container.call('futureswap', [tslaAddress, '0.6@TSLA'])
      await testing.generate(1)

      await testing.container.call('futureswap', [tslaAddress, '0.5@TSLA'])
      await testing.generate(1)

      await testing.container.call('futureswap', [tslaAddress, '0.2@TSLA'])
      await testing.generate(1)

      // Call getpendingfutureswaps after performing futureswap
      const pendingFutureSwaps1 = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
      expect(pendingFutureSwaps1).toStrictEqual({
        owner: tslaAddress,
        values: [
          {
            source: '0.20000000@TSLA',
            destination: 'DUSD'
          },
          {
            source: '0.50000000@TSLA',
            destination: 'DUSD'
          },
          {
            source: '0.60000000@TSLA',
            destination: 'DUSD'
          },
          {
            source: '0.70000000@TSLA',
            destination: 'DUSD'
          }
        ]
      })

      // Wait for 1 block before the next settle block
      const nextSettleBlock = await getNextSettleBlock()
      await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount() - 1)

      const pendingFutureSwaps2 = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
      expect(pendingFutureSwaps2).toStrictEqual(pendingFutureSwaps1) // Nothing change

      // Generate 1 more block to settle
      await testing.generate(1)

      // Call getpendingfutureswaps after futureswap is settled
      {
        const pendingFutureSwaps = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
        expect(pendingFutureSwaps).toStrictEqual({
          owner: tslaAddress,
          values: []
        })
      }
    })

    it('Should getPendingFutureSwaps if futureswap DUSD for TSLA', async () => {
      // Call getpendingfutureswaps before performing futureswap
      {
        const pendingFutureSwaps = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
        expect(pendingFutureSwaps).toStrictEqual({
          owner: tslaAddress,
          values: []
        })
      }

      // futureswap
      await testing.container.call('futureswap', [tslaAddress, '0.8@DUSD', 'TSLA'])
      await testing.generate(1)

      await testing.container.call('futureswap', [tslaAddress, '0.6@DUSD', 'TSLA'])
      await testing.generate(1)

      await testing.container.call('futureswap', [tslaAddress, '0.4@DUSD', 'TSLA'])
      await testing.generate(1)

      await testing.container.call('futureswap', [tslaAddress, '0.2@DUSD', 'TSLA'])
      await testing.generate(1)

      // Call getpendingfutureswaps after performing futureswap
      const pendingFutureSwaps1 = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
      expect(pendingFutureSwaps1).toStrictEqual({
        owner: tslaAddress,
        values: [
          {
            source: '0.20000000@DUSD',
            destination: 'TSLA'
          },
          {
            source: '0.40000000@DUSD',
            destination: 'TSLA'
          },
          {
            source: '0.60000000@DUSD',
            destination: 'TSLA'
          },
          {
            source: '0.80000000@DUSD',
            destination: 'TSLA'
          }
        ]
      })

      // Wait for 1 block before the next settle block
      const nextSettleBlock = await getNextSettleBlock()
      await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount() - 1)

      const pendingFutureSwaps2 = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
      expect(pendingFutureSwaps2).toStrictEqual(pendingFutureSwaps1) // Nothing change

      // Generate 1 more block to settle
      await testing.generate(1)

      // Call getpendingfutureswaps after futureswap is settled
      {
        const pendingFutureSwaps = await testing.rpc.account.getPendingFutureSwaps(tslaAddress)
        expect(pendingFutureSwaps).toStrictEqual({
          owner: tslaAddress,
          values: []
        })
      }
    })
  })
})
