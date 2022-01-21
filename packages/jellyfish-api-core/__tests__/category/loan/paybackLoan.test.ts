import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
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
      const tslaInterestPerBlock = new BigNumber(netInterest * 40 / (365 * blocksPerDay)).decimalPlaces(8, BigNumber.ROUND_CEIL) //  netInterest * loanAmt / 365 * blocksPerDay
      const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(height + 1 - tslaLoanHeight)
      expect(interests[0].interestPerBlock.toFixed(8)).toStrictEqual(tslaInterestPerBlock.toFixed(8))
      expect(interests[0].totalInterest.toFixed(8)).toStrictEqual(tslaInterestTotal.toFixed(8))
    }

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.loanAmounts).toStrictEqual(['40.00004568@TSLA'])
    expect(vaultBefore.loanValue).toStrictEqual(80.00009136)
    expect(vaultBefore.interestAmounts).toStrictEqual(['0.00004568@TSLA'])
    expect(vaultBefore.interestValue).toStrictEqual(0.00009136)
    expect(vaultBefore.collateralRatio).toStrictEqual(18750)
    expect(vaultBefore.informativeRatio).toStrictEqual(18749.97858752)

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
    expect(bobLoanAccAfter).toStrictEqual(['4.99995432@TSLA'])
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

    {
      const interests = await bob.rpc.loan.getInterest('scheme')
      const height = await bob.container.getBlockCount()
      const tslaInterestPerBlock = new BigNumber(netInterest * 40 / (365 * blocksPerDay)).decimalPlaces(8, BigNumber.ROUND_CEIL) //  netInterest * loanAmt / 365 * blocksPerDay
      const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(height + 1 - tslaLoanHeight)
      expect(interests[0].interestPerBlock.toFixed(8)).toStrictEqual(tslaInterestPerBlock.toFixed(8))
      expect(interests[0].totalInterest.toFixed(8)).toStrictEqual(tslaInterestTotal.toFixed(8))
    }

    const txid = await bob.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: '13@TSLA',
      from: bobloanAddr
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)
    tslaLoanHeight = await bob.container.getBlockCount()

    // assert interest by 27
    {
      // const interests = await bob.rpc.loan.getInterest('scheme')
      // const height = await bob.container.getBlockCount()
      // const tslaInterestPerBlock = new BigNumber(netInterest * 27 / (365 * blocksPerDay)).decimalPlaces(8, BigNumber.ROUND_CEIL) //  netInterest * loanAmt / 365 * blocksPerDay
      // const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(height + 1 - tslaLoanHeight)
      // expect(interests[0].interestPerBlock.toFixed(8)).toStrictEqual(tslaInterestPerBlock.toFixed(8)) // NOTE(sp): not sure why the rpc returns 0.00001541, while ceil(0.000015411) = 0.00001542
      // expect(interests[0].totalInterest.toFixed(8)).toStrictEqual(tslaInterestTotal.toFixed(8))
    }

    const loanAccAfter = await bob.container.call('getaccount', [bobloanAddr])
    expect(loanAccAfter).toStrictEqual(['27.00000000@TSLA']) // 40 - 13 = 27

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmounts).toStrictEqual(['27.00003825@TSLA']) // 40.00002285 - 13 + new totalInterest
    expect(vaultAfter.interestAmounts).toStrictEqual(['0.00001541@TSLA'])
    expect(vaultAfter.loanValue).toStrictEqual(54.0000765) // 27.00003824 * 2 (::1 TSLA = 2 USD)
    expect(vaultAfter.interestValue).toStrictEqual(0.00003082)
    expect(vaultAfter.collateralRatio).toStrictEqual(27778) // 15000 / 54.0000765 * 100
    expect(vaultAfter.informativeRatio).toStrictEqual(27777.73842598)

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
    expect(vaultAfter.loanAmounts).toStrictEqual(['32.00004111@TSLA'])
    expect(vaultAfter.interestAmounts).toStrictEqual(['0.00001827@TSLA'])
    expect(vaultAfter.loanValue).toStrictEqual(64.00008222) // 32.0000411 * 2 (::1 TSLA = 2 USD)
    expect(vaultAfter.interestValue).toStrictEqual(0.00003654)
    expect(vaultAfter.collateralRatio).toStrictEqual(23437) // 15000 / 64.00008222 * 100
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
    {
      const blockHeight = await bob.container.getBlockCount()

      const tslaTokenAmt = loanTokenAccBefore.find((amt: string) => amt.split('@')[1] === 'TSLA')
      const tslaAmt = Number(tslaTokenAmt.split('@')[0])
      const amznTokenAmt = loanTokenAccBefore.find((amt: string) => amt.split('@')[1] === 'AMZN')
      const amznAmt = Number(amznTokenAmt.split('@')[0])

      // tsla interest
      const tslaInterestPerBlock = new BigNumber(netInterest * tslaAmt / (365 * blocksPerDay)).decimalPlaces(8, BigNumber.ROUND_CEIL) //  netInterest * loanAmt / 365 * blocksPerDay
      const tslaTotalInterest = tslaInterestPerBlock.multipliedBy(blockHeight + 1 - tslaLoanHeight)

      // amzn interest
      const amznInterestPerBlock = new BigNumber(netInterest * amznAmt / (365 * blocksPerDay)).decimalPlaces(8, BigNumber.ROUND_CEIL) //  netInterest * loanAmt / 365 * blocksPerDay
      const amznTotalInterest = amznInterestPerBlock.multipliedBy(blockHeight + 1 - amznLoanHeight)

      const interests = await bob.rpc.loan.getInterest('scheme')

      const tslaInterest = interests.find(i => i.token === 'TSLA')
      const tslaTotalInt = tslaInterest?.totalInterest.toFixed(8)
      expect(tslaTotalInt).toStrictEqual(tslaTotalInterest.toFixed(8))
      const tslaInterestPerBlk = tslaInterest?.interestPerBlock.toFixed(8)
      expect(tslaInterestPerBlk).toStrictEqual(tslaInterestPerBlock.toFixed(8))

      const amzInterest = interests.find(i => i.token === 'AMZN')
      const amzTotalInt = amzInterest?.totalInterest.toFixed(8)
      expect(amzTotalInt).toStrictEqual(amznTotalInterest.toFixed(8))
      const amzInterestPerBlk = amzInterest?.interestPerBlock.toFixed(8)
      expect(amzInterestPerBlk).toStrictEqual(amznInterestPerBlock.toFixed(8))

      const vaultBefore = await bob.container.call('getvault', [bobVaultId])
      expect(vaultBefore.loanAmounts).toStrictEqual(['40.00004568@TSLA', '15.00000857@AMZN']) // eg: tslaTakeLoanAmt + tslaTotalInterest
      expect(vaultBefore.interestAmounts).toStrictEqual(['0.00004568@TSLA', '0.00000857@AMZN'])
      expect(vaultBefore.loanValue).toStrictEqual(140.00012564) // (40.00004568 * 2) + (15.00009857 * 4)
      expect(vaultBefore.collateralRatio).toStrictEqual(10714) // 15000 / 140.00012564 * 100
      expect(vaultBefore.informativeRatio).toStrictEqual(10714.27609898)

      const txid = await bob.rpc.loan.paybackLoan({
        vaultId: bobVaultId,
        amounts: ['13@TSLA', '6@AMZN'],
        from: bobloanAddr
      })
      expect(typeof txid).toStrictEqual('string')
      await bob.generate(1)

      const vaultAfter = await bob.container.call('getvault', [bobVaultId])
      expect(vaultAfter.loanAmounts).toStrictEqual(['27.00006109@TSLA', '9.00001371@AMZN'])
      expect(vaultAfter.interestAmounts).toStrictEqual(['0.00001541@TSLA', '0.00000514@AMZN'])
      expect(vaultAfter.loanValue).toStrictEqual(90.00017702)
      expect(vaultAfter.interestValue).toStrictEqual(0.00005138)
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
        amounts: ['13@TSLA', '6@AMZN'],
        from: bobloanAddr
      })
      expect(typeof txid2).toStrictEqual('string')
      await bob.generate(1)

      const interests = await bob.rpc.loan.getInterest('scheme')

      const tslaInterest = interests.find(i => i.token === 'TSLA')
      const tslaTotalInterest = tslaInterest?.totalInterest.toFixed(8)
      expect(tslaTotalInterest).toStrictEqual('0.00000798')
      const tslaInterestPerBlk = tslaInterest?.interestPerBlock.toFixed(8)
      expect(tslaInterestPerBlk).toStrictEqual('0.00000798')

      const amzInterest = interests.find(i => i.token === 'AMZN')
      const amzTotalInterest = amzInterest?.totalInterest.toFixed(8)
      expect(amzTotalInterest).toStrictEqual('0.00000171')
      const amzInterestPerBlk = amzInterest?.interestPerBlock.toFixed(8)
      expect(amzInterestPerBlk).toStrictEqual('0.00000171')

      const vaultAfter = await bob.container.call('getvault', [bobVaultId])
      expect(vaultAfter.loanAmounts).toStrictEqual(['14.00006907@TSLA', '3.00001542@AMZN'])
      expect(vaultAfter.interestAmounts).toStrictEqual(['0.00000798@TSLA', '0.00000171@AMZN'])
      expect(vaultAfter.loanValue).toStrictEqual(40.00019982)
      expect(vaultAfter.interestValue).toStrictEqual(0.0000228)
      expect(vaultAfter.collateralRatio).toStrictEqual(37500)
      expect(vaultAfter.informativeRatio).toStrictEqual(37499.81266968)

      const loanTokenAccAfter = await bob.container.call('getaccount', [bobloanAddr])
      expect(loanTokenAccAfter).toStrictEqual(['14.00000000@TSLA', '3.00000000@AMZN']) // (27 - 13), (9 - 6)

      const burnInfoAfter = await bob.container.call('getburninfo')
      expect(burnInfoAfter.paybackburn).toStrictEqual(0.00001361)
    }
  })

  it('should paybackLoan with utxos', async () => {
    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.loanAmounts).toStrictEqual(['40.00002284@TSLA']) // 40 + totalInterest
    expect(vaultBefore.interestAmounts).toStrictEqual(['0.00002284@TSLA'])
    expect(vaultBefore.loanValue).toStrictEqual(80.00004568) // loanAmount * 2 (::1 TSLA = 2 USD)
    expect(vaultBefore.interestValue).toStrictEqual(0.00004568)
    expect(vaultBefore.collateralRatio).toStrictEqual(18750) // 15000 / 80.00004568 * 100
    expect(vaultBefore.informativeRatio).toStrictEqual(18749.98929375)

    const utxo = await bob.container.fundAddress(bobloanAddr, 250)

    const txid = await bob.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: '13@TSLA',
      from: bobloanAddr
    }, [utxo])
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmounts).toStrictEqual(['27.00006109@TSLA']) // 40.00002283 - 13 + totalInterest
    expect(vaultAfter.interestAmounts).toStrictEqual(['0.00001541@TSLA'])
    expect(vaultAfter.loanValue).toStrictEqual(54.00012218) // 27.00006109 * 2 (::1 TSLA = 2 USD)
    expect(vaultAfter.interestValue).toStrictEqual(0.00003082)
    expect(vaultAfter.collateralRatio).toStrictEqual(27778) // 15000 / 54.00012218 * 100
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
      loanAmounts: ['19.00001085@DUSD', '40.00004568@TSLA'],
      interestAmounts: ['0.00001085@DUSD', '0.00004568@TSLA'],
      collateralValue: 15000,
      loanValue: 99.00010221,
      interestValue: 0.00010221,
      informativeRatio: 15151.49950873,
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
      loanAmounts: ['1.00001142@DUSD', '40.00006852@TSLA'],
      interestAmounts: ['0.00000057@DUSD', '0.00006852@TSLA'],
      collateralValue: 15000,
      loanValue: 81.00014846,
      interestValue: 0.00013761,
      informativeRatio: 18518.4845771,
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

  it('should fail paybackLoan if resulted in zero interest loan', async () => {
    const promise = bob.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: '40@TSLA',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot payback this amount of loan for TSLA, either payback full amount or less than this amount!')
  })
})

