import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { RegTest, RegTestFoundationKeys, RegTestGenesisKeys } from '@defichain/jellyfish-network'
import { P2WPKH } from '@defichain/jellyfish-address'
import { Script } from '@defichain/jellyfish-transaction'
import { VaultActive } from '@defichain/jellyfish-api-core/src/category/loan'
import { BalanceTransferPayload } from 'packages/jellyfish-api-core/src/category/account'

const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(RegTestGenesisKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)
let bobColScript: Script
let bobColAddr: string
let bobVaultId: string
let bobVaultId1: string
let bobVaultAddr: string
let bobVaultAddr1: string
let bobLiqVaultId: string
let bobloanAddr: string
let tslaLoanHeight: number
let aliceColAddr: string
let aProviders: MockProviders
let aBuilder: P2WPKHTransactionBuilder
let bProviders: MockProviders
let bBuilder: P2WPKHTransactionBuilder
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
  aliceColAddr = await aProviders.getAddress()
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

  // setLoanToken DUSD
  await alice.rpc.loan.setLoanToken({
    symbol: 'DUSD',
    fixedIntervalPriceId: 'DUSD/USD'
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

  bobColAddr = await bProviders.getAddress()
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

  bobloanAddr = await bProviders.getAddress()
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

    aProviders = await getProviders(alice.container)
    aProviders.setEllipticPair(WIF.asEllipticPair(RegTestGenesisKeys[0].owner.privKey))
    aBuilder = new P2WPKHTransactionBuilder(aProviders.fee, aProviders.prevout, aProviders.elliptic, RegTest)

    bProviders = await getProviders(bob.container)
    bProviders.setEllipticPair(WIF.asEllipticPair(RegTestGenesisKeys[1].owner.privKey))
    bBuilder = new P2WPKHTransactionBuilder(bProviders.fee, bProviders.prevout, bProviders.elliptic, RegTest)

    await setup()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  it('should paybackLoan', async () => {
    await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['5@TSLA'] })
    await alice.generate(1)
    await tGroup.waitForSync()

    const interests = await bob.rpc.loan.getInterest('scheme')
    const height = await bob.container.getBlockCount()
    const tslaInterestPerBlock = new BigNumber((netInterest * 40) / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(height - tslaLoanHeight + 1)
    expect(interests[0].interestPerBlock.toFixed(8)).toStrictEqual(tslaInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL))
    expect(interests[0].totalInterest.toFixed(8)).toStrictEqual(tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL))

    const tslaLoanAmountBefore = new BigNumber(40).plus(tslaInterestTotal).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const tslaLoanValueBefore = tslaLoanAmountBefore.multipliedBy(2)

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.loanAmounts).toStrictEqual([`${tslaLoanAmountBefore.toFixed(8)}@TSLA`])
    expect(vaultBefore.loanValue).toStrictEqual(tslaLoanValueBefore.toNumber())
    expect(vaultBefore.interestAmounts).toStrictEqual([`${tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`])
    expect(vaultBefore.interestValue).toStrictEqual(tslaInterestTotal.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2).toNumber())
    expect(vaultBefore.collateralRatio).toStrictEqual(18750)
    expect(vaultBefore.informativeRatio).toStrictEqual(18749.97859221)

    const bobColAccBefore = await bob.rpc.account.getAccount(bobColAddr)
    expect(bobColAccBefore).toStrictEqual(['45.00000000@TSLA'])

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txn = await bBuilder.loans.paybackLoan({
      vaultId: bobVaultId,
      from: bobColScript,
      tokenAmounts: [{ token: 2, amount: new BigNumber(45) }] // try pay over loan amount
    }, bobColScript)

    // Ensure the created txn is correct
    const outs = await sendTransaction(bob.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await bProviders.getAddress())

    // Ensure you don't send all your balance away
    const prevouts = await bProviders.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    await bob.generate(1)

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmounts).toStrictEqual([])
    expect(vaultAfter.interestAmounts).toStrictEqual([])
    expect(vaultAfter.interestValue).toStrictEqual(0)
    expect(vaultAfter.loanValue).toStrictEqual(0)
    expect(vaultAfter.collateralRatio).toStrictEqual(-1)
    expect(vaultAfter.informativeRatio).toStrictEqual(-1)

    const bobColAccAfter = await bob.rpc.account.getAccount(bobColAddr)
    expect(bobColAccAfter).toStrictEqual(['4.99990867@TSLA'])
  })

  it('should paybackLoan partially', async () => {
    const burnInfoBefore = await bob.container.call('getburninfo')
    expect(burnInfoBefore.paybackburn).toStrictEqual([])

    const bobColAccBefore = await bob.container.call('getaccount', [bobColAddr])
    expect(bobColAccBefore).toStrictEqual(['40.00000000@TSLA'])

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const tslaInterestsPerBlockBefore = new BigNumber(netInterest * 40 / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    const interestsBeforePayback = await bob.rpc.loan.getInterest('scheme')

    const height = await bob.container.getBlockCount()
    const tslaInterestTotal = tslaInterestsPerBlockBefore.multipliedBy(height - tslaLoanHeight + 1)
    expect(interestsBeforePayback[0].interestPerBlock.toFixed(8)).toStrictEqual(tslaInterestsPerBlockBefore.toFixed(8, BigNumber.ROUND_CEIL))
    expect(interestsBeforePayback[0].totalInterest.toFixed(8)).toStrictEqual(tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL))

    const tslaLoanAmountBefore = new BigNumber(40).plus(tslaInterestTotal).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const tslaLoanValueBefore = tslaLoanAmountBefore.multipliedBy(2)
    const tslaInterestValueBefore = tslaInterestTotal.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2)

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.collateralValue).toStrictEqual(15000) // DFI(10000) + BTC(1 * 10000 * 0.5)
    expect(vaultBefore.loanAmounts).toStrictEqual([`${tslaLoanAmountBefore.toFixed(8)}@TSLA`]) // 40 + totalInterest
    expect(vaultBefore.interestAmounts).toStrictEqual([`${tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`])
    expect(vaultBefore.loanValue).toStrictEqual(tslaLoanValueBefore.toNumber()) // loanAmount * 2 (::1 TSLA = 2 USD)
    expect(vaultBefore.interestValue).toStrictEqual(tslaInterestValueBefore.toNumber())
    expect(vaultBefore.collateralRatio).toStrictEqual(18750)
    expect(vaultBefore.informativeRatio).toStrictEqual(18749.96789067) // 15000 / 80.00004568 * 100

    const txn = await bBuilder.loans.paybackLoan({
      vaultId: bobVaultId,
      from: bobColScript,
      tokenAmounts: [{ token: 2, amount: new BigNumber(13) }]
    }, bobColScript)

    // Ensure the created txn is correct
    const outs = await sendTransaction(bob.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await bProviders.getAddress())

    // Ensure you don't send all your balance away
    const prevouts = await bProviders.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    await bob.generate(1)

    const bobColAccAfter = await bob.container.call('getaccount', [bobColAddr])
    expect(bobColAccAfter).toStrictEqual(['27.00000000@TSLA']) // 40 - 13 = 27

    const loanDecreasedAfterPayback = new BigNumber(13).minus(tslaInterestTotal.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const tslaInterestsPerBlockAfter = new BigNumber(40).minus(loanDecreasedAfterPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)

    const interestAmountAfter = tslaInterestsPerBlockAfter.multipliedBy(2)
    const loanAmountAfter = tslaLoanAmountBefore.minus(13).plus(tslaInterestsPerBlockAfter.multipliedBy(2).decimalPlaces(8, BigNumber.ROUND_CEIL)) // 2 blocks have been generated after payback loan
    const loanValueAfter = loanAmountAfter.multipliedBy(2)
    const interestValueAfter = interestAmountAfter.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2)

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmounts).toStrictEqual([`${loanAmountAfter.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${interestAmountAfter.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`])
    expect(vaultAfter.loanValue).toStrictEqual(loanValueAfter.toNumber())
    expect(vaultAfter.interestValue).toStrictEqual(interestValueAfter.toNumber())
    expect(vaultAfter.collateralRatio).toStrictEqual(27778) // 15000 / 54.00009934 * 100
    expect(vaultAfter.informativeRatio).toStrictEqual(27777.67558679)

    const burnInfoAfter = await bob.container.call('getburninfo')
    expect(burnInfoAfter.paybackburn).toStrictEqual(['0.00001369@DFI'])
  })

  it('should paybackLoan by anyone', async () => {
    const loanAccBefore = await bob.container.call('getaccount', [aliceColAddr])
    expect(loanAccBefore).toStrictEqual([
      '4900.00000000@DFI', '9999.00000000@BTC', '100.00000000@TSLA', '400.00000000@UBER', '550.00000000@DUSD'
    ])

    await fundEllipticPair(alice.container, aProviders.ellipticPair, 10)
    const aliceColScript = P2WPKH.fromAddress(RegTest, aliceColAddr, P2WPKH).getScript()

    const tslaInterestsPerBlockBefore = new BigNumber(netInterest * 40 / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    const interestsBeforePayback = await bob.rpc.loan.getInterest('scheme')

    const height = await bob.container.getBlockCount()
    const tslaInterestTotal = tslaInterestsPerBlockBefore.multipliedBy(height - tslaLoanHeight + 1)
    expect(interestsBeforePayback[0].interestPerBlock.toFixed(8)).toStrictEqual(tslaInterestsPerBlockBefore.toFixed(8, BigNumber.ROUND_CEIL))
    expect(interestsBeforePayback[0].totalInterest.toFixed(8)).toStrictEqual(tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL))

    const tslaLoanAmountBefore = new BigNumber(40).plus(tslaInterestTotal).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const tslaLoanValueBefore = tslaLoanAmountBefore.multipliedBy(2)
    const tslaInterestValueBefore = tslaInterestTotal.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2)

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.collateralValue).toStrictEqual(15000) // DFI(10000) + BTC(1 * 10000 * 0.5)
    expect(vaultBefore.loanAmounts).toStrictEqual([`${tslaLoanAmountBefore.toFixed(8)}@TSLA`]) // 40 + totalInterest
    expect(vaultBefore.interestAmounts).toStrictEqual([`${tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`])
    expect(vaultBefore.loanValue).toStrictEqual(tslaLoanValueBefore.toNumber()) // loanAmount * 2 (::1 TSLA = 2 USD)
    expect(vaultBefore.interestValue).toStrictEqual(tslaInterestValueBefore.toNumber())
    expect(vaultBefore.collateralRatio).toStrictEqual(18750) // 15000 / 80.00004568 * 100
    expect(vaultBefore.informativeRatio).toStrictEqual(18749.96789067)

    const txn = await aBuilder.loans.paybackLoan({
      vaultId: bobVaultId,
      from: aliceColScript,
      tokenAmounts: [{ token: 2, amount: new BigNumber(13) }]
    }, aliceColScript)

    // Ensure the created txn is correct
    const outs = await sendTransaction(alice.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await aProviders.getAddress())

    // Ensure you don't send all your balance away
    const prevouts = await aProviders.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)
    await alice.generate(1)

    const loanAccAfter = await bob.container.call('getaccount', [aliceColAddr])
    expect(loanAccAfter).toStrictEqual([
      '4900.00000000@DFI', '9999.00000000@BTC', '87.00000000@TSLA', '400.00000000@UBER', '550.00000000@DUSD'
    ])

    const loanDecreasedAfterPayback = new BigNumber(13).minus(tslaInterestTotal.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const tslaInterestsPerBlockAfter = new BigNumber(40).minus(loanDecreasedAfterPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)

    const interestAmountAfter = tslaInterestsPerBlockAfter.multipliedBy(2)
    const loanAmountAfter = tslaLoanAmountBefore.minus(13).plus(tslaInterestsPerBlockAfter.multipliedBy(2).decimalPlaces(8, BigNumber.ROUND_CEIL)) // 2 blocks have been generated after payback loan
    const loanValueAfter = loanAmountAfter.multipliedBy(2)
    const interestValueAfter = interestAmountAfter.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2)

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmounts).toStrictEqual([`${loanAmountAfter.toFixed(8)}@TSLA`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${interestAmountAfter.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`])
    expect(vaultAfter.loanValue).toStrictEqual(loanValueAfter.toNumber())
    expect(vaultAfter.interestValue).toStrictEqual(interestValueAfter.toNumber())
    expect(vaultAfter.collateralRatio).toStrictEqual(27778) // 15000 / 54.00019868 * 100
    expect(vaultAfter.informativeRatio).toStrictEqual(27777.67558679)
  })

  it('should paybackLoan more than one amount', async () => {
    const burnInfoBefore = await bob.container.call('getburninfo')
    expect(burnInfoBefore.paybackburn).toStrictEqual([])

    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: ['15@AMZN'],
      to: bobColAddr
    })
    const amznLoanHeight = await bob.container.getBlockCount()
    await bob.generate(1)

    const loanTokenAccBefore = await bob.container.call('getaccount', [bobColAddr])
    expect(loanTokenAccBefore).toStrictEqual(['40.00000000@TSLA', '15.00000000@AMZN'])

    // first paybackLoan
    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScriptBefore = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const blockHeightBefore = await bob.container.getBlockCount()

    const tslaTokenAmt = loanTokenAccBefore.find((amt: string) => amt.split('@')[1] === 'TSLA')
    const tslaAmt = Number(tslaTokenAmt.split('@')[0])
    const amznTokenAmt = loanTokenAccBefore.find((amt: string) => amt.split('@')[1] === 'AMZN')
    const amznAmt = Number(amznTokenAmt.split('@')[0])

    // tsla interest
    const tslaInterestPerBlockBefore = new BigNumber(netInterest * tslaAmt / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    const tslaTotalInterestBefore = tslaInterestPerBlockBefore.multipliedBy(blockHeightBefore - tslaLoanHeight + 1)

    // amzn interest
    const amznInterestPerBlockBefore = new BigNumber(netInterest * amznAmt / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    const amznTotalInterestBefore = amznInterestPerBlockBefore.multipliedBy(blockHeightBefore - amznLoanHeight)

    const interestsBefore = await bob.rpc.loan.getInterest('scheme')

    const tslaLoanAmount = 40
    const amznLoanAmount = 15

    const tslaInterest = interestsBefore.find(i => i.token === 'TSLA')
    const tslaTotalInt = tslaInterest?.totalInterest.toFixed(8)
    expect(tslaTotalInt).toStrictEqual(tslaTotalInterestBefore.toFixed(8, BigNumber.ROUND_CEIL))
    const tslaInterestPerBlk = tslaInterest?.interestPerBlock.toFixed(8)
    expect(tslaInterestPerBlk).toStrictEqual(tslaInterestPerBlockBefore.toFixed(8, BigNumber.ROUND_CEIL))
    const tslaLoanAmountBefore = new BigNumber(tslaLoanAmount).plus(tslaTotalInterestBefore).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const tslaLoanValueBefore = tslaLoanAmountBefore.multipliedBy(2)
    const tslaInterestValueBefore = tslaTotalInterestBefore.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2)

    const amzInterest = interestsBefore.find(i => i.token === 'AMZN')
    const amzTotalInt = amzInterest?.totalInterest.toFixed(8)
    expect(amzTotalInt).toStrictEqual(amznTotalInterestBefore.toFixed(8, BigNumber.ROUND_CEIL))
    const amzInterestPerBlk = amzInterest?.interestPerBlock.toFixed(8)
    expect(amzInterestPerBlk).toStrictEqual(amznInterestPerBlockBefore.toFixed(8, BigNumber.ROUND_CEIL))
    const amznLoanAmountBefore = new BigNumber(amznLoanAmount).plus(amznTotalInterestBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const amznLoanValueBefore = amznLoanAmountBefore.multipliedBy(4)
    const amznInterestValueBefore = amznTotalInterestBefore.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(4)

    const totalLoanValueBefore = tslaLoanValueBefore.plus(amznLoanValueBefore)
    const totalInterestValueBefore = tslaInterestValueBefore.plus(amznInterestValueBefore)

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.loanAmounts).toStrictEqual([`${tslaLoanAmountBefore.toFixed(8)}@TSLA`, `${amznLoanAmountBefore.toFixed(8)}@AMZN`]) // eg: tslaTakeLoanAmt + tslaTotalInterest
    expect(vaultBefore.interestAmounts).toStrictEqual([`${tslaTotalInterestBefore.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`, `${amznTotalInterestBefore.toFixed(8, BigNumber.ROUND_CEIL)}@AMZN`])
    expect(vaultBefore.loanValue).toStrictEqual(totalLoanValueBefore.toNumber()) // (40.00004568 * 2) + (15.00000857 * 4)
    expect(vaultBefore.interestValue).toStrictEqual(totalInterestValueBefore.toNumber())
    expect(vaultBefore.collateralRatio).toStrictEqual(10714) // 15000 / 140.00012564 * 100
    expect(vaultBefore.informativeRatio).toStrictEqual(10714.26387096)

    const tslaPaybackAmount = 13
    const amznPaybackAmount = 6

    const txn = await bBuilder.loans.paybackLoan({
      vaultId: bobVaultId,
      from: bobColScriptBefore,
      tokenAmounts: [{ token: 2, amount: new BigNumber(tslaPaybackAmount) }, { token: 3, amount: new BigNumber(amznPaybackAmount) }]
    }, bobColScriptBefore)

    // Ensure the created txn is correct
    const outs = await sendTransaction(bob.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await bProviders.getAddress())

    // Ensure you don't send all your balance away
    const prevoutsBefore = await bProviders.prevout.all()
    expect(prevoutsBefore.length).toStrictEqual(1)
    expect(prevoutsBefore[0].value.toNumber()).toBeLessThan(10)
    expect(prevoutsBefore[0].value.toNumber()).toBeGreaterThan(9.999)

    await bob.generate(1)

    const tslaLoanDecreasedAfterFirstPayback = new BigNumber(tslaPaybackAmount).minus(tslaTotalInterestBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const tslaInterestPerBlockFirstPayback = new BigNumber(tslaAmt).minus(tslaLoanDecreasedAfterFirstPayback).multipliedBy(new BigNumber(netInterest)).dividedBy(new BigNumber(365 * blocksPerDay))
    const tslaInterestAmountAfterFirstPayback = tslaInterestPerBlockFirstPayback.multipliedBy(2)
    const tslaLoanRemaining = new BigNumber(tslaLoanAmount).minus(tslaLoanDecreasedAfterFirstPayback)
    const tslaLoanAmountAfterFirstPayback = tslaLoanRemaining.plus(tslaInterestAmountAfterFirstPayback.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const tslaLoanValueAfterFirstPayback = tslaLoanAmountAfterFirstPayback.multipliedBy(2)
    const tslaInterestValueAfterFirstPayback = tslaInterestAmountAfterFirstPayback.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2)

    const amznLoanDecreasedAfterFirstPayback = new BigNumber(amznPaybackAmount).minus(amznTotalInterestBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const amznInterestPerBlockFirstPayback = new BigNumber(amznAmt).minus(amznLoanDecreasedAfterFirstPayback).multipliedBy(new BigNumber(netInterest)).dividedBy(new BigNumber(365 * blocksPerDay))
    const amznInterestAmountAfterFirstPayback = amznInterestPerBlockFirstPayback.multipliedBy(2)
    const amznLoanRemaining = new BigNumber(amznLoanAmount).minus(amznLoanDecreasedAfterFirstPayback)
    const amznLoanAmountAfterFirstPayback = amznLoanRemaining.plus(amznInterestAmountAfterFirstPayback.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const amznLoanValueAfterFirstPayback = amznLoanAmountAfterFirstPayback.multipliedBy(4)
    const amznInterestValueAfterFirstPayback = amznInterestAmountAfterFirstPayback.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(4)

    const totalLoanValueAfterFirstPayback = tslaLoanValueAfterFirstPayback.plus(amznLoanValueAfterFirstPayback)
    const totalInterestValueAfterFirstPayback = tslaInterestValueAfterFirstPayback.plus(amznInterestValueAfterFirstPayback)

    const vaultAfterFirstPayback = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfterFirstPayback.loanAmounts).toStrictEqual([`${tslaLoanAmountAfterFirstPayback.toFixed(8)}@TSLA`, `${amznLoanAmountAfterFirstPayback.toFixed(8)}@AMZN`])
    expect(vaultAfterFirstPayback.interestAmounts).toStrictEqual([`${tslaInterestAmountAfterFirstPayback.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`, `${amznInterestAmountAfterFirstPayback.toFixed(8, BigNumber.ROUND_CEIL)}@AMZN`])
    expect(vaultAfterFirstPayback.loanValue).toStrictEqual(totalLoanValueAfterFirstPayback.toNumber())
    expect(vaultAfterFirstPayback.interestValue).toStrictEqual(totalInterestValueAfterFirstPayback.toNumber())
    expect(vaultAfterFirstPayback.collateralRatio).toStrictEqual(16667)
    expect(vaultAfterFirstPayback.informativeRatio).toStrictEqual(16666.59477808)

    const loanTokenAccAfterFirstPayback = await bob.container.call('getaccount', [bobColAddr])
    expect(loanTokenAccAfterFirstPayback).toStrictEqual(['27.00000000@TSLA', '9.00000000@AMZN'])

    const burnInfoAfterFirstPayback = await bob.container.call('getburninfo')
    expect(burnInfoAfterFirstPayback.paybackburn).toStrictEqual(['0.00002082@DFI'])

    // second paybackLoan
    const bobColScriptAfter = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const txnAfter = await bBuilder.loans.paybackLoan({
      vaultId: bobVaultId,
      from: bobColScriptAfter,
      tokenAmounts: [{ token: 2, amount: new BigNumber(tslaPaybackAmount) }, { token: 3, amount: new BigNumber(amznPaybackAmount) }]
    }, bobColScriptAfter)

    // Ensure the created txn is correct
    const outsAfter = await sendTransaction(bob.container, txnAfter)
    expect(outsAfter[0].value).toStrictEqual(0)
    expect(outsAfter[1].value).toBeLessThan(10)
    expect(outsAfter[1].value).toBeGreaterThan(9.999)
    expect(outsAfter[1].scriptPubKey.addresses[0]).toStrictEqual(await bProviders.getAddress())

    // Ensure you don't send all your balance away
    const prevoutsAfter = await bProviders.prevout.all()
    expect(prevoutsAfter.length).toStrictEqual(1)
    expect(prevoutsAfter[0].value.toNumber()).toBeLessThan(10)
    expect(prevoutsAfter[0].value.toNumber()).toBeGreaterThan(9.999)

    const interestsAfterSecondPayback = await bob.rpc.loan.getInterest('scheme')

    const tslaLoanDecreasedAfterSecondPayback = new BigNumber(tslaPaybackAmount).minus(tslaInterestAmountAfterFirstPayback.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const tslaInterestPerBlockAfterSecondPayback = tslaLoanRemaining.minus(tslaLoanDecreasedAfterSecondPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)

    const amznLoanDecreasedAfterSecondPayback = new BigNumber(amznPaybackAmount).minus(amznInterestAmountAfterFirstPayback.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const amznInterestPerBlockAfterSecondPayback = amznLoanRemaining.minus(amznLoanDecreasedAfterSecondPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)

    const tslaInterestAfter = interestsAfterSecondPayback.find(i => i.token === 'TSLA')
    const tslaTotalInterestAfter = tslaInterestAfter?.totalInterest.toFixed(8)
    expect(tslaTotalInterestAfter).toStrictEqual(`${tslaInterestPerBlockAfterSecondPayback.toFixed(8, BigNumber.ROUND_CEIL)}`)
    const tslaInterestPerBlkAfter = tslaInterestAfter?.interestPerBlock.toFixed(8)
    expect(tslaInterestPerBlkAfter).toStrictEqual(`${tslaInterestPerBlockAfterSecondPayback.toFixed(8, BigNumber.ROUND_CEIL)}`)
    const tslaInterestAmountAfterSecondPayback = tslaInterestPerBlockAfterSecondPayback.multipliedBy(1).decimalPlaces(8, BigNumber.ROUND_CEIL)

    const amzInterestAfter = interestsAfterSecondPayback.find(i => i.token === 'AMZN')
    const amzTotalInterestAfter = amzInterestAfter?.totalInterest.toFixed(8)
    expect(amzTotalInterestAfter).toStrictEqual(`${amznInterestPerBlockAfterSecondPayback.toFixed(8, BigNumber.ROUND_CEIL)}`)
    const amzInterestPerBlkAfter = amzInterestAfter?.interestPerBlock.toFixed(8)
    expect(amzInterestPerBlkAfter).toStrictEqual(`${amznInterestPerBlockAfterSecondPayback.toFixed(8, BigNumber.ROUND_CEIL)}`)
    const amznInterestAmountAfterSecondPayback = amznInterestPerBlockAfterSecondPayback.multipliedBy(1).decimalPlaces(8, BigNumber.ROUND_CEIL)

    const tslaLoanAmountAfterSecondPayback = tslaLoanAmountAfterFirstPayback.minus(new BigNumber(tslaPaybackAmount)).plus(tslaInterestAmountAfterSecondPayback.decimalPlaces(8, BigNumber.ROUND_CEIL)) // no need to round as the number is dp is aldy correct
    const tslaLoanValueAfterSecondPayback = tslaLoanAmountAfterSecondPayback.multipliedBy(2)
    const tslaInterestValueAfterSecondPayback = tslaInterestAmountAfterSecondPayback.multipliedBy(2)

    const amznLoanAmountAfterSecondPayback = amznLoanAmountAfterFirstPayback.minus(new BigNumber(amznPaybackAmount)).plus(amznInterestAmountAfterSecondPayback.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const amznLoanValueAfterSecondPayback = amznLoanAmountAfterSecondPayback.multipliedBy(4)
    const amznInterestValueAfterSecondPayback = amznInterestAmountAfterSecondPayback.multipliedBy(4)

    const totalLoanValueAfterSecondPayback = tslaLoanValueAfterSecondPayback.plus(amznLoanValueAfterSecondPayback)
    const totalInterstValueAfterSecondPayback = tslaInterestValueAfterSecondPayback.plus(amznInterestValueAfterSecondPayback)

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfterSecondPayback.toFixed(8)}@TSLA`, `${amznLoanAmountAfterSecondPayback.toFixed(8)}@AMZN`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${tslaInterestAmountAfterSecondPayback.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`, `${amznInterestAmountAfterSecondPayback.toFixed(8, BigNumber.ROUND_CEIL)}@AMZN`])
    expect(vaultAfter.loanValue).toStrictEqual(totalLoanValueAfterSecondPayback.toNumber())
    expect(vaultAfter.interestValue).toStrictEqual(totalInterstValueAfterSecondPayback.toNumber())
    expect(vaultAfter.collateralRatio).toStrictEqual(37500)
    expect(vaultAfter.informativeRatio).toStrictEqual(37499.61461646)

    const loanTokenAccAfterSecondPayback = await bob.container.call('getaccount', [bobColAddr])
    expect(loanTokenAccAfterSecondPayback).toStrictEqual(['14.00000000@TSLA', '3.00000000@AMZN']) // (27 - 13), (9 - 6)

    const burnInfoAfterSecondPayback = await bob.container.call('getburninfo')
    expect(burnInfoAfterSecondPayback.paybackburn).toStrictEqual(['0.00002800@DFI'])
  })
})

describe('paybackLoan failed', () => {
  beforeAll(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()

    aProviders = await getProviders(alice.container)
    aProviders.setEllipticPair(WIF.asEllipticPair(RegTestGenesisKeys[0].owner.privKey))
    aBuilder = new P2WPKHTransactionBuilder(aProviders.fee, aProviders.prevout, aProviders.elliptic, RegTest)

    bProviders = await getProviders(bob.container)
    bProviders.setEllipticPair(WIF.asEllipticPair(RegTestGenesisKeys[1].owner.privKey))
    bBuilder = new P2WPKHTransactionBuilder(bProviders.fee, bProviders.prevout, bProviders.elliptic, RegTest)

    await setup()
  })

  beforeEach(async () => {
    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should not paybackLoan on nonexistent vault', async () => {
    const txn = await bBuilder.loans.paybackLoan({
      vaultId: '0'.repeat(64),
      from: bobColScript,
      tokenAmounts: [{ token: 2, amount: new BigNumber(30) }]
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`Cannot find existing vault with id ${'0'.repeat(64)}`)
  })

  it('should not paybackLoan on nonexistent loan token', async () => {
    const txn = await bBuilder.loans.paybackLoan({
      vaultId: bobVaultId,
      from: bobColScript,
      tokenAmounts: [{ token: 1, amount: new BigNumber(1) }]
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Loan token with id (1) does not exist!')
  })

  it('should not paybackLoan as no loan on vault', async () => {
    const txn = await bBuilder.loans.paybackLoan({
      vaultId: bobVaultId1,
      from: bobColScript,
      tokenAmounts: [{ token: 2, amount: new BigNumber(30) }]
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`There are no loans on this vault (${bobVaultId1})`)
  })

  it('should not paybackLoan as no token in this vault', async () => {
    const txn = await bBuilder.loans.paybackLoan({
      vaultId: bobVaultId,
      from: bobColScript,
      tokenAmounts: [{ token: 3, amount: new BigNumber(30) }]
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('There is no loan on token (AMZN) in this vault!')
  })

  it('should not paybackLoan on empty vault', async () => {
    const emptyVaultId = await bob.rpc.loan.createVault({
      ownerAddress: bobVaultAddr,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)

    const txn = await bBuilder.loans.paybackLoan({
      vaultId: emptyVaultId,
      from: bobColScript,
      tokenAmounts: [{ token: 2, amount: new BigNumber(30) }]
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`Vault with id ${emptyVaultId} has no collaterals`)
  })

  it('should not paybackLoan on liquidation vault', async () => {
    await bob.container.waitForVaultState(bobLiqVaultId, 'inLiquidation')

    const liqVault = await bob.container.call('getvault', [bobLiqVaultId])
    expect(liqVault.state).toStrictEqual('inLiquidation')

    const txn = await bBuilder.loans.paybackLoan({
      vaultId: bobLiqVaultId,
      from: bobColScript,
      tokenAmounts: [{ token: 2, amount: new BigNumber(30) }]
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Cannot payback loan on vault under liquidation')
  })

  it('should not paybackLoan with incorrect auth', async () => {
    await fundEllipticPair(alice.container, aProviders.ellipticPair, 10)

    const txn = await aBuilder.loans.paybackLoan({
      vaultId: bobVaultId,
      from: bobColScript,
      tokenAmounts: [{ token: 2, amount: new BigNumber(30) }]
    }, bobColScript)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('tx must have at least one input from token owner')
  })
})

// move insufficient test case out to another scope for independent testing
describe('paybackLoan failed #2', () => {
  beforeAll(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()

    aProviders = await getProviders(alice.container)
    aProviders.setEllipticPair(WIF.asEllipticPair(RegTestGenesisKeys[0].owner.privKey))
    aBuilder = new P2WPKHTransactionBuilder(aProviders.fee, aProviders.prevout, aProviders.elliptic, RegTest)

    bProviders = await getProviders(bob.container)
    bProviders.setEllipticPair(WIF.asEllipticPair(RegTestGenesisKeys[1].owner.privKey))
    bBuilder = new P2WPKHTransactionBuilder(bProviders.fee, bProviders.prevout, bProviders.elliptic, RegTest)

    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should not paybackLoan while insufficient amount', async () => {
    const vault = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vault.loanAmounts).toStrictEqual(['40.00002284@TSLA'])

    const bobLoanAcc = await bob.rpc.account.getAccount(bobColAddr)
    expect(bobLoanAcc).toStrictEqual(['40.00000000@TSLA'])

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

    const script = await bProviders.elliptic.script()

    const txn = await bBuilder.loans.paybackLoan({
      vaultId: bobVaultId,
      from: bobColScript,
      tokenAmounts: [{ token: 2, amount: new BigNumber(41) }]
    }, script)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'PaybackLoanTx: amount 0.00000000 is less than 0.00006850\', code: -26')
  })
})

describe('paybackLoan for any token', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  const dusdLoanAmount = 50000
  const tslaLoanAmount = 10
  const loanSchemeId = 'scheme'
  const attributeKey = 'ATTRIBUTES'

  let testingProvider: MockProviders
  let testingBuilder: P2WPKHTransactionBuilder
  let vaultId: string
  let tslaVaultId: string
  let vaultOwnerAddress: string
  let tslaTakeLoanBlockHeight: number
  let dusdTakeLoanBlockHeight: number
  let key: string
  let dusdId: string

  async function setupForDUSDLoan (): Promise<void> {
    await testing.token.dfi({ amount: 1000000, address: vaultOwnerAddress })
    await testing.generate(1)

    // setup oracle
    const oracleAddress = await testing.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' },
      { token: 'BTC', currency: 'USD' }
    ]

    const oracleId = await testing.rpc.oracle.appointOracle(oracleAddress, priceFeeds, { weightage: 1 })
    await testing.generate(1)
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1000@TSLA', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DUSD', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1000@BTC', currency: 'USD' }] })
    await testing.generate(1)

    // setup collateral token
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.generate(1)

    // setup loan token
    await testing.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })

    // setup loan scheme
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(3),
      id: loanSchemeId
    })
    await testing.generate(1)

    // create vault
    vaultId = await testing.rpc.loan.createVault({
      ownerAddress: vaultOwnerAddress,
      loanSchemeId: loanSchemeId
    })

    await testing.generate(1)
    await testing.container.waitForPriceValid('DFI/USD')

    // deposite collateral
    await testing.rpc.loan.depositToVault({
      vaultId: vaultId,
      from: vaultOwnerAddress,
      amount: '100000@DFI'
    })
    await testing.generate(1)

    // take DUSD as loan
    await testing.rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: `${dusdLoanAmount}@DUSD`,
      to: vaultOwnerAddress
    })
    await testing.generate(1)
    dusdTakeLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()
  }

  async function setupForTslaLoan (): Promise<void> {
    tslaVaultId = await testing.rpc.loan.createVault({
      ownerAddress: vaultOwnerAddress,
      loanSchemeId: loanSchemeId
    })
    await testing.generate(1)

    await testing.rpc.loan.depositToVault({
      vaultId: tslaVaultId,
      from: vaultOwnerAddress,
      amount: '100000@DFI'
    })
    await testing.generate(1)

    tslaTakeLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()
    await testing.rpc.loan.takeLoan({
      vaultId: tslaVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    await testing.generate(1)
  }

  // this will borrow tesla tokens and will give to you
  async function takeTslaTokensToPayback (): Promise<void> {
    const tokenProviderSchemeId = 'LoanTsla'
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(0.01),
      id: tokenProviderSchemeId
    })
    await testing.container.generate(1)

    const tokenProviderVaultAddress = await testing.generateAddress()
    await testing.token.dfi({ address: tokenProviderVaultAddress, amount: 1000000 })

    const tokenProviderVaultId = await testing.rpc.loan.createVault({
      ownerAddress: tokenProviderVaultAddress,
      loanSchemeId: tokenProviderSchemeId
    })
    await testing.container.generate(1)

    await testing.rpc.loan.depositToVault({
      vaultId: tokenProviderVaultId,
      from: tokenProviderVaultAddress,
      amount: '1000000@DFI'
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId: tokenProviderVaultId,
      amounts: '100@TSLA',
      to: tokenProviderVaultAddress
    })
    await testing.container.generate(1)

    await testing.rpc.account.accountToAccount(tokenProviderVaultAddress, { [vaultOwnerAddress]: '100@TSLA' })
    await testing.container.generate(1)
  }

  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    testingProvider = await getProviders(testing.container)
    testingProvider.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[0].owner.privKey))
    testingBuilder = new P2WPKHTransactionBuilder(testingProvider.fee, testingProvider.prevout, testingProvider.elliptic, RegTest)
    vaultOwnerAddress = await testingProvider.getAddress()

    await setupForDUSDLoan()
    const dusdInfo = await testing.rpc.token.getToken('DUSD')
    dusdId = Object.keys(dusdInfo)[0]
    key = `v0/token/${dusdId}/payback_dfi`
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should be able to payback DUSD loan using DFI after enabled in setGov and repay correctly after penalty rate has changed, TSLA loan unaffected', async () => {
    await testing.rpc.masternode.setGov({ [attributeKey]: { [key]: 'true' } })
    await testing.generate(1)

    // take loan for tsla to ensure it is unaffected
    await testing.rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    await testing.generate(1)
    const tslaTakeLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()

    const blockHeightBefore = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestPerBlock = new BigNumber(netInterest * dusdLoanAmount / (365 * blocksPerDay))
    const dusdInterestAmountBefore = dusdInterestPerBlock.multipliedBy(new BigNumber(blockHeightBefore - dusdTakeLoanBlockHeight + 1))
    const dusdLoanAmountBefore = new BigNumber(dusdLoanAmount).plus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const tslaInterestPerBlock = new BigNumber(netInterest * tslaLoanAmount / (365 * blocksPerDay))
    const tslaInterestAmountBefore = tslaInterestPerBlock.multipliedBy(new BigNumber(blockHeightBefore - tslaTakeLoanBlockHeight + 1))
    const tslaLoanAmountBefore = new BigNumber(tslaLoanAmount).plus(tslaInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultBefore = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${dusdLoanAmountBefore.toFixed(8)}@DUSD`, `${tslaLoanAmountBefore.toFixed(8)}@TSLA`])

    const dfiPaybackAmount = 100
    const burnInfoBefore = await testing.rpc.account.getBurnInfo()
    expect(burnInfoBefore.paybackburn).toStrictEqual([])
    expect(burnInfoBefore.dfipaybackfee).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybacktokens).toStrictEqual([])

    let paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()

    let colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    let script = await testingProvider.elliptic.script()
    let txn = await testingBuilder.loans.paybackLoan({
      vaultId: vaultId,
      from: colScript,
      tokenAmounts: [{ token: 0, amount: new BigNumber(dfiPaybackAmount) }]
    }, script)
    await sendTransaction(testing.container, txn)
    await testing.generate(1)

    // price of dfi to dusd depends on the oracle, in this case 1 DFI = 1 DUSD
    // the default penalty rate is 1%
    const defaultPenaltyRate = 0.01
    let currentBlockHeight = await testing.rpc.blockchain.getBlockCount()
    const dusdPaybackAmount = new BigNumber(dfiPaybackAmount).multipliedBy(1 - defaultPenaltyRate) // dfi amount * (dfi price * penalty rate is %)
    const dusdLoanDecreased = dusdPaybackAmount.minus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const dusdInterestPerBlockAfter = new BigNumber(dusdLoanAmount).minus(dusdLoanDecreased).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    let dusdInterestAmountAfter = dusdInterestPerBlockAfter.multipliedBy(currentBlockHeight - paybackLoanBlockHeight)
    const dusdLoanRemainingAfterFirstPayback = new BigNumber(dusdLoanAmount).minus(dusdLoanDecreased)
    const dusdLoanAmountAfter = dusdLoanRemainingAfterFirstPayback.plus(dusdInterestAmountAfter.decimalPlaces(8, BigNumber.ROUND_CEIL))
    let totalDfiPenalty = new BigNumber(dfiPaybackAmount).multipliedBy(defaultPenaltyRate)
    let totalDusdPaybackAmount = dusdPaybackAmount

    const tslaLoanAmountAfter = new BigNumber(tslaLoanAmount).plus(tslaInterestPerBlock.multipliedBy(currentBlockHeight - tslaTakeLoanBlockHeight + 1).decimalPlaces(8, BigNumber.ROUND_CEIL))

    const burnInfoAfterFirstPayback = await testing.rpc.account.getBurnInfo()
    expect(burnInfoAfterFirstPayback.paybackburn).toStrictEqual([`${totalDusdPaybackAmount.plus(totalDfiPenalty).toFixed(8)}@DFI`])
    expect(burnInfoAfterFirstPayback.dfipaybackfee).toStrictEqual(totalDfiPenalty)
    expect(burnInfoAfterFirstPayback.dfipaybacktokens).toStrictEqual([`${totalDusdPaybackAmount.toFixed(8)}@DUSD`])

    const vaultAfterFirstPayback = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfterFirstPayback.loanAmounts).toStrictEqual([`${dusdLoanAmountAfter.toFixed(8)}@DUSD`, `${tslaLoanAmountAfter.toFixed(8)}@TSLA`])

    // change penalty rate to 10% and payback
    const penaltyRateKey = `v0/token/${dusdId}/payback_dfi_fee_pct`
    const newPenaltyRate = 0.1
    await testing.rpc.masternode.setGov({ [attributeKey]: { [penaltyRateKey]: newPenaltyRate.toString() } })
    await testing.generate(1)

    dusdInterestAmountAfter = dusdInterestAmountAfter.plus(dusdInterestPerBlockAfter) // add interest for one more block

    paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()

    colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    script = await testingProvider.elliptic.script()
    txn = await testingBuilder.loans.paybackLoan({
      vaultId: vaultId,
      from: colScript,
      tokenAmounts: [{ token: 0, amount: new BigNumber(dfiPaybackAmount) }]
    }, script)
    await sendTransaction(testing.container, txn)
    await testing.generate(1)
    await testing.generate(1)

    currentBlockHeight = await testing.rpc.blockchain.getBlockCount()
    const dusdPaybackAmountAfter = new BigNumber(dfiPaybackAmount).multipliedBy(1 - newPenaltyRate)
    const dusdLoanDecreasedAfterSecondPayback = dusdPaybackAmountAfter.minus(dusdInterestAmountAfter.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const dusdInterestPerBlockAfterSecondPayback = dusdLoanRemainingAfterFirstPayback.minus(dusdLoanDecreasedAfterSecondPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    const dusdInterestAmountAfterSecondPayback = dusdInterestPerBlockAfterSecondPayback.multipliedBy(currentBlockHeight - paybackLoanBlockHeight)
    const dusdLoanAmountAfterSecondPayback = dusdLoanRemainingAfterFirstPayback.minus(dusdLoanDecreasedAfterSecondPayback).plus(dusdInterestAmountAfterSecondPayback.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const tslaLoanAmountAfterSecondPayback = new BigNumber(tslaLoanAmount).plus(tslaInterestPerBlock.multipliedBy(currentBlockHeight - tslaTakeLoanBlockHeight + 1).decimalPlaces(8, BigNumber.ROUND_CEIL))

    totalDfiPenalty = totalDfiPenalty.plus(new BigNumber(dfiPaybackAmount).multipliedBy(newPenaltyRate))
    totalDusdPaybackAmount = totalDusdPaybackAmount.plus(dusdPaybackAmountAfter)

    const burnInfoAfterSecondPayback = await testing.rpc.account.getBurnInfo()
    expect(burnInfoAfterSecondPayback.paybackburn).toStrictEqual([`${totalDusdPaybackAmount.plus(totalDfiPenalty).toFixed(8)}@DFI`])
    expect(burnInfoAfterSecondPayback.dfipaybackfee).toStrictEqual(totalDfiPenalty)
    expect(burnInfoAfterSecondPayback.dfipaybacktokens).toStrictEqual([`${totalDusdPaybackAmount.toFixed(8)}@DUSD`])

    const vaultAfterSecondPayback = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfterSecondPayback.loanAmounts).toStrictEqual([`${dusdLoanAmountAfterSecondPayback.toFixed(8)}@DUSD`, `${tslaLoanAmountAfterSecondPayback.toFixed(8)}@TSLA`])
  })

  it('should be able to payback 1 sat of DUSD', async () => {
    await testing.rpc.masternode.setGov({ [attributeKey]: { [key]: 'true' } })
    await testing.generate(1)

    const accountToUtxosPayload: BalanceTransferPayload = {}
    accountToUtxosPayload[vaultOwnerAddress] = '10@DFI'

    await testing.rpc.account.accountToUtxos(vaultOwnerAddress, accountToUtxosPayload)
    await testing.generate(1)

    const vaultOneSatOwnerAddress = await testing.generateAddress()
    const vaultIdOneSat = await testing.rpc.loan.createVault({
      ownerAddress: vaultOneSatOwnerAddress,
      loanSchemeId: loanSchemeId
    })
    await testing.generate(1)

    const burnInfoBefore = await testing.rpc.account.getBurnInfo()
    expect(burnInfoBefore.paybackburn).toStrictEqual([])
    expect(burnInfoBefore.dfipaybackfee).toStrictEqual(new BigNumber(0))

    await testing.rpc.loan.depositToVault({
      vaultId: vaultIdOneSat,
      from: vaultOwnerAddress,
      amount: '100000@DFI'
    })
    await testing.generate(1)

    const accBefore = await testing.rpc.account.getTokenBalances(undefined, undefined, { symbolLookup: true })
    expect(accBefore).toContain('799990.00000000@DFI')

    const oneSat = 0.00000001
    await testing.rpc.loan.takeLoan({
      vaultId: vaultIdOneSat,
      to: vaultOwnerAddress,
      amounts: `${oneSat}@DUSD`
    })
    await testing.generate(1)

    const vaultBefore = await testing.rpc.loan.getVault(vaultIdOneSat) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual(['0.00000002@DUSD'])

    let colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    let script = await testingProvider.elliptic.script()
    let txn = await testingBuilder.loans.paybackLoan({
      vaultId: vaultIdOneSat,
      from: colScript,
      tokenAmounts: [{ token: 0, amount: new BigNumber(oneSat) }]
    }, script)
    await sendTransaction(testing.container, txn)
    await testing.generate(1)

    const accAfterFirstPayback = await testing.rpc.account.getTokenBalances(undefined, undefined, { symbolLookup: true })
    expect(accAfterFirstPayback).toContain('799989.99999999@DFI')

    const burnInfoFirstPayback = await testing.rpc.account.getBurnInfo()
    expect(burnInfoFirstPayback.paybackburn).toStrictEqual([`${oneSat.toFixed(8)}@DFI`])
    expect(burnInfoFirstPayback.dfipaybackfee).toStrictEqual(new BigNumber(0))

    const vaultAfterFirstPayback = await testing.rpc.loan.getVault(vaultIdOneSat) as VaultActive
    expect(vaultAfterFirstPayback.loanAmounts).toStrictEqual(['0.00000002@DUSD'])

    colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    script = await testingProvider.elliptic.script()
    txn = await testingBuilder.loans.paybackLoan({
      vaultId: vaultIdOneSat,
      from: colScript,
      tokenAmounts: [{ token: 0, amount: new BigNumber(0.00000005) }]
    }, script)
    await sendTransaction(testing.container, txn)
    await testing.generate(1)

    const accAfterSecondPayback = await testing.rpc.account.getTokenBalances(undefined, undefined, { symbolLookup: true })
    expect(accAfterSecondPayback).toContain('799989.99999996@DFI')

    const burnInfoAfterSecondPayback = await testing.rpc.account.getBurnInfo()
    expect(burnInfoAfterSecondPayback.paybackburn).toStrictEqual([`${(oneSat * 4).toFixed(8)}@DFI`])
    expect(burnInfoAfterSecondPayback.dfipaybacktokens).toStrictEqual(['0.00000002@DUSD'])

    const vaultAfterSecondPayback = await testing.rpc.loan.getVault(vaultIdOneSat) as VaultActive
    expect(vaultAfterSecondPayback.loanAmounts).toHaveLength(0)
  })

  it('should be able to payback DUSD loan using DFI with excess DFI', async () => {
    await testing.rpc.masternode.setGov({ [attributeKey]: { [key]: 'true' } })
    await testing.generate(1)

    const burnInfoBefore = await testing.rpc.account.getBurnInfo()
    expect(burnInfoBefore.paybackburn).toStrictEqual([])
    expect(burnInfoBefore.dfipaybackfee).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybacktokens).toStrictEqual([])

    const dusdInterestPerBlock = new BigNumber(netInterest * dusdLoanAmount / (365 * blocksPerDay))
    const paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestAmountBefore = dusdInterestPerBlock.multipliedBy(new BigNumber(paybackLoanBlockHeight - dusdTakeLoanBlockHeight + 1))
    const dusdLoanAmountBefore = new BigNumber(dusdLoanAmount).plus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    // calculate how much dfi is required to pay off all dusd at a penalty rate of 1%
    // dfi_needed = loan_amount/(1-(price*penalty_rate))
    const dfiPaybackAmount = dusdLoanAmount + 1000
    const defaultPenaltyRate = 0.01
    const dfiEffectPriceAfterPenaltyRate = 1 * (1 - defaultPenaltyRate)
    let dfiNeededToPayOffDusd = dusdLoanAmountBefore.dividedBy(dfiEffectPriceAfterPenaltyRate)

    if (dfiNeededToPayOffDusd.multipliedBy(dfiEffectPriceAfterPenaltyRate) !== dusdLoanAmountBefore) {
      dfiNeededToPayOffDusd = dfiNeededToPayOffDusd.plus(0.00000001)
    }

    const colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    const script = await testingProvider.elliptic.script()
    const txn = await testingBuilder.loans.paybackLoan({
      vaultId: vaultId,
      from: colScript,
      tokenAmounts: [{ token: 0, amount: new BigNumber(dfiPaybackAmount) }]
    }, script)
    await sendTransaction(testing.container, txn)
    await testing.generate(1)

    const balanceDFIAfter = new BigNumber(900000).minus(dfiNeededToPayOffDusd)
    const accountAfter = await testing.rpc.account.getTokenBalances(undefined, undefined, { symbolLookup: true })
    expect(accountAfter).toContain(`${balanceDFIAfter.toFixed(8)}@DFI`)

    const totalDfiPenalty = dfiNeededToPayOffDusd.multipliedBy(defaultPenaltyRate)
    const totalDusdPaybackAmount = dusdLoanAmountBefore
    const burnInfoAfter = await testing.rpc.account.getBurnInfo()
    expect(burnInfoAfter.paybackburn).toStrictEqual([`${dfiNeededToPayOffDusd.toFixed(8)}@DFI`])
    expect(burnInfoAfter.dfipaybackfee.toFixed(8)).toStrictEqual(totalDfiPenalty.toFixed(8, BigNumber.ROUND_FLOOR))
    expect(burnInfoAfter.dfipaybacktokens).toStrictEqual([`${totalDusdPaybackAmount.toFixed(8)}@DUSD`])

    const vaultAfter = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfter.loanAmounts).toStrictEqual([])
    expect(vaultAfter.interestAmounts).toStrictEqual([])
  })

  it('should be able to payback DUSD loan using DFI - use PaybackLoanMetadataV2', async () => {
    const dusdInfo = await testing.rpc.token.getToken('DUSD')
    const dusdId: string = Object.keys(dusdInfo)[0]
    const paybackKey = `v0/token/${dusdId}/payback_dfi`
    const penaltyRateKey = `v0/token/${dusdId}/payback_dfi_fee_pct`
    const penaltyRate = 0.015

    await testing.rpc.masternode.setGov({ [attributeKey]: { [paybackKey]: 'true', [penaltyRateKey]: penaltyRate.toString() } })
    await testing.generate(1)

    await fundEllipticPair(testing.container, testingProvider.ellipticPair, 10)
    await testingProvider.setupMocks()

    const blockHeightBefore = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestPerBlockBefore = new BigNumber(netInterest * dusdLoanAmount / (365 * blocksPerDay))
    const dusdInterestAmountBefore = dusdInterestPerBlockBefore.multipliedBy(new BigNumber(blockHeightBefore - dusdTakeLoanBlockHeight + 1))
    const dusdLoanAmountBefore = new BigNumber(dusdLoanAmount).plus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultBefore = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${dusdLoanAmountBefore.toFixed(8)}@DUSD`])

    const burnInfoBefore = await testing.rpc.account.getBurnInfo()
    expect(burnInfoBefore.tokens).toStrictEqual([])
    expect(burnInfoBefore.dfipaybackfee).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybacktokens).toStrictEqual([])
    expect(burnInfoBefore.paybackfees).toStrictEqual([])
    expect(burnInfoBefore.paybacktokens).toStrictEqual([])

    const dfiPaybackAmount = 100
    const paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()

    const colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    const script = await testingProvider.elliptic.script()
    const txn = await testingBuilder.loans.paybackLoanV2({
      vaultId: vaultId,
      from: colScript,
      loans: [{ dToken: parseInt(dusdId), amounts: [{ token: 0, amount: new BigNumber(dfiPaybackAmount) }] }]
    }, script)
    await sendTransaction(testing.container, txn)

    // Price of dfi to dusd depends on the oracle, in this case 1 DFI = 1 DUSD
    const effectiveDusdPerDfi = new BigNumber(1).multipliedBy(1 - penaltyRate) // (DUSD per DFI * (1 - penalty rate))
    const dusdPayback = new BigNumber(dfiPaybackAmount).multipliedBy(effectiveDusdPerDfi)
    const dusdLoanPayback = dusdPayback.minus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const dusdInterestPerBlockAfter = new BigNumber(dusdLoanAmount).minus(dusdLoanPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    const dusdLoanRemainingAfter = new BigNumber(dusdLoanAmount).minus(dusdLoanPayback)

    // Let some time, generate blocks
    await testing.generate(2)

    const totalDfiPenalty = new BigNumber(dfiPaybackAmount).multipliedBy(penaltyRate)
    const burnInfoAfter = await testing.rpc.account.getBurnInfo()
    expect(burnInfoAfter.dfipaybackfee).toStrictEqual(totalDfiPenalty)
    expect(burnInfoAfter.dfipaybacktokens).toStrictEqual([`${dusdPayback.toFixed(8)}@DUSD`])

    const blockHeightAfter = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestAmountAfter = dusdInterestPerBlockAfter.multipliedBy(blockHeightAfter - paybackLoanBlockHeight).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const dusdLoanAmountAfter = dusdLoanRemainingAfter.plus(dusdInterestAmountAfter)

    const vaultAfter = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfter.loanAmounts).toStrictEqual([`${dusdLoanAmountAfter.toFixed(8)}@DUSD`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${dusdInterestAmountAfter.toFixed(8)}@DUSD`])
  })

  it('should be able to payback DUSD loan using TSLA - use PaybackLoanMetadataV2', async () => {
    await takeTslaTokensToPayback()

    // create pools required for SwapToDFIOverUSD burn
    {
      // create DUSD-DFI
      await testing.poolpair.create({
        tokenA: 'DUSD',
        tokenB: 'DFI'
      })
      await testing.generate(1)

      // create DUSD-TSLA
      await testing.poolpair.create({
        tokenA: 'DUSD',
        tokenB: 'TSLA'
      })
      await testing.generate(1)

      // add DUSD-DFI
      await testing.poolpair.add({
        a: { symbol: 'DUSD', amount: 1000 },
        b: { symbol: 'DFI', amount: 1000 }
      })
      await testing.generate(1)

      // add DUSD-TSLA
      await testing.poolpair.add({
        a: { symbol: 'DUSD', amount: 20 },
        b: { symbol: 'TSLA', amount: 10 }
      })
      await testing.generate(1)
    }

    const dusdInfo = await testing.rpc.token.getToken('DUSD')
    const dusdId: string = Object.keys(dusdInfo)[0]
    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    const tslaId: string = Object.keys(tslaInfo)[0]

    const paybackKey = `v0/token/${dusdId}/loan_payback/${tslaId}`
    const penaltyRateKey = `v0/token/${dusdId}/loan_payback_fee_pct/${tslaId}`
    const penaltyRate = 0.02

    await testing.rpc.masternode.setGov({ [attributeKey]: { [paybackKey]: 'true', [penaltyRateKey]: penaltyRate.toString() } })
    await testing.generate(1)

    await fundEllipticPair(testing.container, testingProvider.ellipticPair, 10)
    await testingProvider.setupMocks()

    const blockHeightBefore = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestPerBlockBefore = new BigNumber(netInterest * dusdLoanAmount / (365 * blocksPerDay))
    const dusdInterestAmountBefore = dusdInterestPerBlockBefore.multipliedBy(new BigNumber(blockHeightBefore - dusdTakeLoanBlockHeight + 1))
    const dusdLoanAmountBefore = new BigNumber(dusdLoanAmount).plus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultBefore = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${dusdLoanAmountBefore.toFixed(8)}@DUSD`])

    const burnInfoBefore = await testing.rpc.account.getBurnInfo()
    expect(burnInfoBefore.tokens).toStrictEqual([])
    expect(burnInfoBefore.dfipaybackfee).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybacktokens).toStrictEqual([])
    expect(burnInfoBefore.paybackfees).toStrictEqual([])
    expect(burnInfoBefore.paybacktokens).toStrictEqual([])

    const tslaPaybackAmount = 1
    const paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()

    const colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    const script = await testingProvider.elliptic.script()
    const txn = await testingBuilder.loans.paybackLoanV2({
      vaultId: vaultId,
      from: colScript,
      loans: [{ dToken: parseInt(dusdId), amounts: [{ token: parseInt(tslaId), amount: new BigNumber(tslaPaybackAmount) }] }]
    }, script)
    await sendTransaction(testing.container, txn)

    // Price of tsla to dusd depends on the oracle, in this case 1 TSLA = 1000 DUSD
    const effectiveDusdPerTsla = new BigNumber(1000).multipliedBy(1 - penaltyRate) // (DUSD per TSLA * (1 - penalty rate))
    const dusdPayback = new BigNumber(tslaPaybackAmount).multipliedBy(effectiveDusdPerTsla)
    const dusdLoanPayback = dusdPayback.minus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const dusdInterestPerBlockAfter = new BigNumber(dusdLoanAmount).minus(dusdLoanPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    const dusdLoanRemainingAfter = new BigNumber(dusdLoanAmount).minus(dusdLoanPayback)

    // Let some time, generate blocks
    await testing.generate(2)

    const totalTslaPenalty = new BigNumber(tslaPaybackAmount).multipliedBy(penaltyRate)
    const burnInfoAfter = await testing.rpc.account.getBurnInfo()
    expect(burnInfoAfter.tokens).toStrictEqual([])
    expect(burnInfoAfter.paybackfees).toStrictEqual([`${totalTslaPenalty.toFixed(8)}@TSLA`])
    expect(burnInfoAfter.paybacktokens).toStrictEqual([`${dusdPayback.toFixed(8)}@DUSD`])

    const blockHeightAfter = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestAmountAfter = dusdInterestPerBlockAfter.multipliedBy(blockHeightAfter - paybackLoanBlockHeight).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const dusdLoanAmountAfter = dusdLoanRemainingAfter.plus(dusdInterestAmountAfter)

    const vaultAfter = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfter.loanAmounts).toStrictEqual([`${dusdLoanAmountAfter.toFixed(8)}@DUSD`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${dusdInterestAmountAfter.toFixed(8)}@DUSD`])
  })

  it('should be able to payback DUSD loan using both TSLA and DFI - use PaybackLoanMetadataV2', async () => {
    await takeTslaTokensToPayback()

    // create pools required for SwapToDFIOverUSD burn
    {
      // create DUSD-DFI
      await testing.poolpair.create({
        tokenA: 'DUSD',
        tokenB: 'DFI'
      })
      await testing.generate(1)

      // create DUSD-TSLA
      await testing.poolpair.create({
        tokenA: 'DUSD',
        tokenB: 'TSLA'
      })
      await testing.generate(1)

      // add DUSD-DFI
      await testing.poolpair.add({
        a: { symbol: 'DUSD', amount: 1000 },
        b: { symbol: 'DFI', amount: 1000 }
      })
      await testing.generate(1)

      // add DUSD-TSLA
      await testing.poolpair.add({
        a: { symbol: 'DUSD', amount: 20 },
        b: { symbol: 'TSLA', amount: 10 }
      })
      await testing.generate(1)
    }

    const dfiInfo = await testing.rpc.token.getToken('DFI')
    const dfiId: string = Object.keys(dfiInfo)[0]
    const dusdInfo = await testing.rpc.token.getToken('DUSD')
    const dusdId: string = Object.keys(dusdInfo)[0]
    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    const tslaId: string = Object.keys(tslaInfo)[0]

    const dfiPaybackKey = `v0/token/${dusdId}/loan_payback/${dfiId}`
    const dfiPenaltyRateKey = `v0/token/${dusdId}/loan_payback_fee_pct/${dfiId}`
    const dfiPenaltyRate = 0.025
    await testing.rpc.masternode.setGov({ [attributeKey]: { [dfiPaybackKey]: 'true', [dfiPenaltyRateKey]: dfiPenaltyRate.toString() } })
    await testing.generate(1)

    const tslaPaybackKey = `v0/token/${dusdId}/loan_payback/${tslaId}`
    const tslaPenaltyRateKey = `v0/token/${dusdId}/loan_payback_fee_pct/${tslaId}`
    const tslaPenaltyRate = 0.02
    await testing.rpc.masternode.setGov({ [attributeKey]: { [tslaPaybackKey]: 'true', [tslaPenaltyRateKey]: tslaPenaltyRate.toString() } })
    await testing.generate(1)

    await fundEllipticPair(testing.container, testingProvider.ellipticPair, 10)
    await testingProvider.setupMocks()

    const blockHeightBefore = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestPerBlockBefore = new BigNumber(netInterest * dusdLoanAmount / (365 * blocksPerDay))
    const dusdInterestAmountBefore = dusdInterestPerBlockBefore.multipliedBy(new BigNumber(blockHeightBefore - dusdTakeLoanBlockHeight + 1)).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const dusdLoanAmountBefore = new BigNumber(dusdLoanAmount).plus(dusdInterestAmountBefore)

    const vaultBefore = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${dusdLoanAmountBefore.toFixed(8)}@DUSD`])

    const burnInfoBefore = await testing.rpc.account.getBurnInfo()
    expect(burnInfoBefore.tokens).toStrictEqual([])
    expect(burnInfoBefore.dfipaybackfee).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybacktokens).toStrictEqual([])
    expect(burnInfoBefore.paybackfees).toStrictEqual([])
    expect(burnInfoBefore.paybacktokens).toStrictEqual([])

    const tslaPaybackAmount = 1
    const dfiPaybackAmount = 100
    const paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()

    const colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    const script = await testingProvider.elliptic.script()
    const txn = await testingBuilder.loans.paybackLoanV2({
      vaultId: vaultId,
      from: colScript,
      loans: [{ dToken: parseInt(dusdId), amounts: [{ token: parseInt(dfiId), amount: new BigNumber(dfiPaybackAmount) }, { token: parseInt(tslaId), amount: new BigNumber(tslaPaybackAmount) }] }]
    }, script)
    await sendTransaction(testing.container, txn)

    // Price of dfi to dusd depends on the oracle, in this case 1 DFI = 1 DUSD
    const effectiveDusdPerDfi = new BigNumber(1).multipliedBy(1 - dfiPenaltyRate) // (DUSD per DFI * (1 - penalty rate))
    const dusdPaybackByDfi = new BigNumber(dfiPaybackAmount).multipliedBy(effectiveDusdPerDfi)

    // Price of tsla to dusd depends on the oracle, in this case 1 TSLA = 1000 DUSD
    const effectiveDusdPerTsla = new BigNumber(1000).multipliedBy(1 - tslaPenaltyRate) // (DUSD per TSLA * (1 - penalty rate))
    const dusdPaybackByTsla = new BigNumber(tslaPaybackAmount).multipliedBy(effectiveDusdPerTsla)

    const dusdPayback = dusdPaybackByDfi.plus(dusdPaybackByTsla)

    const dusdLoanRemainingAfter = new BigNumber(dusdLoanAmount).minus(dusdPayback).plus(dusdInterestAmountBefore)
    const dusdInterestPerBlockAfter = dusdLoanRemainingAfter.multipliedBy(netInterest).dividedBy(365 * blocksPerDay)

    // Let some time, generate blocks
    await testing.generate(2)

    const totalDfiPenalty = new BigNumber(dfiPaybackAmount).multipliedBy(dfiPenaltyRate)
    const totalTslaPenalty = new BigNumber(tslaPaybackAmount).multipliedBy(tslaPenaltyRate)
    const burnInfoAfter = await testing.rpc.account.getBurnInfo()
    expect(burnInfoAfter.tokens).toStrictEqual([])
    expect(burnInfoAfter.dfipaybackfee).toStrictEqual(totalDfiPenalty)
    expect(burnInfoAfter.dfipaybacktokens).toStrictEqual([`${dusdPaybackByDfi.toFixed(8)}@DUSD`])
    expect(burnInfoAfter.paybackfees).toStrictEqual([`${totalTslaPenalty.toFixed(8)}@TSLA`])
    expect(burnInfoAfter.paybacktokens).toStrictEqual([`${dusdPaybackByTsla.toFixed(8)}@DUSD`])

    const blockHeightAfter = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestAmountAfter = dusdInterestPerBlockAfter.multipliedBy(blockHeightAfter - paybackLoanBlockHeight).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const dusdLoanAmountAfter = dusdLoanRemainingAfter.plus(dusdInterestAmountAfter)

    const vaultAfter = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfter.loanAmounts).toStrictEqual([`${dusdLoanAmountAfter.toFixed(8)}@DUSD`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${dusdInterestAmountAfter.toFixed(8)}@DUSD`])
  })

  it('should be able to payback DUSD loan using both TSLA and BTC - use PaybackLoanMetadataV2', async () => {
    await takeTslaTokensToPayback()

    const metadataBtc = {
      symbol: 'BTC',
      name: 'BTC',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: vaultOwnerAddress
    }
    await testing.token.create(metadataBtc)
    await testing.container.generate(1)

    await testing.token.mint({ amount: 10, symbol: 'BTC' })
    await testing.container.generate(1)

    await testing.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await testing.generate(1)

    // create pools required for SwapToDFIOverUSD burn
    {
      // create DUSD-DFI
      await testing.poolpair.create({
        tokenA: 'DUSD',
        tokenB: 'DFI'
      })
      await testing.generate(1)

      // create DUSD-TSLA
      await testing.poolpair.create({
        tokenA: 'DUSD',
        tokenB: 'TSLA'
      })
      await testing.generate(1)

      // create DUSD-BTC
      await testing.poolpair.create({
        tokenA: 'DUSD',
        tokenB: 'BTC'
      })
      await testing.generate(1)

      // add DUSD-DFI
      await testing.poolpair.add({
        a: { symbol: 'DUSD', amount: 1000 },
        b: { symbol: 'DFI', amount: 1000 }
      })
      await testing.generate(1)

      // add DUSD-TSLA
      await testing.poolpair.add({
        a: { symbol: 'DUSD', amount: 20 },
        b: { symbol: 'TSLA', amount: 10 }
      })
      await testing.generate(1)

      // add DUSD-BTC
      await testing.poolpair.add({
        a: { symbol: 'DUSD', amount: 20000 },
        b: { symbol: 'BTC', amount: 2 }
      })
      await testing.generate(1)
    }

    const dusdInfo = await testing.rpc.token.getToken('DUSD')
    const dusdId: string = Object.keys(dusdInfo)[0]
    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    const tslaId: string = Object.keys(tslaInfo)[0]
    const btcInfo = await testing.rpc.token.getToken('BTC')
    const btcId: string = Object.keys(btcInfo)[0]

    const tslaPaybackKey = `v0/token/${dusdId}/loan_payback/${tslaId}`
    const tslaPenaltyRateKey = `v0/token/${dusdId}/loan_payback_fee_pct/${tslaId}`
    const tslaPenaltyRate = 0.02
    await testing.rpc.masternode.setGov({ [attributeKey]: { [tslaPaybackKey]: 'true', [tslaPenaltyRateKey]: tslaPenaltyRate.toString() } })
    await testing.generate(1)

    const btcPaybackKey = `v0/token/${dusdId}/loan_payback/${btcId}`
    const btcPenaltyRateKey = `v0/token/${dusdId}/loan_payback_fee_pct/${btcId}`
    const btcPenaltyRate = 0.01
    await testing.rpc.masternode.setGov({ [attributeKey]: { [btcPaybackKey]: 'true', [btcPenaltyRateKey]: btcPenaltyRate.toString() } })
    await testing.generate(5)

    await fundEllipticPair(testing.container, testingProvider.ellipticPair, 10)
    await testingProvider.setupMocks()

    const blockHeightBefore = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestPerBlockBefore = new BigNumber(netInterest * dusdLoanAmount / (365 * blocksPerDay))
    const dusdInterestAmountBefore = dusdInterestPerBlockBefore.multipliedBy(new BigNumber(blockHeightBefore - dusdTakeLoanBlockHeight + 1)).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const dusdLoanAmountBefore = new BigNumber(dusdLoanAmount).plus(dusdInterestAmountBefore)

    const vaultBefore = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${dusdLoanAmountBefore.toFixed(8)}@DUSD`])

    const burnInfoBefore = await testing.rpc.account.getBurnInfo()
    expect(burnInfoBefore.tokens).toStrictEqual([])
    expect(burnInfoBefore.dfipaybackfee).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybacktokens).toStrictEqual([])
    expect(burnInfoBefore.paybackfees).toStrictEqual([])
    expect(burnInfoBefore.paybacktokens).toStrictEqual([])

    const tslaPaybackAmount = 1
    const btcPaybackAmount = 1
    const paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()

    const colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    const script = await testingProvider.elliptic.script()
    const txn = await testingBuilder.loans.paybackLoanV2({
      vaultId: vaultId,
      from: colScript,
      loans: [{ dToken: parseInt(dusdId), amounts: [{ token: parseInt(tslaId), amount: new BigNumber(tslaPaybackAmount) }, { token: parseInt(btcId), amount: new BigNumber(btcPaybackAmount) }] }]
    }, script)
    await sendTransaction(testing.container, txn)

    // Price of tsla to dusd depends on the oracle, in this case 1 TSLA = 1000 DUSD
    const effectiveDusdPerTsla = new BigNumber(1000).multipliedBy(1 - tslaPenaltyRate) // (DUSD per TSLA * (1 - penalty rate))
    const dusdPaybackByTsla = new BigNumber(tslaPaybackAmount).multipliedBy(effectiveDusdPerTsla)

    // Price of btc to dusd depends on the oracle, in this case 1 BTC = 1000 DUSD
    const effectiveDusdPerBtc = new BigNumber(1000).multipliedBy(1 - btcPenaltyRate) // (DUSD per BTC * (1 - penalty rate))
    const dusdPaybackByBtc = new BigNumber(btcPaybackAmount).multipliedBy(effectiveDusdPerBtc)

    const dusdPayback = dusdPaybackByBtc.plus(dusdPaybackByTsla)

    const dusdLoanRemainingAfter = new BigNumber(dusdLoanAmount).minus(dusdPayback).plus(dusdInterestAmountBefore)
    const dusdInterestPerBlockAfter = dusdLoanRemainingAfter.multipliedBy(netInterest).dividedBy(365 * blocksPerDay)

    // Let some time, generate blocks
    await testing.generate(2)

    const totalTslaPenalty = new BigNumber(tslaPaybackAmount).multipliedBy(tslaPenaltyRate)
    const totalBtcPenalty = new BigNumber(btcPaybackAmount).multipliedBy(btcPenaltyRate)
    const burnInfoAfter = await testing.rpc.account.getBurnInfo()
    expect(burnInfoAfter.tokens).toStrictEqual([])
    expect(burnInfoAfter.dfipaybackfee).toStrictEqual(new BigNumber(0))
    expect(burnInfoAfter.dfipaybacktokens).toStrictEqual([])
    expect(burnInfoAfter.paybackfees).toStrictEqual([`${totalTslaPenalty.toFixed(8)}@TSLA`, `${totalBtcPenalty.toFixed(8)}@BTC`])
    expect(burnInfoAfter.paybacktokens).toStrictEqual([`${dusdPayback.toFixed(8)}@DUSD`])

    const blockHeightAfter = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestAmountAfter = dusdInterestPerBlockAfter.multipliedBy(blockHeightAfter - paybackLoanBlockHeight).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const dusdLoanAmountAfter = dusdLoanRemainingAfter.plus(dusdInterestAmountAfter)

    const vaultAfter = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfter.loanAmounts).toStrictEqual([`${dusdLoanAmountAfter.toFixed(8)}@DUSD`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${dusdInterestAmountAfter.toFixed(8)}@DUSD`])
  })

  it('should be able to payback DUSD loan using DUSD - use PaybackLoanMetadataV2', async () => {
    // create DUSD-DFI
    await testing.poolpair.create({
      tokenA: 'DUSD',
      tokenB: 'DFI'
    })
    await testing.generate(1)

    // add DUSD-DFI
    await testing.poolpair.add({
      a: { symbol: 'DUSD', amount: 1000 },
      b: { symbol: 'DFI', amount: 1000 }
    })
    await testing.generate(1)

    await fundEllipticPair(testing.container, testingProvider.ellipticPair, 10)
    await testingProvider.setupMocks()

    const blockHeightBefore = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestPerBlockBefore = new BigNumber(netInterest * dusdLoanAmount / (365 * blocksPerDay))
    const dusdInterestAmountBefore = dusdInterestPerBlockBefore.multipliedBy(new BigNumber(blockHeightBefore - dusdTakeLoanBlockHeight + 1))
    const dusdLoanAmountBefore = new BigNumber(dusdLoanAmount).plus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultBefore = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${dusdLoanAmountBefore.toFixed(8)}@DUSD`])

    const burnInfoBefore = await testing.rpc.account.getBurnInfo()
    expect(burnInfoBefore.tokens).toStrictEqual([])
    expect(burnInfoBefore.dfipaybackfee).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybacktokens).toStrictEqual([])
    expect(burnInfoBefore.paybackfees).toStrictEqual([])
    expect(burnInfoBefore.paybacktokens).toStrictEqual([])

    const dusdPaybackAmount = 100
    const paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()

    const colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    const script = await testingProvider.elliptic.script()
    const txn = await testingBuilder.loans.paybackLoanV2({
      vaultId: vaultId,
      from: colScript,
      loans: [{ dToken: parseInt(dusdId), amounts: [{ token: parseInt(dusdId), amount: new BigNumber(dusdPaybackAmount) }] }]
    }, script)
    await sendTransaction(testing.container, txn)

    const dusdPayback = new BigNumber(dusdPaybackAmount)
    const dusdLoanPayback = dusdPayback.minus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const dusdInterestPerBlockAfter = new BigNumber(dusdLoanAmount).minus(dusdLoanPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    const dusdLoanRemainingAfterFirstPayback = new BigNumber(dusdLoanAmount).minus(dusdLoanPayback)

    // Let some time, generate blocks
    await testing.generate(2)

    // const dusdPenalty = new BigNumber(dusdPaybackAmount).multipliedBy(penaltyRate)
    // const burnInfoAfter = await testing.rpc.account.getBurnInfo()
    // expect(burnInfoAfter.tokens).toStrictEqual([`${new BigNumber(dusdPaybackAmount).toFixed(8)}@DUSD`])
    // expect(burnInfoAfter.paybackfees).toStrictEqual([`${dusdPenalty.toFixed(8)}@DUSD`])
    // expect(burnInfoAfter.paybacktokens).toStrictEqual([`${dusdPayback.toFixed(8)}@DUSD`])

    const blockHeightAfter = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestAmountAfter = dusdInterestPerBlockAfter.multipliedBy(blockHeightAfter - paybackLoanBlockHeight).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const dusdLoanAmountAfter = dusdLoanRemainingAfterFirstPayback.plus(dusdInterestAmountAfter)

    const vaultAfter = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfter.loanAmounts).toStrictEqual([`${dusdLoanAmountAfter.toFixed(8)}@DUSD`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${dusdInterestAmountAfter.toFixed(8)}@DUSD`])
  })

  it('should be able to payback TSLA loan using DFI - use PaybackLoanMetadataV2', async () => {
    await setupForTslaLoan()
    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    const tslaId: string = Object.keys(tslaInfo)[0]
    const paybackKey = `v0/token/${tslaId}/payback_dfi`
    const penaltyRateKey = `v0/token/${tslaId}/payback_dfi_fee_pct`
    const penaltyRate = 0.02

    await testing.rpc.masternode.setGov({ [attributeKey]: { [paybackKey]: 'true', [penaltyRateKey]: penaltyRate.toString() } })
    await testing.generate(1)

    await fundEllipticPair(testing.container, testingProvider.ellipticPair, 10)
    await testingProvider.setupMocks()

    const blockHeightBefore = await testing.rpc.blockchain.getBlockCount()
    const tslaInterestPerBlockBefore = new BigNumber(netInterest * tslaLoanAmount / (365 * blocksPerDay))
    const tslaInterestAmountBefore = tslaInterestPerBlockBefore.multipliedBy(new BigNumber(blockHeightBefore - tslaTakeLoanBlockHeight))
    const tslaLoanAmountBefore = new BigNumber(tslaLoanAmount).plus(tslaInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultBefore = await testing.rpc.loan.getVault(tslaVaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${tslaLoanAmountBefore.toFixed(8)}@TSLA`])

    const burnInfoBefore = await testing.rpc.account.getBurnInfo()
    expect(burnInfoBefore.tokens).toStrictEqual([])
    expect(burnInfoBefore.dfipaybackfee).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybacktokens).toStrictEqual([])

    const dfiPaybackAmount = 100
    const paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()

    const colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    const script = await testingProvider.elliptic.script()
    const txn = await testingBuilder.loans.paybackLoanV2({
      vaultId: tslaVaultId,
      from: colScript,
      loans: [{ dToken: parseInt(tslaId), amounts: [{ token: 0, amount: new BigNumber(dfiPaybackAmount) }] }]
    }, script)
    await sendTransaction(testing.container, txn)

    // Price of dfi to tsla depends on the oracle, in this case 1 DFI = 0.001 TSLA
    const effectiveTslaPerDfi = new BigNumber(0.001).multipliedBy(1 - penaltyRate) // (TSLA per DFI * (1 - penalty rate))
    const tslaPayback = new BigNumber(dfiPaybackAmount).multipliedBy(effectiveTslaPerDfi)
    const tslaLoanPayback = tslaPayback.minus(tslaInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const tslaInterestPerBlockAfter = new BigNumber(tslaLoanAmount).minus(tslaLoanPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    const tslaLoanRemainingAfter = new BigNumber(tslaLoanAmount).minus(tslaLoanPayback)

    // Let some time, generate blocks
    await testing.generate(2)

    const totalDfiPenalty = new BigNumber(dfiPaybackAmount).multipliedBy(penaltyRate)
    const burnInfoAfter = await testing.rpc.account.getBurnInfo()
    expect(burnInfoAfter.tokens).toStrictEqual([])
    expect(burnInfoAfter.dfipaybackfee).toStrictEqual(totalDfiPenalty)
    expect(burnInfoAfter.dfipaybacktokens).toStrictEqual([`${tslaPayback.toFixed(8)}@TSLA`])

    const blockHeightAfter = await testing.rpc.blockchain.getBlockCount()
    const tslaInterestAmountAfter = tslaInterestPerBlockAfter.multipliedBy(blockHeightAfter - paybackLoanBlockHeight).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const tslaLoanAmountAfter = tslaLoanRemainingAfter.plus(tslaInterestAmountAfter)

    const vaultAfter = await testing.rpc.loan.getVault(tslaVaultId) as VaultActive
    expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfter.toFixed(8)}@TSLA`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${tslaInterestAmountAfter.toFixed(8)}@TSLA`])
  })

  it('should be able to payback DUSD and TSLA loans using DFI - use PaybackLoanMetadataV2', async () => {
    const tslaTakeLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()
    await testing.rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    await testing.generate(1)

    const dusdInfo = await testing.rpc.token.getToken('DUSD')
    const dusdId: string = Object.keys(dusdInfo)[0]
    const dusdPaybackKey = `v0/token/${dusdId}/payback_dfi`
    const dusdPenaltyRateKey = `v0/token/${dusdId}/payback_dfi_fee_pct`
    const dusdPenaltyRate = 0.015

    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    const tslaId: string = Object.keys(tslaInfo)[0]
    const tslaPaybackKey = `v0/token/${tslaId}/payback_dfi`
    const tslaPenaltyRateKey = `v0/token/${tslaId}/payback_dfi_fee_pct`
    const tslaPenaltyRate = 0.02

    await testing.rpc.masternode.setGov({ [attributeKey]: { [dusdPaybackKey]: 'true', [dusdPenaltyRateKey]: dusdPenaltyRate.toString(), [tslaPaybackKey]: 'true', [tslaPenaltyRateKey]: tslaPenaltyRate.toString() } })
    await testing.generate(1)

    await fundEllipticPair(testing.container, testingProvider.ellipticPair, 10)
    await testingProvider.setupMocks()

    const blockHeightBefore = await testing.rpc.blockchain.getBlockCount()

    const dusdInterestPerBlockBefore = new BigNumber(netInterest * dusdLoanAmount / (365 * blocksPerDay))
    const dusdInterestAmountBefore = dusdInterestPerBlockBefore.multipliedBy(new BigNumber(blockHeightBefore - dusdTakeLoanBlockHeight + 1))
    const dusdLoanAmountBefore = new BigNumber(dusdLoanAmount).plus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const tslaInterestPerBlockBefore = new BigNumber(netInterest * tslaLoanAmount / (365 * blocksPerDay))
    const tslaInterestAmountBefore = tslaInterestPerBlockBefore.multipliedBy(new BigNumber(blockHeightBefore - tslaTakeLoanBlockHeight))
    const tslaLoanAmountBefore = new BigNumber(tslaLoanAmount).plus(tslaInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultBefore = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${dusdLoanAmountBefore.toFixed(8)}@DUSD`, `${tslaLoanAmountBefore.toFixed(8)}@TSLA`])

    const burnInfoBefore = await testing.rpc.account.getBurnInfo()
    expect(burnInfoBefore.tokens).toStrictEqual([])
    expect(burnInfoBefore.dfipaybackfee).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybacktokens).toStrictEqual([])

    const dfiPaybackAmount = 100
    const paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()

    const colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    const script = await testingProvider.elliptic.script()
    const txn = await testingBuilder.loans.paybackLoanV2({
      vaultId: vaultId,
      from: colScript,
      loans: [{ dToken: parseInt(dusdId), amounts: [{ token: 0, amount: new BigNumber(dfiPaybackAmount) }] },
        { dToken: parseInt(tslaId), amounts: [{ token: 0, amount: new BigNumber(dfiPaybackAmount) }] }]
    }, script)
    await sendTransaction(testing.container, txn)

    // Price of dfi to dusd depends on the oracle, in this case 1 DFI = 1 DUSD
    const effectiveDusdPerDfi = new BigNumber(1).multipliedBy(1 - dusdPenaltyRate) // (DUSD per DFI * (1 - penalty rate))
    const dusdPayback = new BigNumber(dfiPaybackAmount).multipliedBy(effectiveDusdPerDfi)
    const dusdLoanPayback = dusdPayback.minus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const dusdInterestPerBlockAfter = new BigNumber(dusdLoanAmount).minus(dusdLoanPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    const dusdLoanRemainingAfter = new BigNumber(dusdLoanAmount).minus(dusdLoanPayback)

    // Price of dfi to tsla depends on the oracle, in this case 1 DFI = 0.001 TSLA
    const effectiveTslaPerDfi = new BigNumber(0.001).multipliedBy(1 - tslaPenaltyRate) // (TSLA per DFI * (1 - penalty rate))
    const tslaPayback = new BigNumber(dfiPaybackAmount).multipliedBy(effectiveTslaPerDfi)
    const tslaLoanPayback = tslaPayback.minus(tslaInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const tslaInterestPerBlockAfter = new BigNumber(tslaLoanAmount).minus(tslaLoanPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    const tslaLoanRemainingAfter = new BigNumber(tslaLoanAmount).minus(tslaLoanPayback)

    // Let some time, generate blocks
    await testing.generate(2)

    const dfiPenaltyForDusdLoan = new BigNumber(dfiPaybackAmount).multipliedBy(dusdPenaltyRate)
    const dfiPenaltyForTslaLoan = new BigNumber(dfiPaybackAmount).multipliedBy(tslaPenaltyRate)

    const burnInfoAfter = await testing.rpc.account.getBurnInfo()
    expect(burnInfoAfter.dfipaybackfee).toStrictEqual(dfiPenaltyForDusdLoan.plus(dfiPenaltyForTslaLoan))
    expect(burnInfoAfter.dfipaybacktokens).toStrictEqual([`${dusdPayback.toFixed(8)}@DUSD`, `${tslaPayback.toFixed(8)}@TSLA`])

    const blockHeightAfter = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestAmountAfter = dusdInterestPerBlockAfter.multipliedBy(blockHeightAfter - paybackLoanBlockHeight).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const dusdLoanAmountAfter = dusdLoanRemainingAfter.plus(dusdInterestAmountAfter)
    const tslaInterestAmountAfter = tslaInterestPerBlockAfter.multipliedBy(blockHeightAfter - paybackLoanBlockHeight).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const tslaLoanAmountAfter = tslaLoanRemainingAfter.plus(tslaInterestAmountAfter)

    const vaultAfter = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfter.loanAmounts).toStrictEqual([`${dusdLoanAmountAfter.toFixed(8)}@DUSD`, `${tslaLoanAmountAfter.toFixed(8)}@TSLA`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${dusdInterestAmountAfter.toFixed(8)}@DUSD`, `${tslaInterestAmountAfter.toFixed(8)}@TSLA`])
  })

  it('should be able to payback DUSD and TSLA loans using BTC - use PaybackLoanMetadataV2', async () => {
    const metadata = {
      symbol: 'BTC',
      name: 'BTC',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: vaultOwnerAddress
    }
    await testing.token.create(metadata)
    await testing.container.generate(1)

    await testing.token.mint({ amount: 10, symbol: 'BTC' })
    await testing.container.generate(1)

    await testing.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await testing.generate(1)

    // create pools required for SwapToDFIOverUSD burn
    {
      // create DUSD-DFI
      await testing.poolpair.create({
        tokenA: 'DUSD',
        tokenB: 'DFI'
      })
      await testing.generate(1)

      // create DUSD-BTC
      await testing.poolpair.create({
        tokenA: 'DUSD',
        tokenB: 'BTC'
      })
      await testing.generate(1)

      // add DUSD-DFI
      await testing.poolpair.add({
        a: { symbol: 'DUSD', amount: 1000 },
        b: { symbol: 'DFI', amount: 1000 }
      })
      await testing.generate(1)

      // add DUSD-BTC
      await testing.poolpair.add({
        a: { symbol: 'DUSD', amount: 20000 },
        b: { symbol: 'BTC', amount: 2 }
      })
      await testing.generate(1)
    }

    const tslaTakeLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()
    await testing.rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    await testing.generate(1)

    const btcInfo = await testing.rpc.token.getToken('BTC')
    const btcId: string = Object.keys(btcInfo)[0]

    const dusdInfo = await testing.rpc.token.getToken('DUSD')
    const dusdId: string = Object.keys(dusdInfo)[0]
    const dusdPaybackKey = `v0/token/${dusdId}/loan_payback/${btcId}`
    const dusdPenaltyRateKey = `v0/token/${dusdId}/loan_payback_fee_pct/${btcId}`
    const dusdPenaltyRate = 0.015

    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    const tslaId: string = Object.keys(tslaInfo)[0]
    const tslaPaybackKey = `v0/token/${tslaId}/loan_payback/${btcId}`
    const tslaPenaltyRateKey = `v0/token/${tslaId}/loan_payback_fee_pct/${btcId}`
    const tslaPenaltyRate = 0.02

    await testing.rpc.masternode.setGov({ [attributeKey]: { [dusdPaybackKey]: 'true', [dusdPenaltyRateKey]: dusdPenaltyRate.toString(), [tslaPaybackKey]: 'true', [tslaPenaltyRateKey]: tslaPenaltyRate.toString() } })
    await testing.generate(1)

    await fundEllipticPair(testing.container, testingProvider.ellipticPair, 10)
    await testingProvider.setupMocks()

    const blockHeightBefore = await testing.rpc.blockchain.getBlockCount()

    const dusdInterestPerBlockBefore = new BigNumber(netInterest * dusdLoanAmount / (365 * blocksPerDay))
    const dusdInterestAmountBefore = dusdInterestPerBlockBefore.multipliedBy(new BigNumber(blockHeightBefore - dusdTakeLoanBlockHeight + 1))
    const dusdLoanAmountBefore = new BigNumber(dusdLoanAmount).plus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const tslaInterestPerBlockBefore = new BigNumber(netInterest * tslaLoanAmount / (365 * blocksPerDay))
    const tslaInterestAmountBefore = tslaInterestPerBlockBefore.multipliedBy(new BigNumber(blockHeightBefore - tslaTakeLoanBlockHeight))
    const tslaLoanAmountBefore = new BigNumber(tslaLoanAmount).plus(tslaInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultBefore = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${dusdLoanAmountBefore.toFixed(8)}@DUSD`, `${tslaLoanAmountBefore.toFixed(8)}@TSLA`])

    const burnInfoBefore = await testing.rpc.account.getBurnInfo()
    expect(burnInfoBefore.tokens).toStrictEqual([])
    expect(burnInfoBefore.dfipaybackfee).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybacktokens).toStrictEqual([])
    expect(burnInfoBefore.paybackfees).toStrictEqual([])
    expect(burnInfoBefore.paybacktokens).toStrictEqual([])

    const btcPaybackAmount = 1
    const paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()

    const colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    const script = await testingProvider.elliptic.script()
    const txn = await testingBuilder.loans.paybackLoanV2({
      vaultId: vaultId,
      from: colScript,
      loans: [{ dToken: parseInt(dusdId), amounts: [{ token: parseInt(btcId), amount: new BigNumber(btcPaybackAmount) }] },
        { dToken: parseInt(tslaId), amounts: [{ token: parseInt(btcId), amount: new BigNumber(btcPaybackAmount) }] }]
    }, script)
    await sendTransaction(testing.container, txn)

    // Price of btc to dusd depends on the oracle, in this case 1 BTC = 1000 DUSD
    const effectiveDusdPerBtc = new BigNumber(1000).multipliedBy(1 - dusdPenaltyRate) // (DUSD per BTC * (1 - penalty rate))
    const dusdPayback = new BigNumber(btcPaybackAmount).multipliedBy(effectiveDusdPerBtc)
    const dusdLoanPayback = dusdPayback.minus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const dusdInterestPerBlockAfter = new BigNumber(dusdLoanAmount).minus(dusdLoanPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    const dusdLoanRemainingAfter = new BigNumber(dusdLoanAmount).minus(dusdLoanPayback)

    // Price of btc to tsla depends on the oracle, in this case 1 BTC = 1 TSLA
    const effectiveTslaPerBtc = new BigNumber(1).multipliedBy(1 - tslaPenaltyRate) // (TSLA per BTC * (1 - penalty rate))
    const tslaPayback = new BigNumber(btcPaybackAmount).multipliedBy(effectiveTslaPerBtc)
    const tslaLoanPayback = tslaPayback.minus(tslaInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const tslaInterestPerBlockAfter = new BigNumber(tslaLoanAmount).minus(tslaLoanPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    const tslaLoanRemainingAfter = new BigNumber(tslaLoanAmount).minus(tslaLoanPayback)

    // Let some time, generate blocks
    await testing.generate(2)

    const btcPenaltyForDusdLoan = new BigNumber(btcPaybackAmount).multipliedBy(dusdPenaltyRate)
    const btcPenaltyForTslaLoan = new BigNumber(btcPaybackAmount).multipliedBy(tslaPenaltyRate)

    const burnInfoAfter = await testing.rpc.account.getBurnInfo()
    expect(burnInfoAfter.tokens).toStrictEqual([])
    expect(burnInfoAfter.dfipaybackfee).toStrictEqual(new BigNumber(0))
    expect(burnInfoAfter.dfipaybacktokens).toStrictEqual([])
    expect(burnInfoAfter.paybackfees).toStrictEqual([`${btcPenaltyForDusdLoan.plus(btcPenaltyForTslaLoan).toFixed(8)}@BTC`])
    expect(burnInfoAfter.paybacktokens).toStrictEqual([`${dusdPayback.toFixed(8)}@DUSD`, `${tslaPayback.toFixed(8)}@TSLA`])

    const blockHeightAfter = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestAmountAfter = dusdInterestPerBlockAfter.multipliedBy(blockHeightAfter - paybackLoanBlockHeight).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const dusdLoanAmountAfter = dusdLoanRemainingAfter.plus(dusdInterestAmountAfter)
    const tslaInterestAmountAfter = tslaInterestPerBlockAfter.multipliedBy(blockHeightAfter - paybackLoanBlockHeight).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const tslaLoanAmountAfter = tslaLoanRemainingAfter.plus(tslaInterestAmountAfter)

    const vaultAfter = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfter.loanAmounts).toStrictEqual([`${dusdLoanAmountAfter.toFixed(8)}@DUSD`, `${tslaLoanAmountAfter.toFixed(8)}@TSLA`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${dusdInterestAmountAfter.toFixed(8)}@DUSD`, `${tslaInterestAmountAfter.toFixed(8)}@TSLA`])
  })

  it('should not payback DUSD loan using DFI when attribute is not enabled in setGov', async () => {
    let attribute = await testing.rpc.masternode.getGov(attributeKey)
    // eslint-disable-next-line no-prototype-builtins
    let isEnabledDfiPayback = (Boolean(attribute[attributeKey].hasOwnProperty(key))) && attribute[attributeKey][key] === 'true'
    expect(isEnabledDfiPayback).not.toBeTruthy()

    let dfiPaybackAmount = 100
    let colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    let script = await testingProvider.elliptic.script()
    let txn = await testingBuilder.loans.paybackLoan({
      vaultId: vaultId,
      from: colScript,
      tokenAmounts: [{ token: 0, amount: new BigNumber(dfiPaybackAmount) }]
    }, script)
    let promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow('DeFiDRpcError: \'PaybackLoanTx: Payback of loan via DFI token is not currently active\', code: -26')

    await testing.rpc.masternode.setGov({ [attributeKey]: { [key]: 'false' } })
    await testing.container.generate(1)
    attribute = await testing.rpc.masternode.getGov(attributeKey)
    // eslint-disable-next-line no-prototype-builtins
    isEnabledDfiPayback = (Boolean(attribute[attributeKey].hasOwnProperty(key))) && attribute[attributeKey][key] === 'true'
    expect(isEnabledDfiPayback).not.toBeTruthy()

    dfiPaybackAmount = 100
    colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    script = await testingProvider.elliptic.script()
    txn = await testingBuilder.loans.paybackLoan({
      vaultId: vaultId,
      from: colScript,
      tokenAmounts: [{ token: 0, amount: new BigNumber(dfiPaybackAmount) }]
    }, script)
    promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow('DeFiDRpcError: \'PaybackLoanTx: Payback of loan via DFI token is not currently active\', code: -26')
  })

  it('should not be able to payback TSLA loan using DFI when the governance is set to payback DUSD using DFI', async () => {
    await setupForTslaLoan()
    await testing.rpc.masternode.setGov({ [attributeKey]: { [key]: 'true' } })
    await testing.generate(1)

    const currentHeight = await testing.rpc.blockchain.getBlockCount()
    const tslaInterestPerBlock = new BigNumber(netInterest * tslaLoanAmount / (365 * blocksPerDay)).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const tslaInterestAmount = tslaInterestPerBlock.multipliedBy(new BigNumber(currentHeight - tslaTakeLoanBlockHeight))
    const tslaLoanAmountBefore = new BigNumber(tslaLoanAmount).plus(tslaInterestAmount.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultBefore = await testing.rpc.loan.getVault(tslaVaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${tslaLoanAmountBefore.toFixed(8)}@TSLA`])

    const colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    const script = await testingProvider.elliptic.script()

    const txn = await testingBuilder.loans.paybackLoan({
      vaultId: tslaVaultId,
      from: colScript,
      tokenAmounts: [{ token: 0, amount: new BigNumber(1) }]
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'PaybackLoanTx: There is no loan on token (DUSD) in this vault!\', code: -26')
  })

  it('should not be able to payback DUSD loan using other tokens', async () => {
    await setupForTslaLoan()

    // payback with TSLA
    const colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    const script = await testingProvider.elliptic.script()

    // payback dusd loan with tsla
    const txn = await testingBuilder.loans.paybackLoan({
      vaultId: vaultId,
      from: colScript,
      tokenAmounts: [{ token: 2, amount: new BigNumber(1) }]
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'PaybackLoanTx: There is no loan on token (TSLA) in this vault!\', code: -26')
  })

  it('should not be able to payback TSLA loan using DFI - without PaybackLoanMetadataV2', async () => {
    await setupForTslaLoan()
    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    const tslaId: string = Object.keys(tslaInfo)[0]
    const paybackKey = `v0/token/${tslaId}/payback_dfi`
    const penaltyRateKey = `v0/token/${tslaId}/payback_dfi_fee_pct`
    const penaltyRate = 0.02

    await testing.rpc.masternode.setGov({ [attributeKey]: { [paybackKey]: 'true', [penaltyRateKey]: penaltyRate.toString() } })
    await testing.generate(1)

    await fundEllipticPair(testing.container, testingProvider.ellipticPair, 10)
    await testingProvider.setupMocks()

    const blockHeightBefore = await testing.rpc.blockchain.getBlockCount()
    const tslaInterestPerBlockBefore = new BigNumber(netInterest * tslaLoanAmount / (365 * blocksPerDay))
    const tslaInterestAmountBefore = tslaInterestPerBlockBefore.multipliedBy(new BigNumber(blockHeightBefore - tslaTakeLoanBlockHeight))
    const tslaLoanAmountBefore = new BigNumber(tslaLoanAmount).plus(tslaInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultBefore = await testing.rpc.loan.getVault(tslaVaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${tslaLoanAmountBefore.toFixed(8)}@TSLA`])

    const colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    const script = await testingProvider.elliptic.script()
    const txn = await testingBuilder.loans.paybackLoan({
      vaultId: tslaVaultId,
      from: colScript,
      tokenAmounts: [{ token: 0, amount: new BigNumber(10000) }]
    }, script)
    const payBackPromise = sendTransaction(testing.container, txn)

    await expect(payBackPromise).rejects.toThrow('DeFiDRpcError: \'PaybackLoanTx: Payback of loan via DFI token is not currently active\', code: -26')
  })

  it('should not be able to payback TSLA loan using BTC - without PaybackLoanMetadataV2', async () => {
    const metadata = {
      symbol: 'BTC',
      name: 'BTC',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: vaultOwnerAddress
    }
    await testing.token.create(metadata)
    await testing.container.generate(1)

    await testing.token.mint({ amount: 10, symbol: 'BTC' })
    await testing.container.generate(1)

    await testing.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await testing.generate(1)

    await setupForTslaLoan()

    const btcInfo = await testing.rpc.token.getToken('BTC')
    const btcId: string = Object.keys(btcInfo)[0]
    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    const tslaId: string = Object.keys(tslaInfo)[0]
    const paybackKey = `v0/token/${tslaId}/loan_payback/${btcId}`
    const penaltyRateKey = `v0/token/${tslaId}/loan_payback_fee_pct/${btcId}`
    const penaltyRate = 0.02

    await testing.rpc.masternode.setGov({ [attributeKey]: { [paybackKey]: 'true', [penaltyRateKey]: penaltyRate.toString() } })
    await testing.generate(1)

    await fundEllipticPair(testing.container, testingProvider.ellipticPair, 10)
    await testingProvider.setupMocks()

    const blockHeightBefore = await testing.rpc.blockchain.getBlockCount()
    const tslaInterestPerBlockBefore = new BigNumber(netInterest * tslaLoanAmount / (365 * blocksPerDay))
    const tslaInterestAmountBefore = tslaInterestPerBlockBefore.multipliedBy(new BigNumber(blockHeightBefore - tslaTakeLoanBlockHeight))
    const tslaLoanAmountBefore = new BigNumber(tslaLoanAmount).plus(tslaInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultBefore = await testing.rpc.loan.getVault(tslaVaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${tslaLoanAmountBefore.toFixed(8)}@TSLA`])

    const colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    const script = await testingProvider.elliptic.script()
    const txn = await testingBuilder.loans.paybackLoan({
      vaultId: tslaVaultId,
      from: colScript,
      tokenAmounts: [{ token: parseInt(btcId), amount: new BigNumber(1) }]
    }, script)
    const payBackPromise = sendTransaction(testing.container, txn)

    await expect(payBackPromise).rejects.toThrow('DeFiDRpcError: \'PaybackLoanTx: Loan token with id (3) does not exist!\', code: -26')
  })

  it('should not be able to payback DUSD loan using TSLA - without PaybackLoanMetadataV2', async () => {
    await takeTslaTokensToPayback()

    const dusdInfo = await testing.rpc.token.getToken('DUSD')
    const dusdId: string = Object.keys(dusdInfo)[0]
    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    const tslaId: string = Object.keys(tslaInfo)[0]

    const paybackKey = `v0/token/${dusdId}/loan_payback/${tslaId}`
    const penaltyRateKey = `v0/token/${dusdId}/loan_payback_fee_pct/${tslaId}`
    const penaltyRate = 0.02

    await testing.rpc.masternode.setGov({ [attributeKey]: { [paybackKey]: 'true', [penaltyRateKey]: penaltyRate.toString() } })
    await testing.generate(1)

    await fundEllipticPair(testing.container, testingProvider.ellipticPair, 10)
    await testingProvider.setupMocks()

    const tslaPaybackAmount = 1
    const colScript = P2WPKH.fromAddress(RegTest, vaultOwnerAddress, P2WPKH).getScript()
    const script = await testingProvider.elliptic.script()
    const txn = await testingBuilder.loans.paybackLoan({
      vaultId: vaultId,
      from: colScript,
      tokenAmounts: [{ token: parseInt(tslaId), amount: new BigNumber(tslaPaybackAmount) }]
    }, script)
    const payBackPromise = sendTransaction(testing.container, txn)

    await expect(payBackPromise).rejects.toThrow('DeFiDRpcError: \'PaybackLoanTx: There is no loan on token (TSLA) in this vault!\', code: -26')
  })
})
