import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys, StartFlags } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { VaultActive, VaultLiquidation } from '../../../src/category/loan'

const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)
let aliceAddr: string
let bobVaultId: string
let bobVaultAddr: string
let bobVault: VaultActive
let liqVaultId: string
let liqVaultAddr: string
let mayLiqVaultId: string
let mayLiqVaultAddr: string
let frozenVaultId: string
let frozenVaultAddr: string
let emptyVaultId: string
let emptyVaultAddr: string
let oracleId: string
let timestamp: number
const netInterest = (3 + 0) / 100 // (scheme.rate + loanToken.interest) / 100
const blocksPerDay = (60 * 60 * 24) / (10 * 60) // 144 in regtest

describe('takeLoan success', () => {
  beforeEach(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  async function setup (): Promise<void> {
    // token setup
    aliceAddr = await alice.container.getNewAddress()
    await alice.token.dfi({ address: aliceAddr, amount: 40000 })
    await alice.generate(1)
    await alice.token.create({ symbol: 'BTC', collateralAddress: aliceAddr })
    await alice.generate(1)
    await alice.token.mint({ symbol: 'BTC', amount: 40000 })
    await alice.generate(1)

    // oracle setup
    const addr = await alice.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'GOOGL', currency: 'USD' }
    ]
    oracleId = await alice.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await alice.generate(1)
    timestamp = Math.floor(new Date().getTime() / 1000)
    await alice.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: '1@DFI', currency: 'USD' },
          { tokenAmount: '10000@BTC', currency: 'USD' },
          { tokenAmount: '2@TSLA', currency: 'USD' },
          { tokenAmount: '4@GOOGL', currency: 'USD' }
        ]
      })
    await alice.generate(1)

    // collateral token
    await alice.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await alice.generate(1)

    await alice.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await alice.generate(1)

    // loan token
    await alice.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await alice.generate(1)

    await alice.rpc.loan.setLoanToken({
      symbol: 'GOOGL',
      fixedIntervalPriceId: 'GOOGL/USD'
    })
    await alice.generate(1)

    // loan scheme set up
    await alice.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    bobVaultAddr = await bob.generateAddress()
    bobVaultId = await bob.rpc.loan.createVault({
      ownerAddress: bobVaultAddr,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    // deposit on active vault
    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '10000@DFI'
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '1@BTC'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    bobVault = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(bobVault.loanSchemeId).toStrictEqual('scheme')
    expect(bobVault.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(bobVault.state).toStrictEqual('active')
    expect(bobVault.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@BTC'])
    expect(bobVault.collateralValue).toStrictEqual(new BigNumber(15000))
    expect(bobVault.loanAmounts).toStrictEqual([])
    expect(bobVault.loanValue).toStrictEqual(new BigNumber(0))
    expect(bobVault.interestAmounts).toStrictEqual([])
    expect(bobVault.interestValue).toStrictEqual(new BigNumber(0))
    expect(bobVault.collateralRatio).toStrictEqual(-1) // empty loan
    expect(bobVault.informativeRatio).toStrictEqual(new BigNumber(-1)) // empty loan
  }

  it('should takeLoan', async () => {
    const tslaLoanAmount = 40
    const txid = await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    const tslaLoanHeight = await bob.container.getBlockCount()
    const interests = await bob.rpc.loan.getInterest('scheme')

    // manually calculate interest to compare rpc getInterest above is working correctly
    const height = await bob.container.getBlockCount()
    const tslaInterestPerBlock = new BigNumber((netInterest * 40) / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    expect(tslaInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].interestPerBlock.toFixed(8))
    const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(new BigNumber(height - tslaLoanHeight + 1))
    expect(tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].totalInterest.toFixed(8))

    const tslaLoanAmountAfter = new BigNumber(tslaLoanAmount).plus(tslaInterestTotal).decimalPlaces(8, BigNumber.ROUND_CEIL)

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.loanSchemeId).toStrictEqual('scheme')
    expect(vaultAfter.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(vaultAfter.state).toStrictEqual('active')
    expect(vaultAfter.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(15000))
    expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfter.toFixed(8)}@TSLA`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`])
    expect(vaultAfter.loanValue).toStrictEqual(tslaLoanAmountAfter.multipliedBy(2))
    expect(vaultAfter.interestValue).toStrictEqual(tslaInterestTotal.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2))
    expect(vaultAfter.collateralRatio).toStrictEqual(18750)
    expect(vaultAfter.informativeRatio).toStrictEqual(new BigNumber(18749.98929375)) // (15000 / 80.00004568) * 100

    // check received loan via getTokenBalances while takeLoan without 'to'
    const tBalances = await bob.rpc.account.getTokenBalances()
    expect(tBalances).toStrictEqual(['40.00000000@2']) // tokenId: 2 is TSLA
  })

  it('should takeloan with specific "to" address', async () => {
    const tslaLoanAmount = 200
    const bobLoanAddr = await bob.generateAddress()
    const txid = await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`,
      to: bobLoanAddr
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)
    const tslaLoanHeight = await bob.container.getBlockCount()

    await bob.generate(12)
    const interests = await bob.rpc.loan.getInterest('scheme')
    const height = await bob.container.getBlockCount()
    const tslaInterestPerBlock = new BigNumber((netInterest * 200) / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    expect(tslaInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].interestPerBlock.toFixed(8))
    const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(height - tslaLoanHeight + 1)
    expect(tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].totalInterest.toFixed(8))

    const tslaLoanAmountAfter = new BigNumber(tslaLoanAmount).plus(tslaInterestTotal).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const tslaLoanValueAfter = tslaLoanAmountAfter.multipliedBy(2)
    const interestValueAfter = tslaInterestTotal.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2)

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive

    expect(vaultAfter.loanSchemeId).toStrictEqual('scheme')
    expect(vaultAfter.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(vaultAfter.state).toStrictEqual('active')
    expect(vaultAfter.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(15000))
    expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfter.toFixed(8)}@TSLA`])
    expect(vaultAfter.loanValue).toStrictEqual(new BigNumber(tslaLoanValueAfter.toFixed(8)))
    expect(vaultAfter.interestAmounts).toStrictEqual([`${tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`])
    expect(vaultAfter.interestValue).toStrictEqual(new BigNumber(interestValueAfter.toFixed(8)))
    expect(vaultAfter.collateralRatio).toStrictEqual(3750)
    expect(vaultAfter.informativeRatio).toStrictEqual(new BigNumber(3749.97217483)) // 15000 / (tslaLoanAmountAfter * 2) * 100

    const bobLoanAcc = await bob.rpc.account.getAccount(bobLoanAddr)
    expect(bobLoanAcc).toStrictEqual(['200.00000000@TSLA'])
  })

  it('should takeLoan with utxos', async () => {
    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    const vaultBeforeTSLAAcc = vaultBefore.loanAmounts.length > 0
      ? vaultBefore.loanAmounts.find((amt: string) => amt.split('@')[1] === 'TSLA')
      : undefined
    const vaultBeforeTSLAAmt = vaultBeforeTSLAAcc !== undefined ? Number(vaultBeforeTSLAAcc.split('@')[0]) : 0

    const utxo = await bob.container.fundAddress(bobVaultAddr, 250)
    const txid = await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: '5@TSLA'
    }, [utxo])
    await bob.generate(1)

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    const vaultAfterTSLAAcc = vaultAfter.loanAmounts.find((amt: string) => amt.split('@')[1] === 'TSLA')
    const vaultAfterTSLAAmt = Number(vaultAfterTSLAAcc.split('@')[0])
    expect(vaultAfterTSLAAmt - vaultBeforeTSLAAmt).toStrictEqual(5.00000286)

    const rawtx = await bob.container.call('getrawtransaction', [txid, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should take more than one loan', async () => {
    const tslaLoanAmount = 90
    const googleLoanAmount = 10

    const bobLoanAddr = await bob.generateAddress()
    const txid = await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: [`${tslaLoanAmount}@TSLA`, `${googleLoanAmount}@GOOGL`],
      to: bobLoanAddr
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    const loanHeight = await bob.container.getBlockCount()

    await bob.generate(12)
    const interests = await bob.rpc.loan.getInterest('scheme')
    const height = await bob.container.getBlockCount()
    const tslaInterestPerBlock = new BigNumber((netInterest * tslaLoanAmount) / (365 * blocksPerDay))
    expect(tslaInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].interestPerBlock.toFixed(8))
    const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(new BigNumber((height - loanHeight + 1)))
    expect(tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].totalInterest.toFixed(8))

    const googlInterestPerBlock = new BigNumber((netInterest * googleLoanAmount) / (365 * blocksPerDay))
    expect(googlInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[1].interestPerBlock.toFixed(8))
    const googlInterestTotal = googlInterestPerBlock.multipliedBy(new BigNumber((height - loanHeight + 1)))
    expect(googlInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[1].totalInterest.toFixed(8))

    const tslaLoanAmountAfter = new BigNumber(tslaLoanAmount).plus(tslaInterestTotal).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const tslaLoanValueAfter = tslaLoanAmountAfter.multipliedBy(2)
    const googleLoanAmountAfter = new BigNumber(googleLoanAmount).plus(googlInterestTotal).decimalPlaces(8, BigNumber.ROUND_CEIL)
    const googleLoanValueAfter = googleLoanAmountAfter.multipliedBy(4)
    const totalLoanValueAfter = tslaLoanValueAfter.plus(googleLoanValueAfter)
    const interestValueAfter = tslaInterestTotal.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(new BigNumber(2)).plus(googlInterestTotal.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(4))

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive

    expect(vaultAfter.loanSchemeId).toStrictEqual('scheme')
    expect(vaultAfter.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(vaultAfter.state).toStrictEqual('active')
    expect(vaultAfter.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(15000))
    expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfter.toFixed(8)}@TSLA`, `${googleLoanAmountAfter.toFixed(8)}@GOOGL`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`, `${googlInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)}@GOOGL`])
    expect(vaultAfter.loanValue).toStrictEqual(totalLoanValueAfter)
    expect(vaultAfter.interestValue).toStrictEqual(interestValueAfter)
    expect(vaultAfter.collateralRatio).toStrictEqual(6818)
    expect(vaultAfter.informativeRatio).toStrictEqual(new BigNumber(6818.13122578)) // (15000 / 220.00163254) * 100

    const bobLoanAcc = await bob.rpc.account.getAccount(bobLoanAddr)
    expect(bobLoanAcc).toStrictEqual(['90.00000000@TSLA', '10.00000000@GOOGL'])
  })

  it('test liquidation vault details while having more than one loan', async () => {
    const bobLoanAddr = await bob.generateAddress()
    const txid = await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: ['90@TSLA', '10@GOOGL'],
      to: bobLoanAddr
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)
    await tGroup.waitForSync()
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '400@TSLA', currency: 'USD' }] })
    await alice.generate(12)
    await tGroup.waitForSync()

    const vault = await bob.rpc.loan.getVault(bobVaultId) as VaultLiquidation
    expect(vault.loanSchemeId).toStrictEqual('scheme')
    expect(vault.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(vault.state).toStrictEqual('inLiquidation')
    expect(vault.liquidationHeight).toStrictEqual(expect.any(Number))
    expect(vault.liquidationPenalty).toStrictEqual(5)
    expect(vault.batchCount).toStrictEqual(3)
    expect(vault.batches).toStrictEqual([
      { index: 0, collaterals: ['6666.66656667@DFI', '0.66666666@BTC'], loan: '60.06704313@TSLA' },
      { index: 1, collaterals: ['3322.23466667@DFI', '0.33222347@BTC'], loan: '29.93352194@TSLA' },
      { index: 2, collaterals: ['11.09876666@DFI', '0.00110987@BTC'], loan: '10.00006279@GOOGL' }
    ])
  })

  it('test liquidated by interest', async () => {
    await bob.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(50000),
      id: 'scheme5'
    })
    await bob.generate(1)

    const vaultId = await bob.rpc.loan.createVault({
      ownerAddress: await bob.generateAddress(),
      loanSchemeId: 'scheme5'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    await alice.rpc.loan.depositToVault({
      vaultId: vaultId, from: aliceAddr, amount: '10000@DFI'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    const txid = await bob.rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: ['500@TSLA', '1000@GOOGL'],
      to: await bob.generateAddress()
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    {
      const vault = await bob.rpc.loan.getVault(vaultId) as VaultActive
      expect(vault).toStrictEqual({
        vaultId: vaultId,
        loanSchemeId: 'scheme5',
        ownerAddress: expect.any(String),
        state: 'active',
        collateralAmounts: ['10000.00000000@DFI'],
        loanAmounts: ['504.75646880@TSLA', '1009.51293760@GOOGL'],
        interestAmounts: ['4.75646880@TSLA', '9.51293760@GOOGL'],
        collateralValue: new BigNumber(10000),
        loanValue: new BigNumber(5047.564688),
        interestValue: new BigNumber(47.564688),
        informativeRatio: new BigNumber(198.11534112),
        collateralRatio: 198
      })
    }
    await bob.generate(1)
    {
      const vault = await bob.rpc.loan.getVault(vaultId) as VaultLiquidation
      expect(vault).toStrictEqual({
        vaultId: vaultId,
        loanSchemeId: 'scheme5',
        ownerAddress: expect.any(String),
        state: 'inLiquidation',
        liquidationHeight: expect.any(Number),
        batchCount: 2,
        liquidationPenalty: 5,
        batches: [
          { index: 0, collaterals: ['2000.00000000@DFI'], loan: '504.75646880@TSLA' },
          { index: 1, collaterals: ['8000.00000000@DFI'], loan: '1009.51293760@GOOGL' }
        ]
      })
    }
  })
})

