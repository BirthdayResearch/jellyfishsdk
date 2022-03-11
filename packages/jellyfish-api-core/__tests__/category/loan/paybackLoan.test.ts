import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys, StartFlags, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
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

    // generate another 10 blocks and confirm that vaults does not accumulate interests once paid back fully
    {
      await bob.generate(10)
      const vaultWayAfterPayback = await bob.container.call('getvault', [bobVaultId])
      expect(vaultWayAfterPayback).toStrictEqual(vaultAfter)
    }
  })

  it('should paybackLoan when loan amount is only 1 sat', async () => {
    const burntInfoBefore = await alice.rpc.account.getBurnInfo()
    expect(burntInfoBefore.amount).toStrictEqual(new BigNumber(0))
    expect(burntInfoBefore.tokens).toHaveLength(0)

    // create new vault
    const vaultOwnerAddress = await alice.generateAddress()
    const vaultId = await alice.rpc.loan.createVault({
      ownerAddress: vaultOwnerAddress,
      loanSchemeId: 'scheme'
    })
    await alice.container.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: vaultId, from: aliceColAddr, amount: '100@DFI'
    })
    await alice.container.generate(1)

    const aliceLoanAddr = await alice.generateAddress()
    await alice.rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: ['0.00000001@TSLA'],
      to: aliceLoanAddr
    })
    await alice.container.generate(1)

    const vault = await alice.rpc.loan.getVault(vaultId) as VaultActive
    expect(vault.interestAmounts).toStrictEqual(['0.00000001@TSLA'])
    expect(vault.loanAmounts).toStrictEqual(['0.00000002@TSLA'])

    // payback loan
    await alice.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: '0.00000001@TSLA', // try pay over loan amount
      from: aliceColAddr
    })
    await alice.container.generate(1)

    const vaultAfter = await alice.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfter.interestAmounts).toStrictEqual(['0.00000001@TSLA'])
    expect(vaultAfter.loanAmounts).toStrictEqual(['0.00000002@TSLA'])

    await alice.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: '0.00000002@TSLA',
      from: aliceColAddr
    })
    await alice.container.generate(1)

    const vaultAfterFullPayback = await alice.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfterFullPayback.loanAmounts).toHaveLength(0)
    const burntInfoAfter = await alice.rpc.account.getBurnInfo()
    expect(burntInfoAfter.amount).toStrictEqual(new BigNumber(0))
    expect(burntInfoAfter.tokens).toHaveLength(0)
  })

  it('should paybackLoan partially', async () => {
    const burnInfoBefore = await bob.container.call('getburninfo')
    expect(burnInfoBefore.paybackburn).toStrictEqual(0)

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
    const tslaInterestsPerBlockAfter = new BigNumber(40).minus(loanDecreasedAfterPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
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
    expect(burnInfoAfter.paybackburn).toStrictEqual(0.00000456)
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
    expect(vaultAfter.collateralRatio).toStrictEqual(23437) // 15000 / (64.00008222) * 100
    expect(vaultAfter.informativeRatio).toStrictEqual(23437.46989017)
  })

  it('should paybackLoan more than one amount', async () => {
    const burnInfoBefore = await bob.container.call('getburninfo')
    expect(burnInfoBefore.paybackburn).toStrictEqual(0)

    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: ['15@AMZN'],
      to: bobloanAddr
    })
    await bob.generate(1)
    const amznLoanHeight = await bob.container.getBlockCount()

    const loanTokenAccBefore = await bob.container.call('getaccount', [bobloanAddr])
    expect(loanTokenAccBefore).toStrictEqual(['40.00000000@TSLA', '15.00000000@AMZN'])

    const tslaTokenAmt = loanTokenAccBefore.find((amt: string) => amt.split('@')[1] === 'TSLA')
    const tslaAmt = Number(tslaTokenAmt.split('@')[0])
    const amznTokenAmt = loanTokenAccBefore.find((amt: string) => amt.split('@')[1] === 'AMZN')
    const amznAmt = Number(amznTokenAmt.split('@')[0])

    const tslaInterestPerBlockBeforePayback = new BigNumber(netInterest * tslaAmt / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    const amznInterestPerBlockBeforePayback = new BigNumber(netInterest * amznAmt / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay

    const tslaPaybackAmount = 13
    const amznPaybackAmount = 6

    let tslaInterestPerBlockAfterFirstPayback: BigNumber
    let amznInterestPerBlockAfterFirstPayback: BigNumber
    let tslaInterestPerBlockAfterSecondPayback: BigNumber
    let amznInterestPerBlockAfterSecondPayback: BigNumber
    let tslaLoanAmountAfterFirstPayback: BigNumber
    let amznLoanAmountAfterFirstPayback: BigNumber
    let tslaLoanRemainingAfterFirstPayback: BigNumber
    let amznLoanRemainingAfterFirstPayback: BigNumber
    {
      // first paybackLoan
      const blockHeight = await bob.container.getBlockCount()

      // tsla interest
      const tslaTotalInterest = tslaInterestPerBlockBeforePayback.multipliedBy(blockHeight + 1 - tslaLoanHeight)

      // amzn interest
      const amznTotalInterest = amznInterestPerBlockBeforePayback.multipliedBy(blockHeight + 1 - amznLoanHeight)

      const interestsBefore = await bob.rpc.loan.getInterest('scheme')

      const tslaInterest = interestsBefore.find(i => i.token === 'TSLA')
      const tslaTotalInt = tslaInterest!.totalInterest.toFixed(8)
      expect(tslaTotalInt).toStrictEqual(tslaTotalInterest.toFixed(8, BigNumber.ROUND_CEIL))
      const tslaInterestPerBlk = tslaInterest?.interestPerBlock.toFixed(8)
      expect(tslaInterestPerBlk).toStrictEqual(tslaInterestPerBlockBeforePayback.toFixed(8, BigNumber.ROUND_CEIL))

      const amzInterest = interestsBefore.find(i => i.token === 'AMZN')
      const amzTotalInt = amzInterest!.totalInterest.toFixed(8)
      expect(amzTotalInt).toStrictEqual(amznTotalInterest.toFixed(8, BigNumber.ROUND_CEIL))
      const amzInterestPerBlk = amzInterest?.interestPerBlock.toFixed(8)
      expect(amzInterestPerBlk).toStrictEqual(amznInterestPerBlockBeforePayback.toFixed(8, BigNumber.ROUND_CEIL))

      const tslaLoanAmountBefore = (new BigNumber(40)).plus(tslaTotalInterest).dp(8, BigNumber.ROUND_CEIL)
      const amznLoanAmountBefore = (new BigNumber(15)).plus(amznTotalInterest).dp(8, BigNumber.ROUND_CEIL)

      const vaultBefore = await bob.container.call('getvault', [bobVaultId])
      expect(vaultBefore.loanAmounts).toStrictEqual([`${tslaLoanAmountBefore.toFixed(8)}@TSLA`, `${amznLoanAmountBefore.toFixed(8)}@AMZN`])
      expect(vaultBefore.interestAmounts).toStrictEqual([`${tslaTotalInt}@TSLA`, `${amzTotalInt}@AMZN`])
      expect(vaultBefore.loanValue).toStrictEqual(tslaLoanAmountBefore.multipliedBy(2).plus(amznLoanAmountBefore.multipliedBy(4)).toNumber()) // (40.00004567 * 2) + (15.00000857* 4)
      expect(vaultBefore.collateralRatio).toStrictEqual(10714) // 15000 / 140.00012564 * 100
      expect(vaultBefore.informativeRatio).toStrictEqual(10714.27610051)

      const txid = await bob.rpc.loan.paybackLoan({
        vaultId: bobVaultId,
        amounts: [`${tslaPaybackAmount}@TSLA`, `${amznPaybackAmount}@AMZN`],
        from: bobloanAddr
      })

      const tslaLoanDecreasedAfterFirstPayback = new BigNumber(tslaPaybackAmount).minus(tslaTotalInterest.decimalPlaces(8, BigNumber.ROUND_CEIL))
      const amznLoanDecreasedAfterFirstPayback = new BigNumber(amznPaybackAmount).minus(amznTotalInterest.decimalPlaces(8, BigNumber.ROUND_CEIL))
      tslaLoanRemainingAfterFirstPayback = new BigNumber(tslaAmt).minus(tslaLoanDecreasedAfterFirstPayback)
      amznLoanRemainingAfterFirstPayback = new BigNumber(amznAmt).minus(amznLoanDecreasedAfterFirstPayback)
      tslaInterestPerBlockAfterFirstPayback = tslaLoanRemainingAfterFirstPayback.multipliedBy(new BigNumber(netInterest)).dividedBy(new BigNumber(365 * blocksPerDay))
      amznInterestPerBlockAfterFirstPayback = amznLoanRemainingAfterFirstPayback.multipliedBy(new BigNumber(netInterest)).dividedBy(new BigNumber(365 * blocksPerDay))

      expect(typeof txid).toStrictEqual('string')
      await bob.generate(1)

      const vaultAfter = await bob.container.call('getvault', [bobVaultId])
      const tslaInterestAfter1stPayment = tslaInterestPerBlockAfterFirstPayback
      const amznInterestAfter1stPayment = amznInterestPerBlockAfterFirstPayback

      // previous loan amount(rounded) - repaid loan amount + current total interest amount
      tslaLoanAmountAfterFirstPayback = tslaLoanAmountBefore.minus(new BigNumber(tslaPaybackAmount)).plus(tslaInterestPerBlockAfterFirstPayback.dp(8, BigNumber.ROUND_CEIL))
      amznLoanAmountAfterFirstPayback = amznLoanAmountBefore.minus(new BigNumber(amznPaybackAmount)).plus(amznInterestPerBlockAfterFirstPayback.dp(8, BigNumber.ROUND_CEIL))

      expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfterFirstPayback.toFixed(8)}@TSLA`, `${amznLoanAmountAfterFirstPayback.toFixed(8)}@AMZN`])
      expect(vaultAfter.interestAmounts).toStrictEqual([`${tslaInterestAfter1stPayment.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`, `${amznInterestAfter1stPayment.toFixed(8, BigNumber.ROUND_CEIL)}@AMZN`])
      expect(vaultAfter.loanValue).toStrictEqual(tslaLoanAmountAfterFirstPayback.multipliedBy(2).plus(amznLoanAmountAfterFirstPayback.multipliedBy(4)).toNumber())
      expect(vaultAfter.interestValue).toStrictEqual(tslaInterestAfter1stPayment.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2).plus(amznInterestAfter1stPayment.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(4)).toNumber())
      expect(vaultAfter.collateralRatio).toStrictEqual(16667)
      expect(vaultAfter.informativeRatio).toStrictEqual(16666.63388524)

      const loanTokenAccAfter = await bob.container.call('getaccount', [bobloanAddr])
      expect(loanTokenAccAfter).toStrictEqual(['27.00000000@TSLA', '9.00000000@AMZN'])

      const burnInfoAfter = await bob.container.call('getburninfo')
      expect(burnInfoAfter.paybackburn).toStrictEqual(0.00000998)
    }

    // second paybackLoan
    {
      const txid2 = await bob.rpc.loan.paybackLoan({
        vaultId: bobVaultId,
        amounts: [`${tslaPaybackAmount}@TSLA`, `${amznPaybackAmount}@AMZN`],
        from: bobloanAddr
      })

      const tslaLoanDecreasedAfterSecondPayback = new BigNumber(tslaPaybackAmount).minus(tslaInterestPerBlockAfterFirstPayback.decimalPlaces(8, BigNumber.ROUND_CEIL))
      const amznLoanDecreasedAfterSecondPayback = new BigNumber(amznPaybackAmount).minus(amznInterestPerBlockAfterFirstPayback.decimalPlaces(8, BigNumber.ROUND_CEIL))
      tslaInterestPerBlockAfterSecondPayback = tslaLoanRemainingAfterFirstPayback.minus(new BigNumber(tslaLoanDecreasedAfterSecondPayback)).multipliedBy(netInterest).dividedBy(new BigNumber(365 * blocksPerDay))
      amznInterestPerBlockAfterSecondPayback = amznLoanRemainingAfterFirstPayback.minus(new BigNumber(amznLoanDecreasedAfterSecondPayback)).multipliedBy(netInterest).dividedBy(new BigNumber(365 * blocksPerDay))

      expect(typeof txid2).toStrictEqual('string')
      await bob.generate(1)

      const interests = await bob.rpc.loan.getInterest('scheme')

      const tslaInterest = interests.find(i => i.token === 'TSLA')
      const tslaTotalInterest = tslaInterest!.totalInterest.toFixed(8, BigNumber.ROUND_CEIL)
      expect(tslaTotalInterest).toStrictEqual(tslaInterestPerBlockAfterSecondPayback.toFixed(8, BigNumber.ROUND_CEIL)) // (1 block * interest per block) (old interest has been wiped out)
      const tslaInterestPerBlk = tslaInterest!.interestPerBlock.toFixed(8)
      expect(tslaInterestPerBlk).toStrictEqual(tslaInterestPerBlockAfterSecondPayback.toFixed(8, BigNumber.ROUND_CEIL))

      const amzInterest = interests.find(i => i.token === 'AMZN')
      const amzTotalInterest = amzInterest!.totalInterest.toFixed(8, BigNumber.ROUND_CEIL)
      expect(amzTotalInterest).toStrictEqual(amznInterestPerBlockAfterSecondPayback.toFixed(8, BigNumber.ROUND_CEIL))
      const amzInterestPerBlk = amzInterest!.interestPerBlock.toFixed(8)
      expect(amzInterestPerBlk).toStrictEqual(amznInterestPerBlockAfterSecondPayback.toFixed(8, BigNumber.ROUND_CEIL))

      const vaultAfter = await bob.container.call('getvault', [bobVaultId])

      // interest after second payback
      const tslaInterestAfter2ndPayment = tslaInterestPerBlockAfterSecondPayback
      const amznInterstAfter2ndPayment = amznInterestPerBlockAfterSecondPayback

      // previous loan amount(rounded) - repaid loan amount + current total interest amount
      const tslaLoanAmountAfter2ndPayment = tslaLoanAmountAfterFirstPayback.minus(new BigNumber(tslaPaybackAmount)).plus(tslaInterestAfter2ndPayment.decimalPlaces(8, BigNumber.ROUND_CEIL))
      const amznLoanAmountAfter2ndPayment = amznLoanAmountAfterFirstPayback.minus(new BigNumber(amznPaybackAmount)).plus(amznInterstAfter2ndPayment.decimalPlaces(8, BigNumber.ROUND_CEIL))

      expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfter2ndPayment.toFixed(8)}@TSLA`, `${amznLoanAmountAfter2ndPayment.toFixed(8)}@AMZN`])
      expect(vaultAfter.interestAmounts).toStrictEqual([`${tslaInterestAfter2ndPayment.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`, `${amznInterstAfter2ndPayment.toFixed(8, BigNumber.ROUND_CEIL)}@AMZN`])
      expect(vaultAfter.loanValue).toStrictEqual(tslaLoanAmountAfter2ndPayment.multipliedBy(2).plus(amznLoanAmountAfter2ndPayment.multipliedBy(4)).toNumber())
      expect(vaultAfter.interestValue).toStrictEqual(tslaInterestAfter2ndPayment.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2).plus(amznInterstAfter2ndPayment.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(4)).toNumber())
      expect(vaultAfter.collateralRatio).toStrictEqual(37500)
      expect(vaultAfter.informativeRatio).toStrictEqual(37499.81259468)

      const loanTokenAccAfter = await bob.container.call('getaccount', [bobloanAddr])
      expect(loanTokenAccAfter).toStrictEqual(['14.00000000@TSLA', '3.00000000@AMZN']) // (27 - 13), (9 - 6)

      const burnInfoAfter = await bob.container.call('getburninfo')
      expect(burnInfoAfter.paybackburn).toStrictEqual(0.00001356)
    }
  })

  it('should paybackLoan with utxos', async () => {
    const tslaInterestPerBlockBefore = new BigNumber(netInterest * 40 / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    const height = await bob.container.getBlockCount()
    const tslaInterestTotalBefore = tslaInterestPerBlockBefore.multipliedBy(height + 1 - tslaLoanHeight)
    const tslaLoanAmountBefore = tslaInterestTotalBefore.plus(new BigNumber(40)).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const tslaLoanValueBefore = tslaLoanAmountBefore.multipliedBy(new BigNumber(2)) // loanAmount * 2 (1 TSLA = 2 USD)
    const tslaInterestValueBefore = tslaInterestTotalBefore.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(new BigNumber(2))

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.loanAmounts).toStrictEqual([`${tslaLoanAmountBefore.toFixed(8)}@TSLA`]) // 40 + totalInterest
    expect(vaultBefore.interestAmounts).toStrictEqual([`${tslaInterestTotalBefore.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`])
    expect(vaultBefore.loanValue).toStrictEqual(tslaLoanValueBefore.toNumber())
    expect(vaultBefore.interestValue).toStrictEqual(tslaInterestValueBefore.toNumber())
    expect(vaultBefore.collateralRatio).toStrictEqual(18750) // (15000 / tslaLoanValueBefore) * 100
    expect(vaultBefore.informativeRatio).toStrictEqual(18749.98929375)

    const utxo = await bob.container.fundAddress(bobloanAddr, 250) // one extra block has been generate here and so the interest has been increased here

    const heightAfterFundAddress = await bob.container.getBlockCount()
    const totalTslaInterestAfterFundAddress = tslaInterestPerBlockBefore.multipliedBy(heightAfterFundAddress + 1 - tslaLoanHeight)

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
    const loanDecreasedAfterPayback = new BigNumber(tslaPaybackAmount).minus(totalTslaInterestAfterFundAddress.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const tslaInterestPerBlockAfter = new BigNumber(40).minus(loanDecreasedAfterPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    const tslaInterestTotalAfter = tslaInterestPerBlockAfter.multipliedBy(1)
    const tslaLoanAmountAfter = new BigNumber(40).minus(loanDecreasedAfterPayback).plus(tslaInterestTotalAfter).decimalPlaces(8, BigNumber.ROUND_CEIL)// tslaLoanAmountBefore - loanDecreasedAfter + tslaInterestTotalAfter

    const tslaLoanValueAfter = tslaLoanAmountAfter.multipliedBy(new BigNumber(2)) // loanAmount * 2 (1 TSLA = 2 USD)
    const tslaInterestValueAfter = tslaInterestTotalAfter.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(new BigNumber(2))

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfter.toFixed(8)}@TSLA`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${tslaInterestTotalAfter.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`])
    expect(vaultAfter.loanValue).toStrictEqual(tslaLoanValueAfter.toNumber())
    expect(vaultAfter.interestValue).toStrictEqual(tslaInterestValueAfter.toNumber())
    expect(vaultAfter.collateralRatio).toStrictEqual(27778) // (15000 / tslaLoanValueAfter) * 100
    expect(vaultAfter.informativeRatio).toStrictEqual(27777.71492812)

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

    const BN = BigNumber.clone({ DECIMAL_PLACES: 40 })
    const dusdInterestPerBlock = new BN(netInterest * 19).dividedBy(new BN(365 * blocksPerDay))

    const interestBefore = await bob.rpc.loan.getInterest('scheme', 'DUSD')
    expect(interestBefore.length).toStrictEqual(1)
    expect(interestBefore[0].token.toString()).toStrictEqual('DUSD')
    expect(interestBefore[0].realizedInterestPerBlock.toString()).toStrictEqual(dusdInterestPerBlock.dp(24, BN.ROUND_FLOOR).toString())
    expect(interestBefore[0].interestPerBlock.toFixed(8)).toStrictEqual(dusdInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL))
    expect(interestBefore[0].totalInterest.toFixed(8)).toStrictEqual(dusdInterestPerBlock.multipliedBy(1).toFixed(8, BigNumber.ROUND_CEIL))

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
})

