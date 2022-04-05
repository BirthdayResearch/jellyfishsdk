import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)

const collateralAddress = RegTestFoundationKeys[0].owner.address
const futureRewardPercentage = 0.05
const futureInterval = 25

let addressTSLA: string
let addressGOOGL: string

async function getNextSettleBlock (): Promise<number> {
  const blockCount = await testing.rpc.blockchain.getBlockCount()
  return blockCount + (futureInterval - (blockCount % futureInterval))
}

async function setup (): Promise<void> {
  const oracleAddress = await testing.generateAddress()

  const priceFeeds = [
    {
      currency: 'USD',
      token: 'DFI'
    },
    {
      currency: 'USD',
      token: 'TSLA'
    },
    {
      currency: 'USD',
      token: 'GOOGL'
    }
  ]

  const oracleId = await testing.rpc.oracle.appointOracle(oracleAddress, priceFeeds, { weightage: 1 })
  await testing.generate(1)

  const oraclePrices = [
    {
      currency: 'USD',
      tokenAmount: '1.05@TSLA'
    },
    {
      currency: 'USD',
      tokenAmount: '1.05@GOOGL'
    }
  ]

  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: oraclePrices })
  await testing.generate(10)

  const metadata = {
    symbol: 'BTC',
    name: 'BTC',
    isDAT: true,
    collateralAddress
  }

  await container.call('createtoken', [metadata])
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
    amount: 100000
  })
  await testing.token.mint({
    symbol: 'TSLA',
    amount: 100000
  })
  await testing.token.mint({
    symbol: 'GOOGL',
    amount: 100000
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
    [addressTSLA]: '1@TSLA'
  })
  await testing.generate(1)

  await testing.rpc.account.accountToAccount(collateralAddress, {
    [addressGOOGL]: '1@GOOGL'
  })
  await testing.generate(1)
}

describe('GetPendingFutureSwaps', () => {
  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('Swaps', async () => {
    {
      const pendingFuture = await testing.rpc.account.getPendingFutureSwaps(addressTSLA)
      expect(pendingFuture).toStrictEqual({
        owner: addressTSLA,
        values: []
      })
    }

    {
      const pendingFuture = await testing.rpc.account.getPendingFutureSwaps(addressGOOGL)
      expect(pendingFuture).toStrictEqual({
        owner: addressGOOGL,
        values: []
      })
    }

    {
      await testing.container.call('futureswap', [addressTSLA, '1@TSLA'])
      await testing.generate(1)
    }

    {
      await testing.container.call('futureswap', [addressGOOGL, '1@GOOGL'])
      await testing.generate(1)
    }

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

    {
      const pendingFutures = await testing.rpc.account.getPendingFutureSwaps(addressGOOGL)
      expect(pendingFutures).toStrictEqual({
        owner: addressGOOGL,
        values: [
          {
            source: '1.00000000@GOOGL',
            destination: 'DUSD'
          }
        ]
      })
    }

    const nextSettleBlock = await getNextSettleBlock()
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    {
      const pendingFuture = await testing.rpc.account.getPendingFutureSwaps(addressTSLA)
      expect(pendingFuture).toStrictEqual({
        owner: addressTSLA,
        values: []
      })
    }

    {
      const pendingFuture = await testing.rpc.account.getPendingFutureSwaps(addressGOOGL)
      expect(pendingFuture).toStrictEqual({
        owner: addressGOOGL,
        values: []
      })
    }
  })
})