describe('takeloan failed', () => {
  beforeAll(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  async function setup (): Promise<void> {
    // token setup
    const aliceAddr = await alice.container.getNewAddress()
    await alice.token.dfi({ address: aliceAddr, amount: 40000 })
    await alice.generate(1)
    await alice.token.create({ symbol: 'BTC', collateralAddress: aliceAddr })
    await alice.generate(1)
    await alice.token.mint({ symbol: 'BTC', amount: 40000 })
    await alice.generate(1)

    // oracle setup
    const addr = await alice.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'GOOGL', currency: 'USD' },
      { token: 'TWTR', currency: 'USD' },
      { token: 'AMZN', currency: 'USD' },
      { token: 'UBER', currency: 'USD' },
      { token: 'META', currency: 'USD' }
    ]
    oracleId = await alice.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await alice.generate(1)
    timestamp = Math.floor(new Date().getTime() / 1000)
    await alice.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: '1@DFI', currency: 'USD' },
          { tokenAmount: '10000@BTC', currency: 'USD' },
          { tokenAmount: '2@TSLA', currency: 'USD' },
          { tokenAmount: '4@GOOGL', currency: 'USD' },
          { tokenAmount: '2@UBER', currency: 'USD' },
          { tokenAmount: '2@AMZN', currency: 'USD' },
          { tokenAmount: '2@TWTR', currency: 'USD' }
        ]
      })
    await alice.generate(1)

    // collateral token
    await alice.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await alice.generate(1)

    await alice.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await alice.generate(1)

    // loan token
    await alice.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await alice.generate(1)

    await alice.rpc.loan.setLoanToken({
      symbol: 'GOOGL',
      fixedIntervalPriceId: 'GOOGL/USD'
    })
    await alice.generate(1)

    await alice.rpc.loan.setLoanToken({
      symbol: 'UBER',
      fixedIntervalPriceId: 'UBER/USD'
    })
    await alice.generate(1)

    await alice.rpc.loan.setLoanToken({
      symbol: 'TWTR',
      fixedIntervalPriceId: 'TWTR/USD'
    })
    await alice.generate(1)

    await alice.rpc.loan.setLoanToken({
      symbol: 'AMZN',
      fixedIntervalPriceId: 'AMZN/USD'
    })
    await alice.generate(1)

    // loan scheme set up
    await alice.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    bobVaultAddr = await bob.generateAddress()
    bobVaultId = await bob.rpc.loan.createVault({
      ownerAddress: bobVaultAddr,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)

    liqVaultAddr = await bob.generateAddress()
    liqVaultId = await bob.rpc.loan.createVault({
      ownerAddress: liqVaultAddr,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)

    mayLiqVaultAddr = await bob.generateAddress()
    mayLiqVaultId = await bob.rpc.loan.createVault({
      ownerAddress: mayLiqVaultAddr,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)

    frozenVaultAddr = await bob.generateAddress()
    frozenVaultId = await bob.rpc.loan.createVault({
      ownerAddress: frozenVaultAddr,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)

    emptyVaultAddr = await bob.generateAddress()
    emptyVaultId = await bob.rpc.loan.createVault({
      ownerAddress: emptyVaultAddr,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    // deposit on active vault
    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '10000@DFI'
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '1@BTC'
    })
    await alice.generate(1)

    // deposit on liqVault
    await alice.rpc.loan.depositToVault({
      vaultId: liqVaultId, from: aliceAddr, amount: '10000@DFI'
    })
    await alice.generate(1)

    // deposit on mayLiqVault
    await alice.rpc.loan.depositToVault({
      vaultId: mayLiqVaultId, from: aliceAddr, amount: '10000@DFI'
    })
    await alice.generate(1)

    // deposit on frozenVault
    await alice.rpc.loan.depositToVault({
      vaultId: frozenVaultId, from: aliceAddr, amount: '10000@DFI'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    bobVault = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(bobVault.loanSchemeId).toStrictEqual('scheme')
    expect(bobVault.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(bobVault.state).toStrictEqual('active')
    expect(bobVault.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@BTC'])
    expect(bobVault.collateralValue).toStrictEqual(new BigNumber(15000))
    expect(bobVault.loanAmounts).toStrictEqual([])
    expect(bobVault.loanValue).toStrictEqual(new BigNumber(0))
    expect(bobVault.interestAmounts).toStrictEqual([])
    expect(bobVault.interestValue).toStrictEqual(new BigNumber(0))
    expect(bobVault.collateralRatio).toStrictEqual(-1) // empty loan
    expect(bobVault.informativeRatio).toStrictEqual(new BigNumber(-1)) // empty loan
  }

  it('should not takeLoan on nonexistent vault', async () => {
    const promise = bob.rpc.loan.takeLoan({
      vaultId: '0'.repeat(64),
      amounts: '30@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
  })

  it('should not takeLoan on nonexistent loan token', async () => {
    const promise = bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: '1@BTC'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Loan token with id (1) does not exist!')
  })

  it('should not takeLoan on invalid token', async () => {
    const promise = bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: '1@INVALID'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid Defi token: INVALID')
  })

  it('should not takeLoan on incorrect auth', async () => {
    const promise = alice.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: '30@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Incorrect authorization for ${bobVaultAddr}`)
  })

  it('should not takeLoan while exceed vault collateralization ratio', async () => {
    const promise = bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: '5000@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Vault does not have enough collateralization ratio defined by loan scheme')
  })

  it('should not takeLoan while exceed vault collateralization ratio (multiple tokens)', async () => {
    const promise = bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: ['1550@TSLA', '1200@GOOGL']
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Vault does not have enough collateralization ratio defined by loan scheme')
  })

  it('should not takeLoan on mintable:false token', async () => {
    await bob.container.call('updateloantoken', ['TSLA', { mintable: false }])
    await bob.generate(1)

    const promise = bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: '30@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Loan cannot be taken on token with id (2) as "mintable" is currently false')

    await bob.container.call('updateloantoken', ['TSLA', { mintable: true }])
    await bob.generate(1)
    await tGroup.waitForSync()
  })

  it('should not takeLoan on inLiquidation vault', async () => {
    await bob.rpc.loan.takeLoan({
      vaultId: liqVaultId,
      amounts: '2000@UBER'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    await alice.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      { prices: [{ tokenAmount: '6@UBER', currency: 'USD' }] })
    await alice.generate(12)
    await tGroup.waitForSync()

    const liqVault = await bob.rpc.loan.getVault(liqVaultId) as VaultLiquidation
    expect(liqVault.state).toStrictEqual('inLiquidation')

    const promise = bob.rpc.loan.takeLoan({
      vaultId: liqVaultId,
      amounts: '1@UBER'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot take loan on vault under liquidation')
  })

  it('should not takeLoan on mayLiquidate vault', async () => {
    await bob.rpc.loan.takeLoan({
      vaultId: mayLiqVaultId,
      amounts: '2500@TWTR'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    await alice.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      { prices: [{ tokenAmount: '2.2@TWTR', currency: 'USD' }] })
    await alice.generate(6)
    await tGroup.waitForSync()

    const mayLiqVault = await bob.rpc.loan.getVault(mayLiqVaultId) as VaultActive
    expect(mayLiqVault.state).toStrictEqual('mayLiquidate')

    const promise = bob.rpc.loan.takeLoan({
      vaultId: mayLiqVaultId,
      amounts: '1@TWTR'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Vault does not have enough collateralization ratio defined by loan scheme')
  })

  it('should not takeLoan on frozen vault', async () => {
    await bob.rpc.loan.takeLoan({
      vaultId: frozenVaultId,
      amounts: '20@AMZN'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    await alice.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      { prices: [{ tokenAmount: '6@AMZN', currency: 'USD' }] })
    await alice.generate(6)
    await tGroup.waitForSync()

    const frozenVault = await bob.rpc.loan.getVault(frozenVaultId) as VaultActive
    expect(frozenVault.state).toStrictEqual('frozen')

    const promise = bob.rpc.loan.takeLoan({
      vaultId: frozenVaultId,
      amounts: '1@AMZN'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot take loan while any of the asset\'s price in the vault is not live')
  })

  it('should not takeLoan as no live fixed prices', async () => {
    await alice.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: '3@META', currency: 'USD' }
        ]
      }
    )
    await alice.generate(1)

    await alice.rpc.loan.setLoanToken({
      symbol: 'META',
      fixedIntervalPriceId: 'META/USD'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    const promise = bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: '40@META'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('No live fixed prices for META/USD')
  })

  it('should not takeLoan when DFI collateral value less than 50% of the minimum required collateral value', async () => {
    {
      // increase BTC value to make DFI to below 50% of total value
      const now = Math.floor(new Date().getTime() / 1000)
      await alice.rpc.oracle.setOracleData(
        oracleId,
        now, {
          prices: [
            { tokenAmount: '0.1@DFI', currency: 'USD' },
            { tokenAmount: '50000@BTC', currency: 'USD' },
            { tokenAmount: '2@TSLA', currency: 'USD' }
          ]
        })
      await alice.generate(12)
      await tGroup.waitForSync()
    }

    // loan amount = 2000usd
    // dfi amount = 1000 usd
    // 1000 < (2000 *1.5)/2
    const promise = bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: '1000@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('At least 50% of the minimum required collateral must be in DFI or DUSD when taking a loan.')

    {
      // revert DFI value changes
      const now = Math.floor(new Date().getTime() / 1000)
      await alice.rpc.oracle.setOracleData(
        oracleId,
        now, {
          prices: [
            { tokenAmount: '1@DFI', currency: 'USD' },
            { tokenAmount: '10000@BTC', currency: 'USD' },
            { tokenAmount: '2@TSLA', currency: 'USD' }
          ]
        })
      await alice.generate(12)
      await tGroup.waitForSync()
    }
  })

  it('should not takeLoan on empty vault', async () => {
    const promise = bob.rpc.loan.takeLoan({
      vaultId: emptyVaultId,
      amounts: '1@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Vault with id ${emptyVaultId} has no collaterals`)
  })
})

describe('takeLoan with 50% DUSD or DFI collaterals', () => {
  const fortCanningRoadHeight = 128
  beforeEach(async () => {
    const startFlags: StartFlags[] = [{ name: 'fortcanningroadheight', value: fortCanningRoadHeight }]
    await tGroup.start({ startFlags: startFlags })
    await alice.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  async function setup (): Promise<void> {
    // token setup
    aliceAddr = await alice.container.getNewAddress()
    await alice.token.dfi({ address: aliceAddr, amount: 50000 })
    await alice.generate(1)

    // oracle setup
    const addr = await alice.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' }
    ]
    oracleId = await alice.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await alice.generate(1)
    timestamp = Math.floor(new Date().getTime() / 1000)
    await alice.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: '1@DFI', currency: 'USD' },
          { tokenAmount: '1@DUSD', currency: 'USD' },
          { tokenAmount: '10000@BTC', currency: 'USD' },
          { tokenAmount: '2@TSLA', currency: 'USD' }
        ]
      })
    await alice.generate(1)

    // collateral token
    await alice.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await alice.generate(1)

    await takeDusdTokensToPayback()

    await alice.rpc.loan.setCollateralToken({
      token: 'DUSD',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await alice.generate(1)

    await alice.token.create({ symbol: 'BTC', collateralAddress: aliceAddr })
    await alice.generate(1)

    await alice.token.mint({ symbol: 'BTC', amount: 4 })
    await alice.generate(1)

    await alice.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await alice.generate(1)

    // loan scheme set up
    await alice.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    bobVaultAddr = await bob.generateAddress()
    bobVaultId = await bob.rpc.loan.createVault({
      ownerAddress: bobVaultAddr,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    // deposit on active vault
    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '5000@DFI' // collateral value = 5000 USD
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '5000@DUSD' // collateral value = 5000 USD
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '1@BTC' // collateral value = 1 x 10000 x 0.5 = 5000 USD
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    bobVault = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(bobVault.loanSchemeId).toStrictEqual('scheme')
    expect(bobVault.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(bobVault.state).toStrictEqual('active')
    expect(bobVault.collateralAmounts).toStrictEqual(['5000.00000000@DFI', '5000.00000000@DUSD', '1.00000000@BTC'])
    expect(bobVault.collateralValue).toStrictEqual(new BigNumber(15000))
    expect(bobVault.loanAmounts).toStrictEqual([])
    expect(bobVault.loanValue).toStrictEqual(new BigNumber(0))
    expect(bobVault.interestAmounts).toStrictEqual([])
    expect(bobVault.interestValue).toStrictEqual(new BigNumber(0))
    expect(bobVault.collateralRatio).toStrictEqual(-1) // empty loan
    expect(bobVault.informativeRatio).toStrictEqual(new BigNumber(-1)) // empty loan
  }

  // this will borrow dusd tokens and will give to aliceAddr
  async function takeDusdTokensToPayback (): Promise<void> {
    await alice.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await alice.generate(1)

    const tokenProviderSchemeId = 'LoanDusd'
    await alice.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(0.01),
      id: tokenProviderSchemeId
    })
    await alice.generate(1)

    const tokenProviderVaultAddress = await alice.generateAddress()
    const tokenProviderVaultId = await alice.rpc.loan.createVault({
      ownerAddress: tokenProviderVaultAddress,
      loanSchemeId: tokenProviderSchemeId
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: tokenProviderVaultId,
      from: aliceAddr,
      amount: '10000@DFI'
    })
    await alice.generate(1)

    await alice.rpc.loan.takeLoan({
      vaultId: tokenProviderVaultId,
      amounts: '10000@DUSD',
      to: tokenProviderVaultAddress
    })
    await alice.generate(1)

    await alice.rpc.account.accountToAccount(tokenProviderVaultAddress, { [aliceAddr]: '10000@DUSD' })
  }

  it('should takeLoan with 50% DUSD collateral', async () => {
    // remove dfi collateral, new total collateral = 10000 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: aliceAddr, amount: '5000@DFI'
    })

    // loan token
    await bob.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    // must wait until block count reaches fort canning road height
    const blockCount = await bob.container.getBlockCount()
    await bob.generate(fortCanningRoadHeight - blockCount)

    const tslaLoanAmount = 2500 // loan amount = 5000 USD
    const txid = await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    const tslaLoanHeight = await bob.container.getBlockCount()
    const interests = await bob.rpc.loan.getInterest('scheme')

    // manually calculate interest to compare rpc getInterest above is working correctly
    const height = await bob.container.getBlockCount()
    const tslaInterestPerBlock = new BigNumber((netInterest * tslaLoanAmount) / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    expect(tslaInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].interestPerBlock.toFixed(8))
    const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(new BigNumber(height - tslaLoanHeight + 1))
    expect(tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].totalInterest.toFixed(8))

    const tslaLoanAmountAfter = new BigNumber(tslaLoanAmount).plus(tslaInterestTotal).decimalPlaces(8, BigNumber.ROUND_CEIL)

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.loanSchemeId).toStrictEqual('scheme')
    expect(vaultAfter.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(vaultAfter.state).toStrictEqual('active')
    expect(vaultAfter.collateralAmounts).toStrictEqual(['5000.00000000@DUSD', '1.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(10000))
    expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfter.toFixed(8)}@TSLA`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`])
    expect(vaultAfter.loanValue).toStrictEqual(tslaLoanAmountAfter.multipliedBy(2))
    expect(vaultAfter.interestValue).toStrictEqual(tslaInterestTotal.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2))
    expect(vaultAfter.collateralRatio).toStrictEqual(200) // (collateral / loan)%
    expect(vaultAfter.informativeRatio).toStrictEqual(new BigNumber(199.99988584)) // (collateral / (loan + interest))%

    // check received loan via getTokenBalances while takeLoan without 'to'
    const tBalances = await bob.rpc.account.getTokenBalances()
    expect(tBalances).toStrictEqual([`${tslaLoanAmount.toFixed(8)}@3`]) // tokenId: 3 is TSLA
  })

  it('should takeLoan with 50% DUSD of minimum required collateral', async () => {
    // add btc collateral, new total collateral = 20000 USD
    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '1@BTC' // collateral value = 1 x 10000 x 0.5 = 5000 USD
    })
    await alice.generate(1)

    // remove dfi collateral, new total collateral = 15000 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: aliceAddr, amount: '5000@DFI'
    })

    // loan token
    await bob.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    // must wait until block count reaches fort canning road height
    const blockCount = await bob.container.getBlockCount()
    await bob.generate(fortCanningRoadHeight - blockCount)

    const tslaLoanAmount = 2500 // loan amount = 5000 USD
    const txid = await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    const tslaLoanHeight = await bob.container.getBlockCount()
    const interests = await bob.rpc.loan.getInterest('scheme')

    // manually calculate interest to compare rpc getInterest above is working correctly
    const height = await bob.container.getBlockCount()
    const tslaInterestPerBlock = new BigNumber((netInterest * tslaLoanAmount) / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    expect(tslaInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].interestPerBlock.toFixed(8))
    const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(new BigNumber(height - tslaLoanHeight + 1))
    expect(tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].totalInterest.toFixed(8))

    const tslaLoanAmountAfter = new BigNumber(tslaLoanAmount).plus(tslaInterestTotal).decimalPlaces(8, BigNumber.ROUND_CEIL)

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.loanSchemeId).toStrictEqual('scheme')
    expect(vaultAfter.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(vaultAfter.state).toStrictEqual('active')
    expect(vaultAfter.collateralAmounts).toStrictEqual(['5000.00000000@DUSD', '2.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(15000))
    expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfter.toFixed(8)}@TSLA`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`])
    expect(vaultAfter.loanValue).toStrictEqual(tslaLoanAmountAfter.multipliedBy(2))
    expect(vaultAfter.interestValue).toStrictEqual(tslaInterestTotal.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2))
    expect(vaultAfter.collateralRatio).toStrictEqual(300) // (collateral / loan)%
    expect(vaultAfter.informativeRatio).toStrictEqual(new BigNumber(299.99982876)) // (collateral / (loan + interest))%

    // check received loan via getTokenBalances while takeLoan without 'to'
    const tBalances = await bob.rpc.account.getTokenBalances()
    expect(tBalances).toStrictEqual([`${tslaLoanAmount.toFixed(8)}@3`]) // tokenId: 3 is TSLA
  })

  it('should takeLoan with DUSD sole collateral', async () => {
    // remove dfi collateral, new total collateral = 10000 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: aliceAddr, amount: '5000@DFI'
    })
    // remove btc collateral, new total collateral = 5000 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: aliceAddr, amount: '1@BTC'
    })

    // loan token
    await bob.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    // must wait until block count reaches fort canning road height
    const blockCount = await bob.container.getBlockCount()
    await bob.generate(fortCanningRoadHeight - blockCount)

    const tslaLoanAmount = 1250 // loan amount = 2500 USD
    const txid = await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    const tslaLoanHeight = await bob.container.getBlockCount()
    const interests = await bob.rpc.loan.getInterest('scheme')

    // manually calculate interest to compare rpc getInterest above is working correctly
    const height = await bob.container.getBlockCount()
    const tslaInterestPerBlock = new BigNumber((netInterest * tslaLoanAmount) / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    expect(tslaInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].interestPerBlock.toFixed(8))
    const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(new BigNumber(height - tslaLoanHeight + 1))
    expect(tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].totalInterest.toFixed(8))

    const tslaLoanAmountAfter = new BigNumber(tslaLoanAmount).plus(tslaInterestTotal).decimalPlaces(8, BigNumber.ROUND_CEIL)

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.loanSchemeId).toStrictEqual('scheme')
    expect(vaultAfter.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(vaultAfter.state).toStrictEqual('active')
    expect(vaultAfter.collateralAmounts).toStrictEqual(['5000.00000000@DUSD'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(5000))
    expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfter.toFixed(8)}@TSLA`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`])
    expect(vaultAfter.loanValue).toStrictEqual(tslaLoanAmountAfter.multipliedBy(2))
    expect(vaultAfter.interestValue).toStrictEqual(tslaInterestTotal.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2))
    expect(vaultAfter.collateralRatio).toStrictEqual(200) // (collateral / loan)%
    expect(vaultAfter.informativeRatio).toStrictEqual(new BigNumber(199.99988584)) // (collateral / (loan + interest))%

    // check received loan via getTokenBalances while takeLoan without 'to'
    const tBalances = await bob.rpc.account.getTokenBalances()
    expect(tBalances).toStrictEqual([`${tslaLoanAmount.toFixed(8)}@3`]) // tokenId: 3 is TSLA
  })

  it('should takeLoan with 25% DFI + 25% DUSD collateral', async () => {
    // add btc collateral, new total collateral = 20000 USD
    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '1@BTC' // collateral value = 1 x 10000 x 0.5 = 5000 USD
    })
    await alice.generate(1)

    // loan token
    await bob.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    // must wait until block count reaches fort canning road height
    const blockCount = await bob.container.getBlockCount()
    await bob.generate(fortCanningRoadHeight - blockCount)

    const tslaLoanAmount = 5000 // loan amount = 10000 USD
    const txid = await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    const tslaLoanHeight = await bob.container.getBlockCount()
    const interests = await bob.rpc.loan.getInterest('scheme')

    // manually calculate interest to compare rpc getInterest above is working correctly
    const height = await bob.container.getBlockCount()
    const tslaInterestPerBlock = new BigNumber((netInterest * tslaLoanAmount) / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    expect(tslaInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].interestPerBlock.toFixed(8))
    const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(new BigNumber(height - tslaLoanHeight + 1))
    expect(tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].totalInterest.toFixed(8))

    const tslaLoanAmountAfter = new BigNumber(tslaLoanAmount).plus(tslaInterestTotal).decimalPlaces(8, BigNumber.ROUND_CEIL)

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.loanSchemeId).toStrictEqual('scheme')
    expect(vaultAfter.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(vaultAfter.state).toStrictEqual('active')
    expect(vaultAfter.collateralAmounts).toStrictEqual(['5000.00000000@DFI', '5000.00000000@DUSD', '2.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(20000))
    expect(vaultAfter.loanAmounts).toStrictEqual([`${tslaLoanAmountAfter.toFixed(8)}@TSLA`])
    expect(vaultAfter.interestAmounts).toStrictEqual([`${tslaInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)}@TSLA`])
    expect(vaultAfter.loanValue).toStrictEqual(tslaLoanAmountAfter.multipliedBy(2))
    expect(vaultAfter.interestValue).toStrictEqual(tslaInterestTotal.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2))
    expect(vaultAfter.collateralRatio).toStrictEqual(200) // (collateral / loan)%
    expect(vaultAfter.informativeRatio).toStrictEqual(new BigNumber(199.99988584)) // (collateral / (loan + interest))%

    // check received loan via getTokenBalances while takeLoan without 'to'
    const tBalances = await bob.rpc.account.getTokenBalances()
    expect(tBalances).toStrictEqual([`${tslaLoanAmount.toFixed(8)}@3`]) // tokenId: 3 is TSLA
  })

  it('should not takeLoan with 50% DUSD collateral before reaching fort canning road height', async () => {
    // remove dfi collateral, new total collateral = 10000 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: aliceAddr, amount: '5000@DFI'
    })

    // loan token
    await bob.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await bob.generate(1)

    const blockCount = await bob.container.getBlockCount()
    expect(blockCount).toBeLessThan(fortCanningRoadHeight)

    const tslaLoanAmount = 2500 // loan amount = 5000 USD
    const txid = bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    await expect(txid).rejects.toThrow(RpcApiError)
    await expect(txid).rejects.toThrow('At least 50% of the minimum required collateral must be in DFI when taking a loan.')
  })

  it('should not takeLoan with DUSD sole collateral before reaching fort canning road height', async () => {
    // remove dfi collateral, new total collateral = 10000 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: aliceAddr, amount: '5000@DFI'
    })
    // remove btc collateral, new total collateral = 5000 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: aliceAddr, amount: '1@BTC'
    })

    // loan token
    await bob.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await bob.generate(1)

    const blockCount = await bob.container.getBlockCount()
    expect(blockCount).toBeLessThan(fortCanningRoadHeight)

    const tslaLoanAmount = 1250 // loan amount = 2500 USD
    const txid = bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    await expect(txid).rejects.toThrow(RpcApiError)
    await expect(txid).rejects.toThrow('At least 50% of the minimum required collateral must be in DFI when taking a loan.')
  })

  it('should not takeLoan with 25% DFI + 25% DUSD collateral before reaching fort canning road height', async () => {
    // add btc collateral, new total collateral = 20000 USD
    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '1@BTC' // collateral value = 1 x 10000 x 0.5 = 5000 USD
    })
    await alice.generate(1)

    // loan token
    await bob.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await bob.generate(6)

    const blockCount = await bob.container.getBlockCount()
    expect(blockCount).toBeLessThan(fortCanningRoadHeight)

    const tslaLoanAmount = 5000 // loan amount = 10000 USD
    const txid = bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    await expect(txid).rejects.toThrow(RpcApiError)
    await expect(txid).rejects.toThrow('At least 50% of the minimum required collateral must be in DFI when taking a loan.')
  })

  it('should not takeLoan with 33.33% DUSD collateral', async () => {
    // add btc collateral, new total collateral = 20000 USD
    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '1@BTC' // collateral value = 1 x 10000 x 0.5 = 5000 USD
    })
    await alice.generate(1)

    // remove dfi collateral, new total collateral = 15000 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: aliceAddr, amount: '5000@DFI'
    })

    // loan token
    await bob.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    // must wait until block count reaches fort canning road height
    const blockCount = await bob.container.getBlockCount()
    await bob.generate(fortCanningRoadHeight - blockCount)

    const tslaLoanAmount = 3750 // loan amount = 7500 USD
    const txid = bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    await expect(txid).rejects.toThrow(RpcApiError)
    await expect(txid).rejects.toThrow('At least 50% of the minimum required collateral must be in DFI or DUSD when taking a loan.')
  })

  it('should not takeLoan with 24.9975% DFI + 24.9975% DUSD of minimum required collateral', async () => {
    // add btc collateral, new total collateral = 25000 USD
    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '2@BTC' // collateral value = 2 x 10000 x 0.5 = 10000 USD
    })
    await alice.generate(1)

    // loan token
    await bob.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    // must wait until block count reaches fort canning road height
    const blockCount = await bob.container.getBlockCount()
    await bob.generate(fortCanningRoadHeight - blockCount)

    const tslaLoanAmount = 5000.5 // loan amount = 10001 USD
    const txid = bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    await expect(txid).rejects.toThrow(RpcApiError)
    await expect(txid).rejects.toThrow('At least 50% of the minimum required collateral must be in DFI or DUSD when taking a loan.')
  })
})
