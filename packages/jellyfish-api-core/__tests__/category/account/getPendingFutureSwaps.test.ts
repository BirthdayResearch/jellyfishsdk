import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)

describe('Account GetPendingFutureSwaps', () => {
  const collateralAddress = RegTestFoundationKeys[0].owner.address
  const futureRewardPercentage = 0.05
  const futureInterval = 25

  let addressTSLA: string
  let addressGOOGL: string

  async function getNextSettleBlock (): Promise<number> {
    const blockCount = await testing.rpc.blockchain.getBlockCount()
    return blockCount + futureInterval - (blockCount % futureInterval)
  }

  async function setup (): Promise<void> {
    const oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(), [
      {
        currency: 'USD',
        token: 'TSLA'
      },
      {
        currency: 'USD',
        token: 'GOOGL'
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
          tokenAmount: '2@GOOGL'
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
      symbol: 'GOOGL',
      name: 'GOOGL',
      fixedIntervalPriceId: 'GOOGL/USD',
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
      amount: 2
    })
    await testing.generate(1)

    await testing.token.mint({
      symbol: 'GOOGL',
      amount: 2
    })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'false' } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/reward_pct': futureRewardPercentage.toString(), 'v0/params/dfip2203/block_period': futureInterval.toString() } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'true' } })
    await testing.generate(1)

    addressTSLA = await testing.generateAddress()
    addressGOOGL = await testing.generateAddress()

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [addressTSLA]: '2@DUSD'
    })
    await testing.generate(1)

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [addressTSLA]: '2@TSLA'
    })
    await testing.generate(1)

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [addressGOOGL]: '2@DUSD'
    })
    await testing.generate(1)

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [addressGOOGL]: '2@GOOGL'
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
    it('Should getPendingFutureSwap if futureswap TSLA for DUSD', async () => {
      // Call getpendingfutureswaps before performing futureswap
      {
        const pendingFuture = await testing.rpc.account.getPendingFutureSwaps(addressTSLA)
        expect(pendingFuture).toStrictEqual({
          owner: addressTSLA,
          values: []
        })
      }

      // futureswap
      await testing.container.call('futureswap', [addressTSLA, '1@TSLA'])
      await testing.generate(1)

      // Call getpendingfutureswaps after performing futureswap
      {
        const pendingFutures = await testing.rpc.account.getPendingFutureSwaps(addressTSLA)
        expect(pendingFutures).toStrictEqual({
          owner: addressTSLA,
          values: [
            {
              source: '1.00000000@TSLA',
              destination: 'DUSD'
            }
          ]
        })
      }

      // Wait for next settle block
      const nextSettleBlock = await getNextSettleBlock()
      await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

      // Call getpendingfutureswaps after futureswap is settled
      {
        const pendingFuture = await testing.rpc.account.getPendingFutureSwaps(addressTSLA)
        expect(pendingFuture).toStrictEqual({
          owner: addressTSLA,
          values: []
        })
      }
    })

    it('Should getPendingFutureSwap if futureswap DUSD for TSLA', async () => {
      // Call getpendingfutureswaps before performing futureswap
      {
        const pendingFuture = await testing.rpc.account.getPendingFutureSwaps(addressTSLA)
        expect(pendingFuture).toStrictEqual({
          owner: addressTSLA,
          values: []
        })
      }

      // futureswap
      await testing.container.call('futureswap', [addressTSLA, '1@DUSD', 'TSLA'])
      await testing.generate(1)

      // Call getpendingfutureswaps after performing futureswap
      {
        const pendingFutures = await testing.rpc.account.getPendingFutureSwaps(addressTSLA)
        expect(pendingFutures).toStrictEqual({
          owner: addressTSLA,
          values: [
            {
              source: '1.00000000@DUSD',
              destination: 'TSLA'
            }
          ]
        })
      }

      // Wait for next settle block
      const nextSettleBlock = await getNextSettleBlock()
      await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

      // Call getpendingfutureswaps after futureswap is settled
      {
        const pendingFuture = await testing.rpc.account.getPendingFutureSwaps(addressTSLA)
        expect(pendingFuture).toStrictEqual({
          owner: addressTSLA,
          values: []
        })
      }
    })
  })

  describe('Multiple futureswaps', () => {
    it('Should getPendingFutureSwap if futureswap GOOGL for DUSD', async () => {
      // Call getpendingfutureswaps before performing futureswap
      {
        const pendingFuture = await testing.rpc.account.getPendingFutureSwaps(addressGOOGL)
        expect(pendingFuture).toStrictEqual({
          owner: addressGOOGL,
          values: []
        })
      }

      // futureswap 2 times
      await testing.container.call('futureswap', [addressGOOGL, '0.9@GOOGL'])
      await testing.generate(1)

      await testing.container.call('futureswap', [addressGOOGL, '1.1@GOOGL'])
      await testing.generate(1)

      // Call getpendingfutureswaps after performing futureswap
      {
        const pendingFutures = await testing.rpc.account.getPendingFutureSwaps(addressGOOGL)
        expect(pendingFutures).toStrictEqual({
          owner: addressGOOGL,
          values: [
            {
              source: '1.10000000@GOOGL',
              destination: 'DUSD'
            },
            {
              source: '0.90000000@GOOGL',
              destination: 'DUSD'
            }
          ]
        })
      }

      // Wait for next settle block
      const nextSettleBlock = await getNextSettleBlock()
      await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

      // Call getpendingfutureswaps after futureswap is settled
      {
        const pendingFuture = await testing.rpc.account.getPendingFutureSwaps(addressGOOGL)
        expect(pendingFuture).toStrictEqual({
          owner: addressGOOGL,
          values: []
        })
      }
    })

    it('Should getPendingFutureSwap if futureswap DUSD for GOOGL', async () => {
      // Call getpendingfutureswaps before performing futureswap
      {
        const pendingFuture = await testing.rpc.account.getPendingFutureSwaps(addressGOOGL)
        expect(pendingFuture).toStrictEqual({
          owner: addressGOOGL,
          values: []
        })
      }

      // futureswap
      await testing.container.call('futureswap', [addressGOOGL, '0.8@DUSD', 'GOOGL'])
      await testing.generate(1)

      await testing.container.call('futureswap', [addressGOOGL, '1.2@DUSD', 'GOOGL'])
      await testing.generate(1)

      // Call getpendingfutureswaps after performing futureswap
      {
        const pendingFutures = await testing.rpc.account.getPendingFutureSwaps(addressGOOGL)
        expect(pendingFutures).toStrictEqual({
          owner: addressGOOGL,
          values: [
            {
              source: '1.20000000@DUSD',
              destination: 'GOOGL'
            },
            {
              source: '0.80000000@DUSD',
              destination: 'GOOGL'
            }
          ]
        })
      }

      // Wait for next settle block
      const nextSettleBlock = await getNextSettleBlock()
      await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

      // Call getpendingfutureswaps after futureswap is settled
      {
        const pendingFuture = await testing.rpc.account.getPendingFutureSwaps(addressGOOGL)
        expect(pendingFuture).toStrictEqual({
          owner: addressGOOGL,
          values: []
        })
      }
    })
  })
})
