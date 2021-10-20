import { LoanMasterNodeRegTestContainer } from './loan_container'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RegTestGenesisKeys } from '@defichain/jellyfish-network'
import BigNumber from 'bignumber.js'

describe('Oracle', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(RegTestGenesisKeys[i]))
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)

  beforeAll(async () => {
    await alice.container.start()
    await alice.container.waitForWalletCoinbaseMaturity()

    await setup()
  })

  afterAll(async () => {
    await alice.container.stop()
  })

  async function setup (): Promise<void> {
    // token setup
    const aliceColAddr = await alice.container.getNewAddress()
    await alice.token.dfi({ address: aliceColAddr, amount: 100000 })
    await alice.generate(1)
    await alice.token.create({ symbol: 'BTC', collateralAddress: aliceColAddr })
    await alice.generate(1)
    await alice.token.mint({ symbol: 'BTC', amount: 30000 })
    await alice.generate(1)

    // oracle setup
    const addr = await alice.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'AMZN', currency: 'USD' },
      { token: 'UBER', currency: 'USD' }
    ]
    const oracleId = await alice.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await alice.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await alice.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: '1@DFI', currency: 'USD' },
          { tokenAmount: '10000@BTC', currency: 'USD' },
          { tokenAmount: '2@TSLA', currency: 'USD' },
          { tokenAmount: '4@AMZN', currency: 'USD' },
          { tokenAmount: '4@UBER', currency: 'USD' }
        ]
      }
    )
    await alice.generate(1)

    // setCollateralToken DFI
    await alice.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await alice.generate(1)

    // setCollateralToken BTC
    await alice.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await alice.generate(1)

    // setLoanToken TSLA
    await alice.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await alice.generate(1)

    // mint loan token TSLA
    await alice.token.mint({ symbol: 'TSLA', amount: 30000 })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['30000@TSLA'] })
    await alice.generate(1)

    // setLoanToken AMZN
    await alice.rpc.loan.setLoanToken({
      symbol: 'AMZN',
      fixedIntervalPriceId: 'AMZN/USD'
    })
    await alice.generate(1)

    // mint loan token AMZN
    await alice.token.mint({ symbol: 'AMZN', amount: 40000 })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['40000@AMZN'] })
    await alice.generate(1)

    // setLoanToken UBER
    await alice.rpc.loan.setLoanToken({
      symbol: 'UBER',
      fixedIntervalPriceId: 'UBER/USD'
    })
    await alice.generate(1)

    // mint loan token UBER
    await alice.token.mint({ symbol: 'UBER', amount: 40000 })
    await alice.generate(1)

    // createLoanScheme 'scheme'
    await alice.rpc.loan.createLoanScheme({
      minColRatio: 500,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    const bobColAddr = await bob.generateAddress()
    await bob.token.dfi({ address: bobColAddr, amount: 30000 })
    await bob.generate(1)
    await tGroup.waitForSync()

    await alice.rpc.account.accountToAccount(aliceColAddr, { [bobColAddr]: '1@BTC' })
    await alice.generate(1)
    await tGroup.waitForSync()

    // createVault
    const bobVaultAddr = await bob.generateAddress()
    const bobVaultId = await bob.rpc.loan.createVault({
      ownerAddress: bobVaultAddr,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)

    // depositToVault DFI 1000
    await bob.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: bobColAddr, amount: '10000@DFI'
    })
    await bob.generate(1)

    // depositToVault BTC 1
    await bob.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: bobColAddr, amount: '1@BTC'
    })
    await bob.generate(1)

    // createVault for liquidation
    const bobLiqVaultAddr = await bob.generateAddress()
    const bobLiqVaultId = await bob.rpc.loan.createVault({
      ownerAddress: bobLiqVaultAddr,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)

    await bob.rpc.loan.depositToVault({
      vaultId: bobLiqVaultId, from: bobColAddr, amount: '10000@DFI'
    })
    await bob.generate(1)

    await bob.rpc.loan.takeLoan({
      vaultId: bobLiqVaultId,
      amounts: '100@UBER'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    // liquidated: true
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '100000@UBER', currency: 'USD' }] })
    await alice.generate(1)
    await tGroup.waitForSync()

    // set up fixture for loanPayback
    const aliceDUSDAddr = await alice.container.getNewAddress()
    await alice.token.dfi({ address: aliceDUSDAddr, amount: 600000 })
    await alice.generate(1)
    await alice.token.create({ symbol: 'dUSD', collateralAddress: aliceDUSDAddr })
    await alice.generate(1)
    await alice.token.mint({ symbol: 'dUSD', amount: 600000 })
    await alice.generate(1)

    // create TSLA-dUSD
    await alice.poolpair.create({
      tokenA: 'TSLA',
      tokenB: 'dUSD',
      ownerAddress: aliceColAddr
    })
    await alice.generate(1)

    // add TSLA-dUSD
    await alice.poolpair.add({
      a: { symbol: 'TSLA', amount: 20000 },
      b: { symbol: 'dUSD', amount: 10000 }
    })
    await alice.generate(1)

    // create AMZN-dUSD
    await alice.poolpair.create({
      tokenA: 'AMZN',
      tokenB: 'dUSD'
    })
    await alice.generate(1)

    // add AMZN-dUSD
    await alice.poolpair.add({
      a: { symbol: 'AMZN', amount: 40000 },
      b: { symbol: 'dUSD', amount: 10000 }
    })
    await alice.generate(1)

    // create dUSD-DFI
    await alice.poolpair.create({
      tokenA: 'dUSD',
      tokenB: 'DFI'
    })
    await alice.generate(1)

    // add dUSD-DFI
    await alice.poolpair.add({
      a: { symbol: 'dUSD', amount: 25000 },
      b: { symbol: 'DFI', amount: 10000 }
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    const bobloanAddr = await bob.generateAddress()
    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      to: bobloanAddr,
      amounts: '40@TSLA'
    })
    tslaLoanHeight = await bob.container.getBlockCount()
    await bob.generate(1)
    await tGroup.waitForSync()
  }

  it('should getFixedIntervalPrice', async () => {
    const oracles = await testing.rpc.oracle.listOracles()
    const data = await testing.rpc.oracle.getOracleData(oracles[0])
    console.log('data: ', data)
    const price = await testing.rpc.oracle.getPrice({ token: 'TSLA', currency: 'USD' })
    console.log('price: ', price.toFixed(8))

    try {
      const fixedIntervalPrice = await testing.rpc.oracle.getFixedIntervalPrice('TSLA/USD')
      console.log('fixedIntervalPrice: ', fixedIntervalPrice)
    } catch (err) {
      console.log('err: ', err)
    }
  })
})
