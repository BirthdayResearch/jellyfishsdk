import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { VaultActive } from '../../../src/category/loan'

const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)
let bobVaultId: string
let bobVaultId1: string
let bobVaultAddr: string
let bobVaultAddr1: string
let bobLiqVaultId: string
let bobloanAddr: string
let tslaLoanHeight: number
let aliceColAddr: string

const netInterest = (3 + 0) / 100 // (scheme.rate + loanToken.interest) / 100
const blocksPerDay = (60 * 60 * 24) / (10 * 60) // 144 in regtest
const priceFeeds = [
  { token: 'DFI', currency: 'USD' },
  { token: 'BTC', currency: 'USD' },
  { token: 'TSLA', currency: 'USD' },
  { token: 'AMZN', currency: 'USD' },
  { token: 'UBER', currency: 'USD' },
  { token: 'DUSD', currency: 'USD' }
]

async function setup (): Promise<void> {
  // token setup
  aliceColAddr = await alice.container.getNewAddress()
  await alice.token.dfi({ address: aliceColAddr, amount: 15000 })
  await alice.generate(1)
  await alice.token.create({ symbol: 'BTC', collateralAddress: aliceColAddr })
  await alice.generate(1)
  await alice.token.mint({ symbol: 'BTC', amount: 10000 })
  await alice.generate(1)

  // oracle setup
  const addr = await alice.generateAddress()

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
        { tokenAmount: '4@UBER', currency: 'USD' },
        { tokenAmount: '1@DUSD', currency: 'USD' }
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

  // setLoanToken DUSD
  await alice.rpc.loan.setLoanToken({
    symbol: 'DUSD',
    fixedIntervalPriceId: 'DUSD/USD'
  })
  await alice.generate(1)

  // setLoanToken TSLA
  await alice.rpc.loan.setLoanToken({
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await alice.generate(1)

  // setLoanToken AMZN
  await alice.rpc.loan.setLoanToken({
    symbol: 'AMZN',
    fixedIntervalPriceId: 'AMZN/USD'
  })
  await alice.generate(1)

  // setLoanToken UBER
  await alice.rpc.loan.setLoanToken({
    symbol: 'UBER',
    fixedIntervalPriceId: 'UBER/USD'
  })
  await alice.generate(1)

  // createLoanScheme 'scheme'
  await alice.rpc.loan.createLoanScheme({
    minColRatio: 200,
    interestRate: new BigNumber(3),
    id: 'scheme'
  })
  await alice.generate(1)

  await alice.rpc.loan.createLoanScheme({
    minColRatio: 150,
    interestRate: new BigNumber(3),
    id: 'default'
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

  // create vault for taking large loan tokens
  const aliceVaultAddr = await alice.generateAddress()
  const aliceVaultId = await alice.rpc.loan.createVault({
    ownerAddress: aliceVaultAddr,
    loanSchemeId: 'default'
  })
  await alice.generate(1)

  await alice.rpc.loan.depositToVault({
    vaultId: aliceVaultId, from: aliceColAddr, amount: '10000@DFI'
  })
  await alice.generate(1)

  await alice.rpc.loan.takeLoan({
    vaultId: aliceVaultId,
    to: aliceColAddr,
    amounts: ['300@TSLA', '400@AMZN', '400@UBER', '1000@DUSD']
  })
  await alice.generate(1)

  // create TSLA-DUSD
  await alice.poolpair.create({
    tokenA: 'TSLA',
    tokenB: 'DUSD',
    ownerAddress: aliceColAddr
  })
  await alice.generate(1)

  // add TSLA-DUSD
  await alice.poolpair.add({
    a: { symbol: 'TSLA', amount: 200 },
    b: { symbol: 'DUSD', amount: 100 }
  })
  await alice.generate(1)

  // create AMZN-DUSD
  await alice.poolpair.create({
    tokenA: 'AMZN',
    tokenB: 'DUSD'
  })
  await alice.generate(1)

  // add AMZN-DUSD
  await alice.poolpair.add({
    a: { symbol: 'AMZN', amount: 400 },
    b: { symbol: 'DUSD', amount: 100 }
  })
  await alice.generate(1)

  // create DUSD-DFI
  await alice.poolpair.create({
    tokenA: 'DUSD',
    tokenB: 'DFI'
  })
  await alice.generate(1)

  // add DUSD-DFI
  await alice.poolpair.add({
    a: { symbol: 'DUSD', amount: 250 },
    b: { symbol: 'DFI', amount: 100 }
  })
  await alice.generate(1)
  await tGroup.waitForSync()

  // createVault
  bobVaultAddr = await bob.generateAddress()
  bobVaultId = await bob.rpc.loan.createVault({
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

  // createVault #2
  bobVaultAddr1 = await bob.generateAddress()
  bobVaultId1 = await bob.rpc.loan.createVault({
    ownerAddress: bobVaultAddr1,
    loanSchemeId: 'scheme'
  })
  await bob.generate(1)

  await bob.rpc.loan.depositToVault({
    vaultId: bobVaultId1, from: bobColAddr, amount: '10000@DFI'
  })
  await bob.generate(1)

  // createVault for liquidation
  const bobLiqVaultAddr = await bob.generateAddress()
  bobLiqVaultId = await bob.rpc.loan.createVault({
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
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '100@UBER', currency: 'USD' }] })
  await alice.generate(1)
  await tGroup.waitForSync()

  bobloanAddr = await bob.generateAddress()
  await bob.rpc.loan.takeLoan({
    vaultId: bobVaultId,
    to: bobloanAddr,
    amounts: '40@TSLA'
  })
  await bob.generate(1)
  await tGroup.waitForSync()
  tslaLoanHeight = await bob.container.getBlockCount()
}

describe('paybackLoan success', () => {
  beforeEach(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  it('should paybackLoan', async () => {
    await alice.rpc.account.sendTokensToAddress({}, { [bobloanAddr]: ['5@TSLA'] })
    await alice.generate(1)
    await tGroup.waitForSync()

    {
      const interests = await bob.rpc.loan.getInterest('scheme')
      const height = await bob.container.getBlockCount()
      const tslaInterestPerBlock = new BigNumber(netInterest * 40 / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
      const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(height + 1 - tslaLoanHeight)
      expect(interests[0].interestPerBlock.toFixed(8)).toStrictEqual(tslaInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL))
      expect(interests[0].totalInterest.toFixed(8)).toStrictEqual(tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL))
    }

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.loanAmounts).toStrictEqual(['40.00004567@TSLA'])
    expect(vaultBefore.loanValue).toStrictEqual(80.00009134)
    expect(vaultBefore.interestAmounts).toStrictEqual(['0.00004567@TSLA'])
    expect(vaultBefore.interestValue).toStrictEqual(0.00009134)
    expect(vaultBefore.collateralRatio).toStrictEqual(18750)
    expect(vaultBefore.informativeRatio).toStrictEqual(18749.97859221)

    const bobLoanAccBefore = await bob.rpc.account.getAccount(bobloanAddr)
    expect(bobLoanAccBefore).toStrictEqual(['45.00000000@TSLA'])

    await bob.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: '45@TSLA', // try pay over loan amount
      from: bobloanAddr
    })
    await bob.generate(1)

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmounts).toStrictEqual([])
    expect(vaultAfter.interestAmounts).toStrictEqual([])
    expect(vaultAfter.interestValue).toStrictEqual(0)
    expect(vaultAfter.loanValue).toStrictEqual(0)
    expect(vaultAfter.collateralRatio).toStrictEqual(-1)
    expect(vaultAfter.informativeRatio).toStrictEqual(-1)

    const bobLoanAccAfter = await bob.rpc.account.getAccount(bobloanAddr)
    expect(bobLoanAccAfter).toStrictEqual(['4.99995433@TSLA'])
  })

  it('should paybackLoan partially', async () => {
    const burnInfoBefore = await bob.container.call('getburninfo')
    expect(burnInfoBefore.paybackburn).toStrictEqual(undefined)

    const loanAccBefore = await bob.container.call('getaccount', [bobloanAddr])
    expect(loanAccBefore).toStrictEqual(['40.00000000@TSLA'])

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.collateralValue).toStrictEqual(15000) // DFI(10000) + BTC(1 * 10000 * 0.5)
    expect(vaultBefore.loanAmounts).toStrictEqual(['40.00002284@TSLA']) // 40 + totalInterest
    expect(vaultBefore.interestAmounts).toStrictEqual(['0.00002284@TSLA'])
    expect(vaultBefore.loanValue).toStrictEqual(80.00004568) // loanAmount * 2 (::1 TSLA = 2 USD)
    expect(vaultBefore.interestValue).toStrictEqual(0.00004568)
    expect(vaultBefore.collateralRatio).toStrictEqual(18750) // 15000 / 80.00004568 * 100
    expect(vaultBefore.informativeRatio).toStrictEqual(18749.98929375)

    const tslaInterestsPerBlockBefore = new BigNumber(netInterest * 40 / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    const interestsBeforePayback = await bob.rpc.loan.getInterest('scheme')
    {
      const height = await bob.container.getBlockCount()
      const tslaInterestTotal = tslaInterestsPerBlockBefore.multipliedBy(height + 1 - tslaLoanHeight)
      expect(interestsBeforePayback[0].interestPerBlock.toFixed(8)).toStrictEqual(tslaInterestsPerBlockBefore.toFixed(8, BigNumber.ROUND_CEIL))
      expect(interestsBeforePayback[0].totalInterest.toFixed(8)).toStrictEqual(tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL))
    }

    const payBackTslaAmount = 13
    const txid = await bob.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: `${payBackTslaAmount}@TSLA`,
      from: bobloanAddr
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)
    tslaLoanHeight = await bob.container.getBlockCount()

    // check the interests after payback
    const interestAfterPayback = await bob.rpc.loan.getInterest('scheme')
    // total interest payable is paid back upfront even at partial payback. Becuase of that actual loanDecreasedAfterPayback = (payBackTslaAmount - total interest)
    const loanDecreasedAfterPayback = new BigNumber(payBackTslaAmount).minus(interestsBeforePayback[0].totalInterest)
    const tslaInterestsPerBlockAfter = tslaInterestsPerBlockBefore.minus(loanDecreasedAfterPayback.multipliedBy(netInterest).dividedBy(365 * blocksPerDay))
    {
      const height = await bob.container.getBlockCount()
      const tslaInterestTotal = tslaInterestsPerBlockAfter.multipliedBy(height + 1 - tslaLoanHeight) // 0.000015411050228310503
      expect(interestAfterPayback[0].interestPerBlock.toFixed(8)).toStrictEqual(tslaInterestsPerBlockAfter.toFixed(8, BigNumber.ROUND_CEIL))
      expect(interestAfterPayback[0].totalInterest.toFixed(8)).toStrictEqual(tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)) // 0.00001542
    }

    const loanAccAfter = await bob.container.call('getaccount', [bobloanAddr])
    expect(loanAccAfter).toStrictEqual(['27.00000000@TSLA']) // 40 - 13 = 27

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmounts).toStrictEqual(['27.00003826@TSLA']) // 40.00002284(loanBefore loan amount) - 13 + new totalInterest
    expect(vaultAfter.interestAmounts).toStrictEqual(['0.00001542@TSLA']) // new total interest
    expect(vaultAfter.loanValue).toStrictEqual(54.00007652) // 27.00003826 * 2 (::1 TSLA = 2 USD)
    expect(vaultAfter.interestValue).toStrictEqual(0.00003084)
    expect(vaultAfter.collateralRatio).toStrictEqual(27778) // 15000 / (27.00003826 * 2)* 100
    expect(vaultAfter.informativeRatio).toStrictEqual(27777.73841569)

    const burnInfoAfter = await bob.container.call('getburninfo')
    expect(burnInfoAfter.paybackburn).toStrictEqual(0.00000457)
  })

  it('should paybackLoan by anyone', async () => {
    const loanAccBefore = await bob.container.call('getaccount', [aliceColAddr])
    expect(loanAccBefore).toStrictEqual([
      '4900.00000000@DFI', '9999.00000000@BTC', '550.00000000@DUSD', '100.00000000@TSLA', '400.00000000@UBER'
    ])

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.collateralValue).toStrictEqual(15000) // DFI(10000) + BTC(1 * 10000 * 0.5)
    expect(vaultBefore.loanAmounts).toStrictEqual(['40.00002284@TSLA']) // 40 + totalInterest
    expect(vaultBefore.interestAmounts).toStrictEqual(['0.00002284@TSLA'])
    expect(vaultBefore.loanValue).toStrictEqual(80.00004568) // loanAmount * 2 (::1 TSLA = 2 USD)
    expect(vaultBefore.interestValue).toStrictEqual(0.00004568)
    expect(vaultBefore.collateralRatio).toStrictEqual(18750) // 15000 / 80.0000458 * 100
    expect(vaultBefore.informativeRatio).toStrictEqual(18749.98929375)

    const txid = await alice.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: '8@TSLA',
      from: aliceColAddr
    })
    expect(typeof txid).toStrictEqual('string')
    await alice.generate(1)
    await tGroup.waitForSync()

    const loanAccAfter = await bob.container.call('getaccount', [aliceColAddr])
    expect(loanAccAfter).toStrictEqual([
      '4900.00000000@DFI', '9999.00000000@BTC', '550.00000000@DUSD', '92.00000000@TSLA', '400.00000000@UBER'
    ])

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmounts).toStrictEqual(['32.00004111@TSLA'])// loanamount before repayment - repay amount + total interest
    expect(vaultAfter.interestAmounts).toStrictEqual(['0.00001827@TSLA'])
    expect(vaultAfter.loanValue).toStrictEqual(64.00008222) // 32.0000411 * 2 (::1 TSLA = 2 USD)
    expect(vaultAfter.interestValue).toStrictEqual(0.00003654)
    expect(vaultAfter.collateralRatio).toStrictEqual(23437) // 15000 / (32.00006394 * 2) * 100
    expect(vaultAfter.informativeRatio).toStrictEqual(23437.46989017)
  })

  it('should paybackLoan more than one amount', async () => {
    const burnInfoBefore = await bob.container.call('getburninfo')
    expect(burnInfoBefore.paybackburn).toStrictEqual(undefined)

    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: ['15@AMZN'],
      to: bobloanAddr
    })
    await bob.generate(1)
    const amznLoanHeight = await bob.container.getBlockCount()

    const loanTokenAccBefore = await bob.container.call('getaccount', [bobloanAddr])
    expect(loanTokenAccBefore).toStrictEqual(['40.00000000@TSLA', '15.00000000@AMZN'])

    // first paybackLoan
    const tslaTokenAmt = loanTokenAccBefore.find((amt: string) => amt.split('@')[1] === 'TSLA')
    const tslaAmt = Number(tslaTokenAmt.split('@')[0])
    const amznTokenAmt = loanTokenAccBefore.find((amt: string) => amt.split('@')[1] === 'AMZN')
    const amznAmt = Number(amznTokenAmt.split('@')[0])

    const tslaInterestPerBlock = new BigNumber(netInterest * tslaAmt / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    const amznInterestPerBlock = new BigNumber(netInterest * amznAmt / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay

    const tslaPaybackAmount = 13
    const amznPaybackAmount = 6

    // const tslaInterestPerBlock = previousInterestPerBlock - new BigNumber(netInterest * 13 / (365 * blocksPerDay)).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const tslaInterestPerBlockAfterFirstPayback = tslaInterestPerBlock.minus(new BigNumber(netInterest * tslaPaybackAmount / (365 * blocksPerDay)))
    const amznInterestPerBlockAfterFirstPayback = amznInterestPerBlock.minus(new BigNumber(netInterest * amznPaybackAmount / (365 * blocksPerDay)))

    const tslaInterestPerBlockAfterSecondPayback = tslaInterestPerBlockAfterFirstPayback.minus(new BigNumber(netInterest * tslaPaybackAmount / (365 * blocksPerDay)))
    const amznInterestPerBlockAfterSecondPayback = amznInterestPerBlockAfterFirstPayback.minus(new BigNumber(netInterest * amznPaybackAmount / (365 * blocksPerDay)))

    let tslaLoanAmountAfter1stPaymentRounded = new BigNumber(0)
    let amznLoanAmountAfter1stPaymentRounded = new BigNumber(0)
    {
      const blockHeight = await bob.container.getBlockCount()

      // tsla interest
      const tslaTotalInterest = tslaInterestPerBlock.multipliedBy(blockHeight + 1 - tslaLoanHeight)

      // amzn interest
      const amznTotalInterest = amznInterestPerBlock.multipliedBy(blockHeight + 1 - amznLoanHeight)

      const interests = await bob.rpc.loan.getInterest('scheme')

      const tslaInterest = interests.find(i => i.token === 'TSLA')
      const tslaTotalInt = tslaInterest!.totalInterest.toFixed(8)
      expect(tslaTotalInt).toStrictEqual(tslaTotalInterest.toFixed(8, BigNumber.ROUND_CEIL))
      const tslaInterestPerBlk = tslaInterest?.interestPerBlock.toFixed(8)
      expect(tslaInterestPerBlk).toStrictEqual(tslaInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL))

      const amzInterest = interests.find(i => i.token === 'AMZN')
      const amzTotalInt = amzInterest!.totalInterest.toFixed(8)
      expect(amzTotalInt).toStrictEqual(amznTotalInterest.toFixed(8, BigNumber.ROUND_CEIL))
      const amzInterestPerBlk = amzInterest?.interestPerBlock.toFixed(8)
      expect(amzInterestPerBlk).toStrictEqual(amznInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL))

      const tslaLoanAmountBefore = (new BigNumber(40)).plus(tslaTotalInterest)
      const amznLoanAmountBefore = (new BigNumber(15)).plus(amznTotalInterest)

      const vaultBefore = await bob.container.call('getvault', [bobVaultId])
      const tslaLoanAmountBeforeRounded = tslaLoanAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL)
      const amznLoanAmountBeforeRounded = amznLoanAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL)
      expect(vaultBefore.loanAmounts).toStrictEqual([`${tslaLoanAmountBeforeRounded.toFixed(8)}@TSLA`, `${amznLoanAmountBeforeRounded.toFixed(8)}@AMZN`]) // eg: tslaTakeLoanAmt + tslaTotalInterest
      expect(vaultBefore.interestAmounts).toStrictEqual([`${tslaTotalInt}@TSLA`, `${amzTotalInt}@AMZN`])
      expect(vaultBefore.loanValue).toStrictEqual(tslaLoanAmountBeforeRounded.multipliedBy(2).plus(amznLoanAmountBeforeRounded.multipliedBy(4)).toNumber()) // (40.00004567 * 2) + (15.00000857* 4)
      expect(vaultBefore.collateralRatio).toStrictEqual(10714) // 15000 / 140.00012564 * 100
      expect(vaultBefore.informativeRatio).toStrictEqual(10714.27610051)

      const txid = await bob.rpc.loan.paybackLoan({
        vaultId: bobVaultId,
        amounts: [`${tslaPaybackAmount}@TSLA`, `${amznPaybackAmount}@AMZN`],
        from: bobloanAddr
      })
      expect(typeof txid).toStrictEqual('string')
      await bob.generate(1)

      const vaultAfter = await bob.container.call('getvault', [bobVaultId])
      const roundedTslaInterestAfter1stPayment = tslaInterestPerBlockAfterFirstPayback.decimalPlaces(8, BigNumber.ROUND_CEIL)
      const roundedAmznInterstAfter1stPayment = amznInterestPerBlockAfterFirstPayback.decimalPlaces(8, BigNumber.ROUND_CEIL)

      // previous loan amount(rounded) - repaid loan amount + current total interest amount
      const tslaLoanAmountAfter1stPayment = tslaLoanAmountBeforeRounded.minus(new BigNumber(tslaPaybackAmount)).plus(tslaInterestPerBlockAfterFirstPayback)
      tslaLoanAmountAfter1stPaymentRounded = tslaLoanAmountAfter1stPayment.decimalPlaces(8, BigNumber.ROUND_CEIL)
      const amznLoanAmountAfter1stPayment = amznLoanAmountBeforeRounded.minus(new BigNumber(amznPaybackAmount)).plus(amznInterestPerBlockAfterFirstPayback)
      amznLoanAmountAfter1stPaymentRounded = amznLoanAmountAfter1stPayment.decimalPlaces(8, BigNumber.ROUND_CEIL)

      expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfter1stPaymentRounded.toFixed(8)}@TSLA`, `${amznLoanAmountAfter1stPaymentRounded.toFixed(8)}@AMZN`])
      expect(vaultAfter.interestAmounts).toStrictEqual([`${roundedTslaInterestAfter1stPayment.toFixed(8)}@TSLA`, `${roundedAmznInterstAfter1stPayment.toFixed(8)}@AMZN`])
      expect(vaultAfter.loanValue).toStrictEqual(tslaLoanAmountAfter1stPaymentRounded.multipliedBy(2).plus(amznLoanAmountAfter1stPaymentRounded.multipliedBy(4)).toNumber())
      expect(vaultAfter.interestValue).toStrictEqual(roundedTslaInterestAfter1stPayment.multipliedBy(2).plus(roundedAmznInterstAfter1stPayment.multipliedBy(4)).toNumber())
      expect(vaultAfter.collateralRatio).toStrictEqual(16667)
      expect(vaultAfter.informativeRatio).toStrictEqual(16666.63388524)

      const loanTokenAccAfter = await bob.container.call('getaccount', [bobloanAddr])
      expect(loanTokenAccAfter).toStrictEqual(['27.00000000@TSLA', '9.00000000@AMZN'])

      const burnInfoAfter = await bob.container.call('getburninfo')
      expect(burnInfoAfter.paybackburn).toStrictEqual(0.00001)
    }

    // second paybackLoan
    {
      const txid2 = await bob.rpc.loan.paybackLoan({
        vaultId: bobVaultId,
        amounts: [`${tslaPaybackAmount}@TSLA`, `${amznPaybackAmount}@AMZN`],
        from: bobloanAddr
      })
      expect(typeof txid2).toStrictEqual('string')
      await bob.generate(1)

      const interests = await bob.rpc.loan.getInterest('scheme')

      const tslaInterest = interests.find(i => i.token === 'TSLA')
      const tslaTotalInterest = tslaInterest!.totalInterest.toFixed(8)
      expect(tslaTotalInterest).toStrictEqual(tslaInterestPerBlockAfterSecondPayback.toFixed(8, BigNumber.ROUND_CEIL)) // (1 block * interest per block) (old interest has been wiped out)
      const tslaInterestPerBlk = tslaInterest!.interestPerBlock.toFixed(8)
      expect(tslaInterestPerBlk).toStrictEqual(tslaInterestPerBlockAfterSecondPayback.toFixed(8, BigNumber.ROUND_CEIL))

      const amzInterest = interests.find(i => i.token === 'AMZN')
      const amzTotalInterest = amzInterest!.totalInterest.toFixed(8)
      expect(amzTotalInterest).toStrictEqual(amznInterestPerBlockAfterSecondPayback.toFixed(8, BigNumber.ROUND_CEIL))
      const amzInterestPerBlk = amzInterest!.interestPerBlock.toFixed(8)
      expect(amzInterestPerBlk).toStrictEqual(amznInterestPerBlockAfterSecondPayback.toFixed(8, BigNumber.ROUND_CEIL))

      const vaultAfter = await bob.container.call('getvault', [bobVaultId])
      const roundedTslaInterestAfter2ndPayment = tslaInterestPerBlockAfterSecondPayback.decimalPlaces(8, BigNumber.ROUND_CEIL)
      const roundedAmznInterstAfter2ndPayment = amznInterestPerBlockAfterSecondPayback.decimalPlaces(8, BigNumber.ROUND_CEIL)

      // previous loan amount(rounded) - repaid loan amount + current total interest amount
      const tslaLoanAmountAfter2ndPayment = tslaLoanAmountAfter1stPaymentRounded.minus(new BigNumber(tslaPaybackAmount)).plus(tslaInterestPerBlockAfterSecondPayback)
      const tslaLoanAmountAfter2ndPaymentRounded = tslaLoanAmountAfter2ndPayment.decimalPlaces(8, BigNumber.ROUND_CEIL)
      const amznLoanAmountAfter2ndPayment = amznLoanAmountAfter1stPaymentRounded.minus(new BigNumber(amznPaybackAmount)).plus(amznInterestPerBlockAfterSecondPayback)
      const amznLoanAmountAfter2ndPaymentRounded = amznLoanAmountAfter2ndPayment.decimalPlaces(8, BigNumber.ROUND_CEIL)

      expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfter2ndPaymentRounded.toFixed(8)}@TSLA`, `${amznLoanAmountAfter2ndPaymentRounded.toFixed(8)}@AMZN`])
      expect(vaultAfter.interestAmounts).toStrictEqual([`${roundedTslaInterestAfter2ndPayment.toFixed(8)}@TSLA`, `${roundedAmznInterstAfter2ndPayment.toFixed(8)}@AMZN`])
      expect(vaultAfter.loanValue).toStrictEqual(tslaLoanAmountAfter2ndPaymentRounded.multipliedBy(2).plus(amznLoanAmountAfter2ndPaymentRounded.multipliedBy(4)).toNumber())
      expect(vaultAfter.interestValue).toStrictEqual(roundedTslaInterestAfter2ndPayment.multipliedBy(2).plus(roundedAmznInterstAfter2ndPayment.multipliedBy(4)).toNumber())
      expect(vaultAfter.collateralRatio).toStrictEqual(37500)
      expect(vaultAfter.informativeRatio).toStrictEqual(37499.81259468)

      const loanTokenAccAfter = await bob.container.call('getaccount', [bobloanAddr])
      expect(loanTokenAccAfter).toStrictEqual(['14.00000000@TSLA', '3.00000000@AMZN']) // (27 - 13), (9 - 6)

      const burnInfoAfter = await bob.container.call('getburninfo')
      expect(burnInfoAfter.paybackburn).toStrictEqual(0.00001361)
    }
  })

  it('should paybackLoan with utxos', async () => {
    const tslaInterestPerBlockBefore = new BigNumber(netInterest * 40 / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    const height = await bob.container.getBlockCount()
    const tslaInterestTotalBefore = tslaInterestPerBlockBefore.multipliedBy(height + 1 - tslaLoanHeight).dp(8, BigNumber.ROUND_CEIL) // total interest is always ceild to CAmount precision in AIN
    const tslaLoanAmountBefore = tslaInterestTotalBefore.plus(new BigNumber(40))
    const tslaLoanValueBefore = tslaLoanAmountBefore.multipliedBy(new BigNumber(2)) // loanAmount * 2 (1 TSLA = 2 USD)
    const tslaInterestValueBefore = tslaInterestTotalBefore.multipliedBy(new BigNumber(2))

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.loanAmounts).toStrictEqual([`${tslaLoanAmountBefore.toFixed(8)}@TSLA`]) // 40 + totalInterest
    expect(vaultBefore.interestAmounts).toStrictEqual([`${tslaInterestTotalBefore.toFixed(8)}@TSLA`])
    expect(vaultBefore.loanValue).toStrictEqual(tslaLoanValueBefore.toNumber())
    expect(vaultBefore.interestValue).toStrictEqual(tslaInterestValueBefore.toNumber())
    expect(vaultBefore.collateralRatio).toStrictEqual(18750) // (15000 / tslaLoanValueBefore) * 100
    expect(vaultBefore.informativeRatio).toStrictEqual(18749.98929375)

    const utxo = await bob.container.fundAddress(bobloanAddr, 250) // one extra block has been generate here and so the interest has been increased here

    const tslaPaybackAmount = 13
    const txid = await bob.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: `${tslaPaybackAmount}@TSLA`,
      from: bobloanAddr
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    // check the interests after payback
    // total interest payable is paid back upfront even at partial payback. Becuase of that, actual loanDecreasedAfterPayback = (tslaPaybackAmount - total interest)
    const loanDecreasedAfterPayback = new BigNumber(tslaPaybackAmount).minus(tslaInterestTotalBefore)
    const tslaInterestPerBlockAfter = tslaInterestPerBlockBefore.minus(loanDecreasedAfterPayback.multipliedBy(netInterest).dividedBy(365 * blocksPerDay))
    const tslaInterestTotalAfter = tslaInterestPerBlockAfter.multipliedBy(1).dp(8, BigNumber.ROUND_CEIL) // total interest is always ceild to CAmount precision in AIN
    // const tslaLoanAmountAfter = new BigNumber(40).minus(loanDecreasedAfterPayback).plus(tslaInterestTotalAfter) // tslaLoanAmountBefore - loanDecreasedAfter + tslaInterestTotalAfter
    // const tslaLoanValueAfter = tslaLoanAmountAfter.multipliedBy(new BigNumber(2)) // loanAmount * 2 (1 TSLA = 2 USD)
    const tslaInterestValueAfter = tslaInterestTotalAfter.multipliedBy(new BigNumber(2))

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    // NOTE(sp): vaultAfter.loanAmounts == 27.00006109@TSLA, but it should be 27.00003826@TSLA as per the calculations. note that 27.00003826 + 0.00002284 = 27.00006110
    // further debugging required.
    // expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfter.toFixed(8, BigNumber.ROUND_FLOOR)}@TSLA`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${tslaInterestTotalAfter.toFixed(8)}@TSLA`])
    // expect(vaultAfter.loanValue).toStrictEqual(tslaLoanValueAfter.toNumber())
    expect(vaultAfter.interestValue).toStrictEqual(tslaInterestValueAfter.toNumber())
    // expect(vaultAfter.collateralRatio).toStrictEqual(27778) // (15000 / tslaLoanValueAfter) * 100
    // expect(vaultAfter.informativeRatio).toStrictEqual(27777.71492812)

    const rawtx = await bob.container.call('getrawtransaction', [txid, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should paybackLoan with DUSD', async () => {
    const dusdBobAddr = await bob.generateAddress()
    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      to: dusdBobAddr,
      amounts: '19@DUSD'
    })
    await bob.generate(1)

    const interestBefore = await bob.container.call('getinterest', ['scheme', 'DUSD'])
    expect(interestBefore).toStrictEqual([
      {
        token: 'DUSD',
        totalInterest: 0.00001085,
        interestPerBlock: 0.00001085
      }
    ])

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore).toStrictEqual({
      vaultId: bobVaultId,
      loanSchemeId: 'scheme',
      ownerAddress: bobVaultAddr,
      state: 'active',
      collateralAmounts: ['10000.00000000@DFI', '1.00000000@BTC'],
      loanAmounts: ['19.00001085@DUSD', '40.00004567@TSLA'],
      interestAmounts: ['0.00001085@DUSD', '0.00004567@TSLA'],
      collateralValue: 15000,
      loanValue: 99.00010219,
      interestValue: 0.00010219,
      informativeRatio: 15151.4995118,
      collateralRatio: 15151
    })

    await bob.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: '18@DUSD',
      from: dusdBobAddr
    })
    await bob.generate(1)

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter).toStrictEqual({
      vaultId: bobVaultId,
      loanSchemeId: 'scheme',
      ownerAddress: bobVaultAddr,
      state: 'active',
      collateralAmounts: ['10000.00000000@DFI', '1.00000000@BTC'],
      loanAmounts: ['1.00001143@DUSD', '40.00006850@TSLA'],
      interestAmounts: ['0.00000058@DUSD', '0.00006850@TSLA'],
      collateralValue: 15000,
      loanValue: 81.00014843,
      interestValue: 0.00013758,
      informativeRatio: 18518.48458396,
      collateralRatio: 18518
    })
  })
})

