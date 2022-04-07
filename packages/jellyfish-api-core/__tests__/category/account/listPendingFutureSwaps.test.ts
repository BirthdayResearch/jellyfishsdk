import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('Account ListPendingFutureSwaps', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  const collateralAddress = RegTestFoundationKeys[0].owner.address
  const futureRewardPercentage = 0.05
  const futureInterval = 25

  let tslaAddress: string
  let aaplAddress: string
  let msftAddress: string

  async function setup (): Promise<void> {
    const oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(), [
      {
        currency: 'USD',
        token: 'TSLA'
      },
      {
        currency: 'USD',
        token: 'AAPL'
      },
      {
        currency: 'USD',
        token: 'MSFT'
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
        },
        {
          currency: 'USD',
          tokenAmount: '2@AAPL'
        },
        {
          currency: 'USD',
          tokenAmount: '2@MSFT'
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

    await testing.rpc.loan.setLoanToken({
      symbol: 'AAPL',
      name: 'AAPL',
      fixedIntervalPriceId: 'AAPL/USD',
      mintable: true,
      interest: new BigNumber(1)
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'MSFT',
      name: 'MSFT',
      fixedIntervalPriceId: 'MSFT/USD',
      mintable: true,
      interest: new BigNumber(1)
    })
    await testing.generate(1)

    await testing.token.mint({
      symbol: 'DUSD',
      amount: 9
    })
    await testing.generate(1)

    await testing.token.mint({
      symbol: 'TSLA',
      amount: 4
    })
    await testing.generate(1)

    await testing.token.mint({
      symbol: 'AAPL',
      amount: 1
    })
    await testing.generate(1)

    await testing.token.mint({
      symbol: 'MSFT',
      amount: 1
    })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'false' } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/reward_pct': futureRewardPercentage.toString(), 'v0/params/dfip2203/block_period': futureInterval.toString() } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'true' } })
    await testing.generate(1)

    tslaAddress = await testing.generateAddress()
    aaplAddress = await testing.generateAddress()
    msftAddress = await testing.generateAddress()

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [tslaAddress]: '4@DUSD'
    })
    await testing.generate(1)

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [tslaAddress]: '4@TSLA'
    })
    await testing.generate(1)

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [aaplAddress]: '1@DUSD'
    })
    await testing.generate(1)

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [aaplAddress]: '1@AAPL'
    })
    await testing.generate(1)

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [msftAddress]: '1@DUSD'
    })
    await testing.generate(1)

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [msftAddress]: '1@MSFT'
    })
    await testing.generate(1)
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
    it('Should listPendingFutureSwaps if futureswap TSLA for DUSD', async () => {
      // Call listpendingfutureswaps before performing futureswap
      {
        const pendingFutureSwaps = await testing.rpc.account.listPendingFutureSwaps()
        expect(pendingFutureSwaps).toStrictEqual([])
      }

      // futureswap
      await testing.container.call('futureswap', [tslaAddress, '1@TSLA'])
      await testing.generate(1)

      // Call listpendingfutureswaps after performing futureswap
      const pendingFutureSwaps1 = await testing.rpc.account.listPendingFutureSwaps()
      expect(pendingFutureSwaps1).toStrictEqual([{
        owner: tslaAddress,
        source: '1.00000000@TSLA',
        destination: 'DUSD'
      }])

      // Wait for 1 block before getfutureswapblock
      const nextSettleBlock = await testing.container.call('getfutureswapblock')
      await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount() - 1)

      const pendingFutureSwaps2 = await testing.rpc.account.listPendingFutureSwaps()
      expect(pendingFutureSwaps2).toStrictEqual(pendingFutureSwaps1) // Nothing change

      // Generate 1 more block to execute futureswap
      await testing.generate(1)

      // Call listpendingfutureswaps after futureswap
      {
        const pendingFutureSwaps = await testing.rpc.account.listPendingFutureSwaps()
        expect(pendingFutureSwaps).toStrictEqual([])
      }
    })

    it('Should listPendingFutureSwaps if futureswap DUSD for TSLA', async () => {
      // Call listpendingfutureswaps before performing futureswap
      {
        const pendingFutureSwaps = await testing.rpc.account.listPendingFutureSwaps()
        expect(pendingFutureSwaps).toStrictEqual([])
      }

      // futureswap
      await testing.container.call('futureswap', [tslaAddress, '1@DUSD', 'TSLA'])
      await testing.generate(1)

      // Call listpendingfutureswaps after performing futureswap
      const pendingFutureSwaps1 = await testing.rpc.account.listPendingFutureSwaps()
      expect(pendingFutureSwaps1).toStrictEqual([{
        owner: tslaAddress,
        source: '1.00000000@DUSD',
        destination: 'TSLA'
      }])

      // Wait for 1 block before getfutureswapblock
      const nextSettleBlock = await testing.container.call('getfutureswapblock')
      await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount() - 1)

      const pendingFutureSwaps2 = await testing.rpc.account.listPendingFutureSwaps()
      expect(pendingFutureSwaps2).toStrictEqual(pendingFutureSwaps1) // Nothing change

      // Generate 1 more block to swap at futures swap block
      await testing.generate(1)

      // Call listpendingfutureswaps after futureswap
      {
        const pendingFutureSwaps = await testing.rpc.account.listPendingFutureSwaps()
        expect(pendingFutureSwaps).toStrictEqual([])
      }
    })
  })

  describe('Multiple futureswaps', () => {
    describe('For single token which is TSLA only', () => {
      it('Should listpendingfutureswaps if multiple futureswaps TSLA for DUSD', async () => {
        // Call listpendingfutureswaps before performing futureswap
        {
          const pendingFutureSwaps = await testing.rpc.account.listPendingFutureSwaps()
          expect(pendingFutureSwaps).toStrictEqual([])
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

        // Call listpendingfutureswaps after performing futureswap
        const pendingFutureSwaps1 = await testing.rpc.account.listPendingFutureSwaps()
        expect(pendingFutureSwaps1).toStrictEqual(
          [
            {
              destination: 'DUSD',
              owner: tslaAddress,
              source: '0.20000000@TSLA'
            },
            {
              destination: 'DUSD',
              owner: tslaAddress,
              source: '0.50000000@TSLA'
            },
            {
              destination: 'DUSD',
              owner: tslaAddress,
              source: '0.60000000@TSLA'
            },
            {
              destination: 'DUSD',
              owner: tslaAddress,
              source: '0.70000000@TSLA'
            }
          ]
        )

        // Wait for 1 block before getfutureswapblock
        const nextSettleBlock = await testing.container.call('getfutureswapblock')
        await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount() - 1)

        const pendingFutureSwaps2 = await testing.rpc.account.listPendingFutureSwaps()
        expect(pendingFutureSwaps2).toStrictEqual(pendingFutureSwaps1) // Nothing change

        // Generate 1 more block to swap at futures swap block
        await testing.generate(1)

        // Call listpendingfutureswaps after futureswap
        {
          const pendingFutureSwaps = await testing.rpc.account.listPendingFutureSwaps()
          expect(pendingFutureSwaps).toStrictEqual([])
        }
      })

      it('Should listPendingFutureSwaps if multiple futureswap DUSD for TSLA', async () => {
        // Call listPendingFutureSwaps before performing futureswap
        {
          const pendingFutureSwaps = await testing.rpc.account.listPendingFutureSwaps()
          expect(pendingFutureSwaps).toStrictEqual([])
        }

        // futureswap 4 times
        await testing.container.call('futureswap', [tslaAddress, '0.8@DUSD', 'TSLA'])
        await testing.generate(1)

        await testing.container.call('futureswap', [tslaAddress, '0.6@DUSD', 'TSLA'])
        await testing.generate(1)

        await testing.container.call('futureswap', [tslaAddress, '0.4@DUSD', 'TSLA'])
        await testing.generate(1)

        await testing.container.call('futureswap', [tslaAddress, '0.2@DUSD', 'TSLA'])
        await testing.generate(1)

        // Call listpendingfutureswaps after performing futureswap
        const pendingFutureSwaps1 = await testing.rpc.account.listPendingFutureSwaps()
        expect(pendingFutureSwaps1).toStrictEqual(
          [
            {
              destination: 'TSLA',
              owner: tslaAddress,
              source: '0.20000000@DUSD'
            },
            {
              destination: 'TSLA',
              owner: tslaAddress,
              source: '0.40000000@DUSD'
            },
            {
              destination: 'TSLA',
              owner: tslaAddress,
              source: '0.60000000@DUSD'
            },
            {
              destination: 'TSLA',
              owner: tslaAddress,
              source: '0.80000000@DUSD'
            }
          ]
        )

        // Wait for 1 block before getfutureswapblock
        const nextSettleBlock = await testing.container.call('getfutureswapblock')
        await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount() - 1)

        const pendingFutureSwaps2 = await testing.rpc.account.listPendingFutureSwaps()
        expect(pendingFutureSwaps2).toStrictEqual(pendingFutureSwaps1) // Nothing change

        // Generate 1 more block to futureswap
        await testing.generate(1)

        // Call listpendingfutureswaps after futureswap
        {
          const pendingFutureSwaps = await testing.rpc.account.listPendingFutureSwaps()
          expect(pendingFutureSwaps).toStrictEqual([])
        }
      })
    })

    describe('For multiple tokens which are TSLA, AAPL, MSFT', () => {
      it('Should listPendingFutureSwaps if multiple futureswaps TSLA, AAPL, MSFT for DUSD', async () => {
        // Call listpendingfutureswaps before performing futureswap
        {
          const pendingFutureSwaps = await testing.rpc.account.listPendingFutureSwaps()
          expect(pendingFutureSwaps).toStrictEqual([])
        }

        // futureswap 2 times for every token
        await testing.container.call('futureswap', [tslaAddress, '0.85@TSLA'])
        await testing.container.call('futureswap', [tslaAddress, '0.15@TSLA'])
        await testing.container.call('futureswap', [aaplAddress, '0.71@AAPL'])
        await testing.container.call('futureswap', [aaplAddress, '0.29@AAPL'])
        await testing.container.call('futureswap', [msftAddress, '0.63@MSFT'])
        await testing.container.call('futureswap', [msftAddress, '0.27@MSFT'])
        await testing.generate(1)

        // Call listpendingfutureswaps after performing futureswap
        const pendingFutureSwaps1 = await testing.rpc.account.listPendingFutureSwaps()
        expect(pendingFutureSwaps1.length).toStrictEqual(6)

        expect(pendingFutureSwaps1).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              destination: 'DUSD',
              owner: tslaAddress,
              source: '0.85000000@TSLA'
            })
          ])
        )

        expect(pendingFutureSwaps1).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              destination: 'DUSD',
              owner: tslaAddress,
              source: '0.15000000@TSLA'
            })
          ])
        )

        expect(pendingFutureSwaps1).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              destination: 'DUSD',
              owner: aaplAddress,
              source: '0.71000000@AAPL'
            })
          ])
        )

        expect(pendingFutureSwaps1).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              destination: 'DUSD',
              owner: aaplAddress,
              source: '0.29000000@AAPL'
            })
          ])
        )

        expect(pendingFutureSwaps1).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              destination: 'DUSD',
              owner: msftAddress,
              source: '0.63000000@MSFT'
            })
          ])
        )

        expect(pendingFutureSwaps1).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              destination: 'DUSD',
              owner: msftAddress,
              source: '0.27000000@MSFT'
            })
          ])
        )

        // Wait for 1 block before the next settle block
        const nextSettleBlock = await testing.container.call('getfutureswapblock')
        await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount() - 1)

        const pendingFutureSwaps2 = await testing.rpc.account.listPendingFutureSwaps()
        expect(pendingFutureSwaps2).toStrictEqual(pendingFutureSwaps1) // Nothing change

        // Generate 1 more block to futureswap
        await testing.generate(1)

        // Call listpendingfutureswaps after futureswap is settled
        {
          const pendingFutureSwaps = await testing.rpc.account.listPendingFutureSwaps()
          expect(pendingFutureSwaps).toStrictEqual([])
        }
      })

      it('Should listPendingFutureSwaps if multiple futureswaps DUSD for TSLA, AAPL, MSFT', async () => {
        // Call listpendingfutureswaps before performing futureswap
        {
          const pendingFutureSwaps = await testing.rpc.account.listPendingFutureSwaps()
          expect(pendingFutureSwaps).toStrictEqual([])
        }

        // futureswap 2 times for every token
        await testing.container.call('futureswap', [tslaAddress, '0.85@DUSD', 'TSLA'])
        await testing.container.call('futureswap', [tslaAddress, '0.15@DUSD', 'TSLA'])
        await testing.container.call('futureswap', [aaplAddress, '0.71@DUSD', 'AAPL'])
        await testing.container.call('futureswap', [aaplAddress, '0.29@DUSD', 'AAPL'])
        await testing.container.call('futureswap', [msftAddress, '0.63@DUSD', 'MSFT'])
        await testing.container.call('futureswap', [msftAddress, '0.27@DUSD', 'MSFT'])
        await testing.generate(1)

        // Call listpendingfutureswaps after performing futureswap
        const pendingFutureSwaps1 = await testing.rpc.account.listPendingFutureSwaps()
        expect(pendingFutureSwaps1.length).toStrictEqual(6)

        expect(pendingFutureSwaps1).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              destination: 'TSLA',
              owner: tslaAddress,
              source: '0.85000000@DUSD'
            })
          ])
        )

        expect(pendingFutureSwaps1).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              destination: 'TSLA',
              owner: tslaAddress,
              source: '0.15000000@DUSD'
            })
          ])
        )

        expect(pendingFutureSwaps1).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              destination: 'AAPL',
              owner: aaplAddress,
              source: '0.71000000@DUSD'
            })
          ])
        )

        expect(pendingFutureSwaps1).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              destination: 'AAPL',
              owner: aaplAddress,
              source: '0.29000000@DUSD'
            })
          ])
        )

        expect(pendingFutureSwaps1).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              destination: 'MSFT',
              owner: msftAddress,
              source: '0.63000000@DUSD'
            })
          ])
        )

        expect(pendingFutureSwaps1).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              destination: 'MSFT',
              owner: msftAddress,
              source: '0.27000000@DUSD'
            })
          ])
        )

        // Wait for 1 block before the next settle block
        const nextSettleBlock = await testing.container.call('getfutureswapblock')
        await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount() - 1)

        const pendingFutureSwaps2 = await testing.rpc.account.listPendingFutureSwaps()
        expect(pendingFutureSwaps2).toStrictEqual(pendingFutureSwaps1) // Nothing change

        // Generate 1 more block to futureswap
        await testing.generate(1)

        // Call listpendingfutureswaps after futureswap is settled
        {
          const pendingFutureSwaps = await testing.rpc.account.listPendingFutureSwaps()
          expect(pendingFutureSwaps).toStrictEqual([])
        }
      })
    })
  })
})
