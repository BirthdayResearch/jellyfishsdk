import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import BigNumber from 'bignumber.js'

describe('Oracle getPendingFutureSwaps', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  const collateralAddress = RegTestFoundationKeys[0].owner.address
  const futureRewardPercentage = 0.05
  const futureInterval = 25

  async function setup (): Promise<void> {
    const oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(), [
      {
        currency: 'USD',
        token: 'DFI'
      },
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
          tokenAmount: '1.05@TSLA'
        }
      ]
    })
    await testing.generate(10)

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
      amount: 100000
    })
    await testing.token.mint({
      symbol: 'TSLA',
      amount: 100000
    })
    await testing.generate(1)

    const addressTSLA = await testing.generateAddress()

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [addressTSLA]: '1@TSLA'
    })
    await testing.generate(1)
  }

  async function getNextSettleBlock (): Promise<number> {
    const blockCount = await testing.rpc.blockchain.getBlockCount()
    return blockCount + (futureInterval - (blockCount % futureInterval))
  }

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('Should getFutureSwapBlock', async () => {
    const addressTSLA = await testing.generateAddress()

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [addressTSLA]: '1@TSLA'
    })
    await testing.generate(1)

    // Before GOV attributes are set,fFuture swap block should be zero
    {
      const futureSwapBlock = await testing.rpc.oracle.getFutureSwapBlock()
      expect(futureSwapBlock).toStrictEqual(0)
    }

    // Setting GOV attributes
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'true', 'v0/params/dfip2203/reward_pct': futureRewardPercentage.toString(), 'v0/params/dfip2203/block_period': futureInterval.toString() } })
    await testing.generate(1)

    // Call getfutureswapblock before performing futureswap
    // futureSwapBlock should = blockCount + (futureInterval - (blockCount % futureInterval))
    {
      const futureSwapBlock = await testing.container.call('getfutureswapblock')
      expect(futureSwapBlock).toStrictEqual(await getNextSettleBlock())
    }

    await testing.container.call('futureswap', [addressTSLA, '1@TSLA'])
    await testing.generate(1)

    // Call getfutureswapblock after performing futureswap
    // futureSwapBlock should = blockCount + (futureInterval - (blockCount % futureInterval))
    {
      const futureBlock = await testing.container.call('getfutureswapblock')
      expect(futureBlock).toStrictEqual(await getNextSettleBlock())
    }
  })
})