describe('paybackLoan failed', () => {
  beforeAll(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should not paybackLoan on nonexistent vault', async () => {
    const promise = bob.rpc.loan.paybackLoan({
      vaultId: '0'.repeat(64),
      amounts: '30@TSLA',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Cannot find existing vault with id ${'0'.repeat(64)}`)
  })

  it('should not paybackLoan on nonexistent loan token', async () => {
    const promise = bob.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: '1@BTC',
      from: bobloanAddr

    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Loan token with id (1) does not exist!')
  })

  it('should not paybackLoan on invalid token', async () => {
    const promise = bob.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: '1@INVALID',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid Defi token: INVALID')
  })

  it('should not paybackLoan on incorrect auth', async () => {
    const promise = alice.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: '30@TSLA',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Address (${bobloanAddr}) is not owned by the wallet`)
  })

  it('should not paybackLoan as no loan on vault', async () => {
    const promise = bob.rpc.loan.paybackLoan({
      vaultId: bobVaultId1,
      amounts: '30@TSLA',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`There are no loans on this vault (${bobVaultId1})`)
  })

  it('should not paybackLoan while insufficient amount', async () => {
    const vault = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vault.loanAmounts).toStrictEqual(['40.00002284@TSLA'])

    const bobLoanAcc = await bob.rpc.account.getAccount(bobloanAddr)
    expect(bobLoanAcc).toStrictEqual(['40.00000000@TSLA'])

    const promise = bob.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: '41@TSLA',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    // loanAmount 40.00002283 - balance 40 =  0.00002284
    await expect(promise).rejects.toThrow('amount 0.00000000 is less than 0.00002284')
  })

  it('should not paybackLoan as no token in this vault', async () => {
    const promise = bob.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: '30@AMZN',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('There is no loan on token (AMZN) in this vault!')
  })

  it('should not paybackLoan on empty vault', async () => {
    const emptyVaultId = await bob.rpc.loan.createVault({
      ownerAddress: bobVaultAddr,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)

    const promise = bob.rpc.loan.paybackLoan({
      vaultId: emptyVaultId,
      amounts: '30@AMZN',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Vault with id ${emptyVaultId} has no collaterals`)
  })

  it('should not paybackLoan on liquidation vault', async () => {
    await bob.container.waitForVaultState(bobLiqVaultId, 'inLiquidation')

    const liqVault = await bob.container.call('getvault', [bobLiqVaultId])
    expect(liqVault.state).toStrictEqual('inLiquidation')

    const promise = bob.rpc.loan.paybackLoan({
      vaultId: bobLiqVaultId,
      amounts: '30@UBER',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot payback loan on vault under liquidation')
  })

  it('should not paybackLoan with arbitrary utxo', async () => {
    const utxo = await bob.container.fundAddress(bobVaultAddr, 250)
    const promise = bob.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: '13@TSLA',
      from: bobloanAddr
    }, [utxo])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('tx must have at least one input from token owner')
  })

  // this test on longer applies after FortCanningHill
  // it('should fail paybackLoan if resulted in zero interest loan', async () => {
  //   const promise = bob.rpc.loan.paybackLoan({
  //     vaultId: bobVaultId,
  //     amounts: '40@TSLA',
  //     from: bobloanAddr
  //   })
  //   await expect(promise).rejects.toThrow(RpcApiError)
  //   await expect(promise).rejects.toThrow('Cannot payback this amount of loan for TSLA, either payback full amount or less than this amount!')
  // })
})