describe('paybackLoan before FortCanningHeight', () => {
  let tGroupFCH: TestingGroup
  let loanTokenMinter: Testing
  let testing: Testing
  let colAddr: string
  let vaultId: string
  const tslaLoanAmount = 10

  async function setupFCHContainer (fchBlockHeight: number): Promise<void> {
    tGroupFCH = TestingGroup.create(2)
    const startFlags: StartFlags[] = [{ name: 'fortcanninghillheight', value: fchBlockHeight }]
    await tGroupFCH.start({ startFlags: startFlags })
    loanTokenMinter = tGroupFCH.get(0)
    testing = tGroupFCH.get(1)
    await loanTokenMinter.container.waitForWalletCoinbaseMaturity()
    await tGroupFCH.waitForSync()
  }

  async function setupVault (): Promise<void> {
    const loanTokenColAddr = await loanTokenMinter.generateAddress()
    colAddr = await testing.generateAddress()

    await loanTokenMinter.token.dfi({ address: loanTokenColAddr, amount: 10000000 })
    await loanTokenMinter.generate(1)
    await tGroupFCH.waitForSync()
    await testing.token.dfi({ address: colAddr, amount: 10000000 })
    await testing.generate(1)
    await tGroupFCH.waitForSync()

    const timestamp = Math.floor(new Date().getTime() / 1000)
    const oracleAddress = await loanTokenMinter.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' }
    ]
    const prices = {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '1@DUSD', currency: 'USD' },
        { tokenAmount: '2@TSLA', currency: 'USD' }
      ]
    }
    const oracleId = await loanTokenMinter.rpc.oracle.appointOracle(oracleAddress, priceFeeds, { weightage: 1 })
    await loanTokenMinter.generate(1)
    await loanTokenMinter.rpc.oracle.setOracleData(oracleId, timestamp, prices)
    await loanTokenMinter.generate(1)

    // set up collateral and loan token
    await loanTokenMinter.rpc.loan.setCollateralToken(
      {
        token: 'DFI',
        factor: new BigNumber(1),
        fixedIntervalPriceId: 'DFI/USD'
      }
    )
    await loanTokenMinter.generate(1)

    await loanTokenMinter.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await loanTokenMinter.generate(1)

    await loanTokenMinter.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await loanTokenMinter.generate(1)

    // create loan scheme
    const schemeId = 'scheme'
    await loanTokenMinter.rpc.loan.createLoanScheme(
      {
        minColRatio: 150,
        interestRate: new BigNumber(3),
        id: schemeId
      })
    await loanTokenMinter.generate(1)

    // create loan token vault
    const loanTokenVaultAddr = await loanTokenMinter.generateAddress()
    const loanTokenVaultId = await loanTokenMinter.rpc.loan.createVault({
      ownerAddress: loanTokenVaultAddr,
      loanSchemeId: schemeId
    })
    await loanTokenMinter.generate(1)

    // add dfi as collateral
    await loanTokenMinter.rpc.loan.depositToVault({
      vaultId: loanTokenVaultId, from: loanTokenColAddr, amount: '1000000@DFI'
    })
    await loanTokenMinter.generate(1)

    // take TSLA as loan
    await loanTokenMinter.rpc.loan.takeLoan({
      vaultId: loanTokenVaultId,
      to: loanTokenColAddr,
      amounts: '10000@TSLA'
    })
    await loanTokenMinter.generate(1)

    // take dusd as loan and create pool TSLA-DUSD
    await loanTokenMinter.rpc.loan.takeLoan({
      vaultId: loanTokenVaultId,
      to: loanTokenColAddr,
      amounts: '10000@DUSD'
    })
    await loanTokenMinter.generate(1)

    // create TSLA-DUSD
    await loanTokenMinter.poolpair.create({
      tokenA: 'TSLA',
      tokenB: 'DUSD',
      ownerAddress: aliceColAddr
    })
    await loanTokenMinter.generate(1)

    // add TSLA-DUSD
    await loanTokenMinter.poolpair.add({
      a: { symbol: 'TSLA', amount: 200 },
      b: { symbol: 'DUSD', amount: 100 }
    })
    await loanTokenMinter.generate(1)

    // create DUSD-DFI
    await loanTokenMinter.poolpair.create({
      tokenA: 'DUSD',
      tokenB: 'DFI'
    })
    await loanTokenMinter.generate(1)

    // add DUSD-DFI
    await loanTokenMinter.poolpair.add({
      a: { symbol: 'DUSD', amount: 250 },
      b: { symbol: 'DFI', amount: 100 }
    })

    await loanTokenMinter.generate(1)
    await tGroupFCH.waitForSync()

    // transfer TSLA to other account
    await loanTokenMinter.rpc.account.accountToAccount(loanTokenColAddr, { [colAddr]: '1000@TSLA' })
    await loanTokenMinter.generate(1)
    await tGroupFCH.waitForSync()

    // create vault and take TSLA as loan
    vaultId = await testing.rpc.loan.createVault({
      ownerAddress: colAddr,
      loanSchemeId: schemeId
    })
    await testing.generate(1)

    await testing.rpc.loan.depositToVault({
      vaultId: vaultId, from: colAddr, amount: '1000000@DFI'
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId: vaultId,
      to: colAddr,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    await testing.generate(1)
    await tGroupFCH.waitForSync()
  }

  afterEach(async () => {
    await tGroupFCH.stop()
  })

  it('should fail partial payback when interest becomes zero for pre FCH, and should success the same post FCH', async () => {
    const fchBlockHeight = 150
    await setupFCHContainer(fchBlockHeight)
    await setupVault()

    // payback loan
    await testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: '2@TSLA',
      from: colAddr
    })
    await testing.generate(1)
    await tGroupFCH.waitForSync()

    await testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: '2@TSLA',
      from: colAddr
    })
    await testing.generate(1)
    await tGroupFCH.waitForSync()

    await testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: '2@TSLA',
      from: colAddr
    })
    await testing.generate(1)
    await tGroupFCH.waitForSync()

    await testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: '2@TSLA',
      from: colAddr
    })
    await testing.generate(1)
    await tGroupFCH.waitForSync()

    const promise = testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: '2@TSLA',
      from: colAddr
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test PaybackLoanTx execution failed:\nCannot payback this amount of loan for TSLA, either payback full amount or less than this amount!\', code: -32600, method: paybackloan')

    await testing.container.waitForBlockHeight(fchBlockHeight)
    const blockInfo = await testing.rpc.blockchain.getBlockchainInfo()
    expect(blockInfo.softforks.fortcanninghill.active).toBeTruthy()

    // payback loan
    const successfulPaybackPromise = testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: '2@TSLA',
      from: colAddr
    })
    await expect(successfulPaybackPromise).resolves.not.toThrow()
  })

  it('should be able to payback loan post Fort Canning Hill hardfork', async () => {
    await setupFCHContainer(10)
    await setupVault()

    // payback loan
    await testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: '2@TSLA',
      from: colAddr
    })
    await testing.generate(1)
    await tGroupFCH.waitForSync()

    await testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: '2@TSLA',
      from: colAddr
    })
    await testing.generate(1)
    await tGroupFCH.waitForSync()

    await testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: '2@TSLA',
      from: colAddr
    })
    await testing.generate(1)
    await tGroupFCH.waitForSync()

    await testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: '2@TSLA',
      from: colAddr
    })
    await testing.generate(1)
    await tGroupFCH.waitForSync()

    const promise = testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: '2@TSLA',
      from: colAddr
    })

    await expect(promise).resolves.not.toThrow()
  })
})