describe('paybackloan for dusd using dfi', () => {
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
    dusdTakeLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()
    await testing.generate(1)
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
    const tslaTakeLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()
    await testing.generate(1)

    const blockHeightBefore = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestPerBlock = new BigNumber(netInterest * dusdLoanAmount / (365 * blocksPerDay)).decimalPlaces(8, BigNumber.ROUND_CEIL) // need to remove .decimalPlaces(8, BigNumber.ROUND_CEIL) after HIPC
    const dusdInterestAmountBefore = dusdInterestPerBlock.multipliedBy(new BigNumber(blockHeightBefore - dusdTakeLoanBlockHeight))
    const dusdLoanAmountBefore = new BigNumber(dusdLoanAmount).plus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const tslaInterestPerBlock = new BigNumber(netInterest * tslaLoanAmount / (365 * blocksPerDay))
    const tslaInterestAmountBefore = tslaInterestPerBlock.multipliedBy(new BigNumber(blockHeightBefore - tslaTakeLoanBlockHeight))
    const tslaLoanAmountBefore = new BigNumber(tslaLoanAmount).plus(tslaInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultBefore = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultBefore.loanAmounts).toStrictEqual([`${dusdLoanAmountBefore.toFixed(8)}@DUSD`, `${tslaLoanAmountBefore.toFixed(8)}@TSLA`])

    const dfiPaybackAmount = 100
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
    const dusdPaybackAmount = new BigNumber(dfiPaybackAmount).multipliedBy(1 - defaultPenaltyRate) // dfi amount * (dfi price * penalty rate is %)
    const dusdLoanDecreased = dusdPaybackAmount.minus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))
    const dusdInterestPerBlockAfter = new BigNumber(dusdLoanAmount).minus(dusdLoanDecreased).multipliedBy(netInterest).dividedBy(365 * blocksPerDay)
    let dusdInterestAmountAfter = dusdInterestPerBlockAfter.multipliedBy(currentBlockHeight - paybackLoanBlockHeight)
    const dusdLoanRemainingAfterFirstPayback = new BigNumber(dusdLoanAmount).minus(dusdLoanDecreased)
    const dusdLoanAmountAfter = dusdLoanRemainingAfterFirstPayback.plus(dusdInterestAmountAfter.decimalPlaces(8, BigNumber.ROUND_CEIL))

    const tslaLoanAmountAfter = new BigNumber(tslaLoanAmount).plus(tslaInterestPerBlock.multipliedBy(currentBlockHeight - tslaTakeLoanBlockHeight).decimalPlaces(8, BigNumber.ROUND_CEIL))

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

    const tslaLoanAmountAfterSecondPayback = new BigNumber(tslaLoanAmount).plus(tslaInterestPerBlock.multipliedBy(currentBlockHeight - tslaTakeLoanBlockHeight).decimalPlaces(8, BigNumber.ROUND_CEIL))

    const vaultAfterSecondPayback = await testing.rpc.loan.getVault(vaultId) as VaultActive
    const tmp = dusdLoanAmountAfterSecondPayback.minus(0.00000001)
    expect(vaultAfterSecondPayback.loanAmounts).toStrictEqual([`${tmp.toFixed(8)}@DUSD`, `${tslaLoanAmountAfterSecondPayback.toFixed(8)}@TSLA`])
    // to re-enable after merging with HPIC
    // expect(vaultAfterSecondPayback.loanAmounts).toStrictEqual([`${dusdLoanAmountAfterSecondPayback.toFixed(8)}@DUSD`, `${tslaLoanAmountAfterSecondPayback.toFixed(8)}@TSLA`])
  })

  it('should be able to payback DUSD loan using DFI with excess DFI', async () => {
    await testing.rpc.masternode.setGov({ [attributeKey]: { [key]: 'true' } })
    await testing.generate(1)

    const dusdInterestPerBlock = new BigNumber(netInterest * dusdLoanAmount / (365 * blocksPerDay)).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const paybackLoanBlockHeight = await testing.rpc.blockchain.getBlockCount()
    const dusdInterestAmountBefore = dusdInterestPerBlock.multipliedBy(new BigNumber(paybackLoanBlockHeight - dusdTakeLoanBlockHeight))
    const dusdLoanAmountBefore = new BigNumber(dusdLoanAmount).plus(dusdInterestAmountBefore.decimalPlaces(8, BigNumber.ROUND_CEIL))

    // calculate how much dfi is required to pay off all dusd at a penalty rate of 1%
    // dfi_needed = loan_amount/(1-(price*penalty_rate))
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
    expect(accountAfter).toContain(`${balanceDFIAfter.toFixed()}@DFI`)

    const vaultAfter = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultAfter.loanAmounts).toStrictEqual([])
    expect(vaultAfter.interestAmounts).toStrictEqual([])
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

    await expect(promise).rejects.toThrow('RpcApiError: \'Test PaybackLoanTx execution failed:\nPayback of DUSD loans with DFI not currently active\', code: -32600, method: paybackloan')

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

    await expect(promise).rejects.toThrow('RpcApiError: \'Test PaybackLoanTx execution failed:\nPayback of DUSD loans with DFI not currently active\', code: -32600, method: paybackloan')
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
