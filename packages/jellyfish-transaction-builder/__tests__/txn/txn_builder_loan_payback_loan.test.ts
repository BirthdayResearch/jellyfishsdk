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
let tslaLoanHeight: number
let aliceColAddr: string
let aProviders: MockProviders
let aBuilder: P2WPKHTransactionBuilder
let bProviders: MockProviders
let bBuilder: P2WPKHTransactionBuilder
const netInterest = (3 + 0) / 100 // (scheme.rate + loanToken.interest) / 100
const blocksPerDay = (60 * 60 * 24) / (10 * 60) // 144 in regtest

async function setup (): Promise<void> {
  // token setup
  aliceColAddr = await aProviders.getAddress()
  await alice.token.dfi({ address: aliceColAddr, amount: 30000 })
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

  bobColAddr = await bProviders.getAddress()
  await bob.token.dfi({ address: bobColAddr, amount: 30000 })
  await bob.generate(1)
  await tGroup.waitForSync()

  // await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['40@TSLA'] })

  await alice.rpc.account.accountToAccount(aliceColAddr, { [bobColAddr]: '1@BTC' })
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
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '100000@UBER', currency: 'USD' }] })
  await alice.generate(1)

  // set up fixture for paybackLoan
  const aliceDUSDAddr = await alice.container.getNewAddress()
  await alice.token.dfi({ address: aliceDUSDAddr, amount: 600000 })
  await alice.generate(1)
  await alice.token.create({ symbol: 'DUSD', collateralAddress: aliceDUSDAddr })
  await alice.generate(1)
  await alice.token.mint({ symbol: 'DUSD', amount: 600000 })
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
    a: { symbol: 'TSLA', amount: 20000 },
    b: { symbol: 'DUSD', amount: 10000 }
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
    a: { symbol: 'AMZN', amount: 40000 },
    b: { symbol: 'DUSD', amount: 10000 }
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
    a: { symbol: 'DUSD', amount: 25000 },
    b: { symbol: 'DFI', amount: 10000 }
  })
  await alice.generate(1)
  await tGroup.waitForSync()

  await bob.rpc.loan.takeLoan({
    vaultId: bobVaultId,
    to: bobColAddr,
    amounts: '40@TSLA'
  })
  await bob.generate(1)
  tslaLoanHeight = await bob.container.getBlockCount()
  await tGroup.waitForSync()
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

    {
      const interests = await bob.rpc.loan.getInterest('scheme')
      const height = await bob.container.getBlockCount()
      const tslaInterestPerBlock = (netInterest * 40) / (365 * blocksPerDay) //  netInterest * loanAmt / 365 * blocksPerDay
      const tslaInterestTotal = tslaInterestPerBlock * (height - tslaLoanHeight + 1)
      expect(interests[0].interestPerBlock.toFixed(8)).toStrictEqual(tslaInterestPerBlock.toFixed(8))
      expect(interests[0].totalInterest.toFixed(8)).toStrictEqual(tslaInterestTotal.toFixed(8))
    }

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.loanAmounts).toStrictEqual(['40.00004566@TSLA'])
    expect(vaultBefore.loanValue).toStrictEqual(80.00009132)
    expect(vaultBefore.interestAmounts).toStrictEqual(['0.00004566@TSLA'])
    expect(vaultBefore.interestValue).toStrictEqual(0.00009132)
    expect(vaultBefore.collateralRatio).toStrictEqual(18750)
    expect(vaultBefore.informativeRatio).toStrictEqual(18749.97859689)

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
    expect(bobColAccAfter).toStrictEqual(['4.99990868@TSLA']) // 45 - 40.00004566
  })

  it('should paybackLoan partially', async () => {
    const burnInfoBefore = await bob.container.call('getburninfo')
    expect(burnInfoBefore.paybackburn).toStrictEqual(undefined)

    const bobColAccBefore = await bob.container.call('getaccount', [bobColAddr])
    expect(bobColAccBefore).toStrictEqual(['40.00000000@TSLA'])

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.collateralValue).toStrictEqual(15000) // DFI(10000) + BTC(1 * 10000 * 0.5)
    expect(vaultBefore.loanAmounts).toStrictEqual(['40.00002283@TSLA']) // 40 + totalInterest
    expect(vaultBefore.interestAmounts).toStrictEqual(['0.00002283@TSLA'])
    expect(vaultBefore.loanValue).toStrictEqual(80.00004566) // loanAmount * 2 (::1 TSLA = 2 USD)
    expect(vaultBefore.interestValue).toStrictEqual(0.00004566)
    expect(vaultBefore.collateralRatio).toStrictEqual(18750) // 15000 / 80.00004566 * 100
    expect(vaultBefore.informativeRatio).toStrictEqual(18749.98929844)

    {
      const interests = await bob.rpc.loan.getInterest('scheme')
      const height = await bob.container.getBlockCount()
      const tslaInterestPerBlock = (netInterest * 40) / (365 * blocksPerDay) //  netInterest * loanAmt / 365 * blocksPerDay
      const tslaInterestTotal = tslaInterestPerBlock * (height - tslaLoanHeight + 1)
      expect(interests[0].interestPerBlock.toFixed(8)).toStrictEqual(tslaInterestPerBlock.toFixed(8))
      expect(interests[0].totalInterest.toFixed(8)).toStrictEqual(tslaInterestTotal.toFixed(8))
    }

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

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

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmounts).toStrictEqual(['27.00009931@TSLA']) // 40.00004566 - 13 + totalInterest
    expect(vaultAfter.interestAmounts).toStrictEqual(['0.00003082@TSLA'])
    expect(vaultAfter.loanValue).toStrictEqual(54.00019862) // 27.00009931 * 2 (::1 TSLA = 2 USD)
    expect(vaultAfter.interestValue).toStrictEqual(0.00006164)
    expect(vaultAfter.collateralRatio).toStrictEqual(27778) // 15000 / 54.00007648 * 100
    expect(vaultAfter.informativeRatio).toStrictEqual(27777.67560737)

    const burnInfoAfter = await bob.container.call('getburninfo')
    expect(burnInfoAfter.paybackburn).toStrictEqual(0.0000137)
  })

  it('should paybackLoan by anyone', async () => {
    const loanAccBefore = await bob.container.call('getaccount', [aliceColAddr])
    expect(loanAccBefore).toStrictEqual(['30000.00000000@DFI', '29999.00000000@BTC', '10000.00000000@TSLA'])

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.collateralValue).toStrictEqual(15000) // DFI(10000) + BTC(1 * 10000 * 0.5)
    expect(vaultBefore.loanAmounts).toStrictEqual(['40.00002283@TSLA']) // 40 + totalInterest
    expect(vaultBefore.interestAmounts).toStrictEqual(['0.00002283@TSLA'])
    expect(vaultBefore.loanValue).toStrictEqual(80.00004566) // loanAmount * 2 (::1 TSLA = 2 USD)
    expect(vaultBefore.interestValue).toStrictEqual(0.00004566)
    expect(vaultBefore.collateralRatio).toStrictEqual(18750) // 15000 / 80.0000456 * 100
    expect(vaultBefore.informativeRatio).toStrictEqual(18749.98929844)

    await fundEllipticPair(alice.container, aProviders.ellipticPair, 10)
    const aliceColScript = P2WPKH.fromAddress(RegTest, aliceColAddr, P2WPKH).getScript()

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
    expect(loanAccAfter).toStrictEqual(['30000.00000000@DFI', '29999.00000000@BTC', '9987.00000000@TSLA'])

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmounts).toStrictEqual(['27.00009931@TSLA']) // 40.00002283 - 8 + totalInterest
    expect(vaultAfter.interestAmounts).toStrictEqual(['0.00003082@TSLA'])
    expect(vaultAfter.loanValue).toStrictEqual(54.00019862) // 27.00009931 * 2 (::1 TSLA = 2 USD)
    expect(vaultAfter.interestValue).toStrictEqual(0.00006164)
    expect(vaultAfter.collateralRatio).toStrictEqual(27778) // 15000 / 54.00019862 * 100
    expect(vaultAfter.informativeRatio).toStrictEqual(27777.67560737)
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
    {
      const blockHeight = await bob.container.getBlockCount()

      const tslaTokenAmt = loanTokenAccBefore.find((amt: string) => amt.split('@')[1] === 'TSLA')
      const tslaAmt = Number(tslaTokenAmt.split('@')[0])
      const amznTokenAmt = loanTokenAccBefore.find((amt: string) => amt.split('@')[1] === 'AMZN')
      const amznAmt = Number(amznTokenAmt.split('@')[0])

      // tsla interest
      const tslaInterestPerBlock = (netInterest * tslaAmt) / (365 * blocksPerDay) //  netInterest * loanAmt / 365 * blocksPerDay
      const tslaTotalInterest = ((blockHeight - tslaLoanHeight + 1) * tslaInterestPerBlock)

      // amzn interest
      const amznInterestPerBlock = (netInterest * amznAmt) / (365 * blocksPerDay) //  netInterest * loanAmt / 365 * blocksPerDay
      const amznTotalInterest = ((blockHeight - amznLoanHeight) * amznInterestPerBlock)

      const interests = await bob.rpc.loan.getInterest('scheme')

      const tslaInterest = interests.find(i => i.token === 'TSLA')
      const tslaTotalInt = tslaInterest?.totalInterest.toFixed(8)
      expect(tslaTotalInt).toStrictEqual(tslaTotalInterest.toFixed(8)) // 0.00004566
      const tslaInterestPerBlk = tslaInterest?.interestPerBlock.toFixed(8)
      expect(tslaInterestPerBlk).toStrictEqual(tslaInterestPerBlock.toFixed(8)) // 0.00002283

      const amzInterest = interests.find(i => i.token === 'AMZN')
      const amzTotalInt = amzInterest?.totalInterest.toFixed(8)
      expect(amzTotalInt).toStrictEqual(amznTotalInterest.toFixed(8)) // 0.0000856
      const amzInterestPerBlk = amzInterest?.interestPerBlock.toFixed(8)
      expect(amzInterestPerBlk).toStrictEqual(amznInterestPerBlock.toFixed(8)) // 0.00000856

      const vaultBefore = await bob.container.call('getvault', [bobVaultId])
      expect(vaultBefore.loanAmounts).toStrictEqual(['40.00004566@TSLA', '15.00000856@AMZN']) // eg: tslaTakeLoanAmt + tslaTotalInterest
      expect(vaultBefore.interestAmounts).toStrictEqual(['0.00004566@TSLA', '0.00000856@AMZN'])
      expect(vaultBefore.loanValue).toStrictEqual(140.00012556) // (40.00004566 * 2) + (15.00009856 * 4)
      expect(vaultBefore.collateralRatio).toStrictEqual(10714) // 15000 / 140.00012556 * 100
      expect(vaultBefore.informativeRatio).toStrictEqual(10714.27610511)

      await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
      const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

      const txn = await bBuilder.loans.paybackLoan({
        vaultId: bobVaultId,
        from: bobColScript,
        tokenAmounts: [{ token: 2, amount: new BigNumber(13) }, { token: 3, amount: new BigNumber(6) }]
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
      expect(vaultAfter.loanAmounts).toStrictEqual(['27.00012214@TSLA', '9.00003596@AMZN'])
      expect(vaultAfter.interestAmounts).toStrictEqual(['0.00003082@TSLA', '0.00001028@AMZN'])
      expect(vaultAfter.loanValue).toStrictEqual(90.00038812)
      expect(vaultAfter.interestValue).toStrictEqual(0.00010276)
      expect(vaultAfter.collateralRatio).toStrictEqual(16667)
      expect(vaultAfter.informativeRatio).toStrictEqual(16666.5947929)

      const loanTokenAccAfter = await bob.container.call('getaccount', [bobColAddr])
      expect(loanTokenAccAfter).toStrictEqual(['27.00000000@TSLA', '9.00000000@AMZN'])

      const burnInfoAfter = await bob.container.call('getburninfo')
      expect(burnInfoAfter.paybackburn).toStrictEqual(0.00002084)
    }

    // second paybackLoan
    {
      const bobColScript = P2WPKH.fromAddress(RegTest, bobColAddr, P2WPKH).getScript()

      const txn = await bBuilder.loans.paybackLoan({
        vaultId: bobVaultId,
        from: bobColScript,
        tokenAmounts: [{ token: 2, amount: new BigNumber(13) }, { token: 3, amount: new BigNumber(6) }]
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

      const interests = await bob.rpc.loan.getInterest('scheme')

      const tslaInterest = interests.find(i => i.token === 'TSLA')
      const tslaTotalInterest = tslaInterest?.totalInterest.toFixed(8)
      expect(tslaTotalInterest).toStrictEqual('0.00000799')
      const tslaInterestPerBlk = tslaInterest?.interestPerBlock.toFixed(8)
      expect(tslaInterestPerBlk).toStrictEqual('0.00000799')

      const amzInterest = interests.find(i => i.token === 'AMZN')
      const amzTotalInterest = amzInterest?.totalInterest.toFixed(8)
      expect(amzTotalInterest).toStrictEqual('0.00000172')
      const amzInterestPerBlk = amzInterest?.interestPerBlock.toFixed(8)
      expect(amzInterestPerBlk).toStrictEqual('0.00000172')

      const vaultAfter = await bob.container.call('getvault', [bobVaultId])
      expect(vaultAfter.loanAmounts).toStrictEqual(['14.00013013@TSLA', '3.00003768@AMZN'])
      expect(vaultAfter.interestAmounts).toStrictEqual(['0.00000799@TSLA', '0.00000172@AMZN'])
      expect(vaultAfter.loanValue).toStrictEqual(40.00041098)
      expect(vaultAfter.interestValue).toStrictEqual(0.00002286)
      expect(vaultAfter.collateralRatio).toStrictEqual(37500)
      expect(vaultAfter.informativeRatio).toStrictEqual(37499.6147102)

      const loanTokenAccAfter = await bob.container.call('getaccount', [bobColAddr])
      expect(loanTokenAccAfter).toStrictEqual(['14.00000000@TSLA', '3.00000000@AMZN']) // (27 - 13), (9 - 6)

      const burnInfoAfter = await bob.container.call('getburninfo')
      expect(burnInfoAfter.paybackburn).toStrictEqual(0.00002804)
    }
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
    await alice.generate(6)

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
    const vault = await bob.rpc.loan.getVault(bobVaultId)
    expect(vault.loanAmounts).toStrictEqual(['40.00002283@TSLA'])

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
    await expect(promise).rejects.toThrow('amount 0.00000000 is less than 0.00006849')
  })
})
