import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Account ListPendingFutureSwaps', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let collateralAddress: string
  let tslaAddress: string
  let msftAddress: string
  let aaplAddress: string

  const futureRewardPercentage = 0.05
  const futureInterval = 25

  async function setup (): Promise<void> {
    collateralAddress = await testing.generateAddress()
    await testing.token.dfi({ address: collateralAddress, amount: 18 })
    await testing.token.create({ symbol: 'BTC', collateralAddress })
    await testing.generate(1)
    await testing.token.mint({ symbol: 'BTC', amount: 1 })
    await testing.generate(1)

    const oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(), [
      {
        token: 'DFI',
        currency: 'USD'
      },
      {
        token: 'BTC',
        currency: 'USD'
      },
      {
        token: 'TSLA',
        currency: 'USD'
      },
      {
        token: 'MSFT',
        currency: 'USD'
      },
      {
        token: 'AAPL',
        currency: 'USD'
      }
    ],
    { weightage: 1 }
    )
    await testing.generate(1)

    await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
      prices: [
        {
          tokenAmount: '1@DFI',
          currency: 'USD'
        },
        {
          tokenAmount: '1000@BTC',
          currency: 'USD'
        },
        {
          tokenAmount: '2@TSLA',
          currency: 'USD'
        },
        {
          tokenAmount: '2@MSFT',
          currency: 'USD'
        },
        {
          tokenAmount: '2@AAPL',
          currency: 'USD'
        }
      ]
    })
    await testing.generate(1)

    await testing.container.call('createloanscheme', [100, 1, 'default'])
    await testing.generate(1)

    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
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
      symbol: 'MSFT',
      name: 'MSFT',
      fixedIntervalPriceId: 'MSFT/USD',
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

    const vaultId = await testing.rpc.loan.createVault({
      ownerAddress: collateralAddress,
      loanSchemeId: 'default'
    })
    await testing.generate(1)

    await testing.rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '18@DFI'
    })

    await testing.container.waitForPriceValid('TSLA/USD')

    // take multiple loans
    await testing.rpc.loan.takeLoan({
      vaultId: vaultId,
      to: collateralAddress,
      amounts: ['6@DUSD', '4@TSLA', '1@MSFT', '1@AAPL']
    })
    await testing.generate(1)

    tslaAddress = await testing.generateAddress()
    msftAddress = await testing.generateAddress()
    aaplAddress = await testing.generateAddress()

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [tslaAddress]: '4@DUSD'
    })
    await testing.generate(1)

    await testing.rpc.account.accountToAccount(collateralAddress, {
      [tslaAddress]: '4@TSLA'
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

    console.log(aaplAddress)
    // await testing.rpc.account.accountToAccount(collateralAddress, {
    //   [aaplAddress]: '1@DUSD'
    // })
    // await testing.generate(1)
    //
    // await testing.rpc.account.accountToAccount(collateralAddress, {
    //   [aaplAddress]: '1@AAPL'
    // })
    // await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'false' } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/dfip2203/reward_pct': futureRewardPercentage.toString(),
        'v0/params/dfip2203/block_period': futureInterval.toString()
      }
    })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'true' } })
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
    describe('If GOV attributes: active is enabled', () => {
      it('Should listPendingFutureSwaps if futureswap TSLA for DUSD', async () => {
        {
          const pendingFutureSwaps = await testing.rpc.account.listPendingFutureSwaps()
          expect(pendingFutureSwaps).toStrictEqual([])
        }

        await testing.container.call('futureswap', [tslaAddress, '1@TSLA'])
        await testing.generate(1)

        const pendingFutureSwaps1 = await testing.rpc.account.listPendingFutureSwaps()
        expect(pendingFutureSwaps1).toStrictEqual([
          {
            owner: tslaAddress,
            source: '1.00000000@TSLA',
            destination: 'DUSD'
          }
        ])
      })
    })
  })
})