describe('paybackloan for any token', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  const dusdLoanAmount = 5000
  const tslaLoanAmount = 10
  const loanSchemeId = 'scheme'
  const attributeKey = 'ATTRIBUTES'
  let vaultId: string
  let tslaVaultId: string
  let vaultOwnerAddress: string
  let tslaTakeLoanBlockHeight: number
  let dusdTakeLoanBlockHeight: number
  let key: string
  let dusdId: string

  async function setupForDUSDLoan (): Promise<void> {
    vaultOwnerAddress = await testing.generateAddress()
    await testing.token.dfi({ amount: 1000000, address: vaultOwnerAddress })
    await testing.generate(1)

    // setup oracle
    const oracleAddress = await testing.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' }
    ]

    const oracleId = await testing.rpc.oracle.appointOracle(oracleAddress, priceFeeds, { weightage: 1 })
    await testing.generate(1)
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1000@TSLA', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DUSD', currency: 'USD' }] })
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

    await testing.rpc.loan.takeLoan({
      vaultId: tslaVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    tslaTakeLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()
    await testing.generate(1)
  }

  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
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
    expect(burnInfoBefore.paybackburn).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybackfee).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybacktokens).toStrictEqual([])

    let paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()
    await testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: `${dfiPaybackAmount}@DFI`,
      from: vaultOwnerAddress
    })

    await testing.generate(1)

    // price of dfi to dusd depends on the oracle, in this case 1 DFI = 1 DUSD
    // the default penalty rate is 1%
    const defaultPenaltyRate = 0.01
    let currentBlockHeight = await testing.rpc.blockchain.getBlockCount()
    const dfiUSDPrice = new BigNumber(1).multipliedBy(1 - defaultPenaltyRate) // (DFIUSD oracle price * (1 - penalty rate is %))
    const dusdPaybackAmount = new BigNumber(dfiPaybackAmount).multipliedBy(dfiUSDPrice)
    const dusdLoanDecreased = dusdPaybackAmount.minus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const dusdInterestPerBlockAfter = new BigNumber(dusdLoanAmount).minus(dusdLoanDecreased).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    let dusdInterestAmountAfter = dusdInterestPerBlockAfter.multipliedBy(currentBlockHeight - paybackLoanBlockHeight)
    const dusdLoanRemainingAfterFirstPayback = new BigNumber(dusdLoanAmount).minus(dusdLoanDecreased)
    const dusdLoanAmountAfter = dusdLoanRemainingAfterFirstPayback.plus(dusdInterestAmountAfter.decimalPlaces(8, BigNumber.ROUND_CEIL))
    let totalDfiPenalty = new BigNumber(dfiPaybackAmount).multipliedBy(defaultPenaltyRate)
    let totalDusdPaybackAmount = dusdPaybackAmount

    const tslaLoanAmountAfter = new BigNumber(tslaLoanAmount).plus(tslaInterestPerBlock.multipliedBy(currentBlockHeight - tslaTakeLoanBlockHeight + 1).decimalPlaces(8, BigNumber.ROUND_CEIL))

    const burnInfoAfterFirstPayback = await testing.rpc.account.getBurnInfo()
    expect(burnInfoAfterFirstPayback.paybackburn).toStrictEqual(totalDusdPaybackAmount.plus(totalDfiPenalty))
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
    await testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: `${dfiPaybackAmount}@DFI`,
      from: vaultOwnerAddress
    })
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
    expect(burnInfoAfterSecondPayback.paybackburn).toStrictEqual(totalDusdPaybackAmount.plus(totalDfiPenalty))
    expect(burnInfoAfterSecondPayback.dfipaybackfee).toStrictEqual(totalDfiPenalty)
    expect(burnInfoAfterSecondPayback.dfipaybacktokens).toStrictEqual([`${totalDusdPaybackAmount.toFixed(8)}@DUSD`])

    const vaultAfterSecondPayback = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfterSecondPayback.loanAmounts).toStrictEqual([`${dusdLoanAmountAfterSecondPayback.toFixed(8)}@DUSD`, `${tslaLoanAmountAfterSecondPayback.toFixed(8)}@TSLA`])
  })

  it('should be able to payback 1 sat of DUSD', async () => {
    await testing.rpc.masternode.setGov({ [attributeKey]: { [key]: 'true' } })
    await testing.generate(1)

    const vaultOneSatOwnerAddress = await testing.generateAddress()
    const vaultIdOneSat = await testing.rpc.loan.createVault({
      ownerAddress: vaultOneSatOwnerAddress,
      loanSchemeId: loanSchemeId
    })
    await testing.generate(1)

    const burnInfoBefore = await testing.rpc.account.getBurnInfo()
    expect(burnInfoBefore.paybackburn).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybackfee).toStrictEqual(new BigNumber(0))

    await testing.rpc.loan.depositToVault({
      vaultId: vaultIdOneSat,
      from: vaultOwnerAddress,
      amount: '100000@DFI'
    })
    await testing.generate(1)

    const accBefore = await testing.rpc.account.getTokenBalances(undefined, undefined, { symbolLookup: true })
    expect(accBefore).toContain('800000.00000000@DFI')

    const oneSat = 0.00000001
    await testing.rpc.loan.takeLoan({
      vaultId: vaultIdOneSat,
      to: vaultOwnerAddress,
      amounts: `${oneSat}@DUSD`
    })
    await testing.generate(1)

    const vaultBefore = await testing.rpc.loan.getVault(vaultIdOneSat) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual(['0.00000002@DUSD'])

    await testing.rpc.loan.paybackLoan({
      vaultId: vaultIdOneSat,
      amounts: `${oneSat}@DFI`,
      from: vaultOwnerAddress
    })
    await testing.generate(1)
    const accAfterFirstPayback = await testing.rpc.account.getTokenBalances(undefined, undefined, { symbolLookup: true })
    expect(accAfterFirstPayback).toContain('799999.99999999@DFI')

    const burnInfoFirstPayback = await testing.rpc.account.getBurnInfo()
    expect(burnInfoFirstPayback.paybackburn).toStrictEqual(new BigNumber(oneSat))
    expect(burnInfoFirstPayback.dfipaybackfee).toStrictEqual(new BigNumber(0))

    const vaultAfterFirstPayback = await testing.rpc.loan.getVault(vaultIdOneSat) as VaultActive
    expect(vaultAfterFirstPayback.loanAmounts).toStrictEqual(['0.00000002@DUSD'])

    await testing.rpc.loan.paybackLoan({
      vaultId: vaultIdOneSat,
      amounts: '0.00000005@DFI',
      from: vaultOwnerAddress
    })
    await testing.generate(1)

    const accAfterSecondPayback = await testing.rpc.account.getTokenBalances(undefined, undefined, { symbolLookup: true })
    expect(accAfterSecondPayback).toContain('799999.99999996@DFI')

    const burnInfoAfterSecondPayback = await testing.rpc.account.getBurnInfo()
    expect(burnInfoAfterSecondPayback.paybackburn).toStrictEqual(new BigNumber(oneSat * 4))
    expect(burnInfoAfterSecondPayback.dfipaybacktokens).toStrictEqual(['0.00000002@DUSD'])

    const vaultAfterSecondPayback = await testing.rpc.loan.getVault(vaultIdOneSat) as VaultActive
    expect(vaultAfterSecondPayback.loanAmounts).toHaveLength(0)
  })

  it('should be able to payback DUSD loan using DFI with excess DFI', async () => {
    await testing.rpc.masternode.setGov({ [attributeKey]: { [key]: 'true' } })
    await testing.generate(1)

    const burnInfoBefore = await testing.rpc.account.getBurnInfo()
    expect(burnInfoBefore.paybackburn).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybackfee).toStrictEqual(new BigNumber(0))
    expect(burnInfoBefore.dfipaybacktokens).toStrictEqual([])

    const dusdInterestPerBlock = new BigNumber(netInterest * dusdLoanAmount / (365 * blocksPerDay))
    const paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestAmountBefore = dusdInterestPerBlock.multipliedBy(new BigNumber(paybackLoanBlockHeight - dusdTakeLoanBlockHeight + 1))
    const dusdLoanAmountBefore = new BigNumber(dusdLoanAmount).plus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    // calculate how much dfi is required to pay off all dusd at a penalty rate of 1%
    // price of dfi to dusd depends on the oracle, in this case 1 DFI = 1 DUSD
    // dfi_needed = loan_amount/(price * ( 1 - penalty_rate))
    const dfiPaybackAmount = dusdLoanAmount + 1000
    const defaultPenaltyRate = 0.01
    const dfiEffectPriceAfterPenaltyRate = 1 * (1 - defaultPenaltyRate)
    const dfiNeededToPayOffDusd = dusdLoanAmountBefore.dividedBy(dfiEffectPriceAfterPenaltyRate).decimalPlaces(8, BigNumber.ROUND_CEIL)

    await testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: `${dfiPaybackAmount}@DFI`,
      from: vaultOwnerAddress
    })
    await testing.generate(1)

    const balanceDFIAfter = new BigNumber(900000).minus(dfiNeededToPayOffDusd)
    const accountAfter = await testing.rpc.account.getTokenBalances(undefined, undefined, { symbolLookup: true })
    expect(accountAfter).toContain(`${balanceDFIAfter.toFixed(8)}@DFI`)

    const totalDfiPenalty = dfiNeededToPayOffDusd.multipliedBy(defaultPenaltyRate)
    const totalDusdPaybackAmount = dusdLoanAmountBefore
    const burnInfoAfter = await testing.rpc.account.getBurnInfo()
    expect(burnInfoAfter.paybackburn.toFixed(8)).toStrictEqual(totalDusdPaybackAmount.plus(totalDfiPenalty).toFixed(8))
    expect(burnInfoAfter.dfipaybackfee.toFixed(8)).toStrictEqual(totalDfiPenalty.toFixed(8, BigNumber.ROUND_FLOOR))
    expect(burnInfoAfter.dfipaybacktokens).toStrictEqual([`${totalDusdPaybackAmount.toFixed(8)}@DUSD`])

    const vaultAfter = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfter.loanAmounts).toStrictEqual([])
    expect(vaultAfter.interestAmounts).toStrictEqual([])
  })

  it('should be able to payback DUSD loan using DFI - use loans property', async () => {
    const dusdInfo = await testing.rpc.token.getToken('DUSD')
    const dusdId: string = Object.keys(dusdInfo)[0]
    const paybackKey = `v0/token/${dusdId}/payback_dfi`
    const penaltyRateKey = `v0/token/${dusdId}/payback_dfi_fee_pct`
    const penaltyRate = 0.015

    await testing.rpc.masternode.setGov({ [attributeKey]: { [paybackKey]: 'true', [penaltyRateKey]: penaltyRate.toString() } })
    await testing.generate(1)

    const blockHeightBefore = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestPerBlockBefore = new BigNumber(netInterest * dusdLoanAmount / (365 * blocksPerDay))
    const dusdInterestAmountBefore = dusdInterestPerBlockBefore.multipliedBy(new BigNumber(blockHeightBefore - dusdTakeLoanBlockHeight + 1))
    const dusdLoanAmountBefore = new BigNumber(dusdLoanAmount).plus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultBefore = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${dusdLoanAmountBefore.toFixed(8)}@DUSD`])

    const dfiPaybackAmount = 100
    const paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()
    await testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      from: vaultOwnerAddress,
      loans: [{
        dToken: dusdId,
        amounts: `${dfiPaybackAmount}@DFI`
      }]
    })

    // Price of dfi to dusd depends on the oracle, in this case 1 DFI = 1 DUSD
    const effectiveDusdPerDfi = new BigNumber(1).multipliedBy(1 - penaltyRate) // (DUSD per DFI * (1 - penalty rate))
    const dusdPayback = new BigNumber(dfiPaybackAmount).multipliedBy(effectiveDusdPerDfi)
    const dusdLoanPayback = dusdPayback.minus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const dusdInterestPerBlockAfter = new BigNumber(dusdLoanAmount).minus(dusdLoanPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    const dusdLoanRemainingAfterFirstPayback = new BigNumber(dusdLoanAmount).minus(dusdLoanPayback)

    // Let some time, generate blocks
    await testing.generate(1)
    await testing.generate(1)

    const blockHeightAfter = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestAmountAfter = dusdInterestPerBlockAfter.multipliedBy(blockHeightAfter - paybackLoanBlockHeight)
    const dusdLoanAmountAfter = dusdLoanRemainingAfterFirstPayback.plus(dusdInterestAmountAfter.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultAfter = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfter.loanAmounts).toStrictEqual([`${dusdLoanAmountAfter.toFixed(8)}@DUSD`])
  })

  it('should be able to payback TSLA loan using DFI', async () => {
    await setupForTslaLoan()
    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    const tslaId: string = Object.keys(tslaInfo)[0]
    const paybackKey = `v0/token/${tslaId}/payback_dfi`
    const penaltyRateKey = `v0/token/${tslaId}/payback_dfi_fee_pct`
    const penaltyRate = 0.02

    await testing.rpc.masternode.setGov({ [attributeKey]: { [paybackKey]: 'true', [penaltyRateKey]: penaltyRate.toString() } })
    await testing.generate(1)

    const blockHeightBefore = await testing.rpc.blockchain.getBlockCount()
    const tslaInterestPerBlockBefore = new BigNumber(netInterest * tslaLoanAmount / (365 * blocksPerDay))
    const tslaInterestAmountBefore = tslaInterestPerBlockBefore.multipliedBy(new BigNumber(blockHeightBefore - tslaTakeLoanBlockHeight))
    const tslaLoanAmountBefore = new BigNumber(tslaLoanAmount).plus(tslaInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultBefore = await testing.rpc.loan.getVault(tslaVaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${tslaLoanAmountBefore.toFixed(8)}@TSLA`])

    const dfiPaybackAmount = 100
    const paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()
    await testing.rpc.loan.paybackLoan({
      vaultId: tslaVaultId,
      from: vaultOwnerAddress,
      loans: [{
        dToken: tslaId,
        amounts: `${dfiPaybackAmount}@DFI`
      }]
    })

    // Price of dfi to tsla depends on the oracle, in this case 1 DFI = 0.001 TSLA
    const effectiveTslaPerDfi = new BigNumber(0.001).multipliedBy(1 - penaltyRate) // (TSLA per DFI * (1 - penalty rate))
    const tslaPayback = new BigNumber(dfiPaybackAmount).multipliedBy(effectiveTslaPerDfi)
    const tslaLoanPayback = tslaPayback.minus(tslaInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const tslaInterestPerBlockAfter = new BigNumber(tslaLoanAmount).minus(tslaLoanPayback).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    const tslaLoanRemainingAfterFirstPayback = new BigNumber(tslaLoanAmount).minus(tslaLoanPayback)

    // Let some time, generate blocks
    await testing.generate(1)
    await testing.generate(1)

    const blockHeightAfter = await testing.rpc.blockchain.getBlockCount()
    const tslaInterestAmountAfter = tslaInterestPerBlockAfter.multipliedBy(blockHeightAfter - paybackLoanBlockHeight)
    const tslaLoanAmountAfter = tslaLoanRemainingAfterFirstPayback.plus(tslaInterestAmountAfter.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultAfter = await testing.rpc.loan.getVault(tslaVaultId) as VaultActive
    expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfter.toFixed(8)}@TSLA`])
  })

  it('should not payback DUSD loan using DFI when attribute is not enabled in setGov', async () => {
    let attribute = await testing.rpc.masternode.getGov(attributeKey)
    // eslint-disable-next-line no-prototype-builtins
    let isEnabledDfiPayback = (Boolean(attribute[attributeKey].hasOwnProperty(key))) && attribute[attributeKey][key] === 'true'
    expect(isEnabledDfiPayback).not.toBeTruthy()

    const dfiPaybackAmount = 100
    let promise = testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: `${dfiPaybackAmount}@DFI`,
      from: vaultOwnerAddress
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test PaybackLoanTx execution failed:\nPayback of loan via DFI token is not currently active\', code: -32600, method: paybackloan')

    await testing.rpc.masternode.setGov({ [attributeKey]: { [key]: 'false' } })
    await testing.container.generate(1)
    attribute = await testing.rpc.masternode.getGov(attributeKey)
    // eslint-disable-next-line no-prototype-builtins
    isEnabledDfiPayback = (Boolean(attribute[attributeKey].hasOwnProperty(key))) && attribute[attributeKey][key] === 'true'
    expect(isEnabledDfiPayback).not.toBeTruthy()

    promise = testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: `${dfiPaybackAmount}@DFI`,
      from: vaultOwnerAddress
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test PaybackLoanTx execution failed:\nPayback of loan via DFI token is not currently active\', code: -32600, method: paybackloan')
  })

  it('should not be able to payback TSLA loan using DFI', async () => {
    await setupForTslaLoan()
    await testing.rpc.masternode.setGov({ [attributeKey]: { [key]: 'true' } })
    await testing.generate(1)
    const currentHeight = await testing.rpc.blockchain.getBlockCount()
    const tslaInterestPerBlock = new BigNumber(netInterest * tslaLoanAmount / (365 * blocksPerDay)).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const tslaInterestAmount = tslaInterestPerBlock.multipliedBy(new BigNumber(currentHeight - tslaTakeLoanBlockHeight))
    const tslaLoanAmountBefore = new BigNumber(tslaLoanAmount).plus(tslaInterestAmount.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultBefore = await testing.rpc.loan.getVault(tslaVaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${tslaLoanAmountBefore.toFixed(8)}@TSLA`])

    const payBackPromise = testing.rpc.loan.paybackLoan({
      vaultId: tslaVaultId,
      amounts: '10000@DFI',
      from: vaultOwnerAddress
    })

    await expect(payBackPromise).rejects.toThrow('RpcApiError: \'Test PaybackLoanTx execution failed:\nThere is no loan on token (DUSD) in this vault!\', code: -32600, method: paybackloan')
  })

  it('should not be able to payback DUSD loan using other tokens', async () => {
    await setupForTslaLoan()
    await testing.rpc.masternode.setGov({ [attributeKey]: { [key]: 'true' } })
    await testing.generate(1)

    // payback dusd loan with tsla
    const paybackWithTslaPromise = testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      amounts: '1@TSLA',
      from: vaultOwnerAddress
    })

    await expect(paybackWithTslaPromise).rejects.toThrow('RpcApiError: \'Test PaybackLoanTx execution failed:\nThere is no loan on token (TSLA) in this vault!\', code: -32600, method: paybackloan')
  })
})
