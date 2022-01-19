import { DeFiDRpcError } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RegTest, RegTestGenesisKeys } from '@defichain/jellyfish-network'
import { P2WPKH } from '@defichain/jellyfish-address'
import { Script } from '@defichain/jellyfish-transaction'
import { VaultActive } from '@defichain/jellyfish-api-core/src/category/loan'

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
    expect(burnInfoBefore.paybackburn).toStrictEqual(undefined)

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
    expect(burnInfoAfter.paybackburn).toStrictEqual(0.00001369)
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
    expect(burnInfoBefore.paybackburn).toStrictEqual(undefined)

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
    expect(burnInfoAfterFirstPayback.paybackburn).toStrictEqual(0.00002082)

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
    expect(burnInfoAfterSecondPayback.paybackburn).toStrictEqual(0.000028)
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
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'PaybackLoanTx: amount 0.00000000 is less than 0.00006850 (code 16)\', code: -26')
  })
})
