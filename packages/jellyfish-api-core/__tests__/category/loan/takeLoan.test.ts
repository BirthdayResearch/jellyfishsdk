import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
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
    const txid = await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: '40@TSLA'
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    const tslaLoanHeight = await bob.container.getBlockCount()
    {
      const interests = await bob.rpc.loan.getInterest('scheme')
      expect(interests[0].interestPerBlock.toFixed(8)).toStrictEqual('0.00002283')
      expect(interests[0].totalInterest.toFixed(8)).toStrictEqual('0.00002283')

      // manually calculate interest to compare rpc getInterest above is working correctly
      const height = await bob.container.getBlockCount()
      const tslaInterestPerBlock = (netInterest * 40) / (365 * blocksPerDay) //  netInterest * loanAmt / 365 * blocksPerDay
      expect(tslaInterestPerBlock.toFixed(8)).toStrictEqual('0.00002283')
      const tslaInterestTotal = tslaInterestPerBlock * (height - tslaLoanHeight + 1)
      expect(tslaInterestTotal.toFixed(8)).toStrictEqual('0.00002283')
    }

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.loanSchemeId).toStrictEqual('scheme')
    expect(vaultAfter.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(vaultAfter.state).toStrictEqual('active')
    expect(vaultAfter.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(15000))
    expect(vaultAfter.loanAmounts).toStrictEqual(['40.00002283@TSLA'])
    expect(vaultAfter.interestAmounts).toStrictEqual(['0.00002283@TSLA'])
    expect(vaultAfter.loanValue).toStrictEqual(new BigNumber(80.00004566))
    expect(vaultAfter.interestValue).toStrictEqual(new BigNumber(0.00004566))
    expect(vaultAfter.collateralRatio).toStrictEqual(18750)
    expect(vaultAfter.informativeRatio).toStrictEqual(new BigNumber(18749.98929844)) // 15000 / 80.00004566 * 100

    // check received loan via getTokenBalances while takeLoan without 'to'
    const tBalances = await bob.rpc.account.getTokenBalances()
    expect(tBalances).toStrictEqual(['40.00000000@2']) // tokenId: 2 is TSLA
  })

  it('should takeloan with specific "to" address', async () => {
    const bobLoanAddr = await bob.generateAddress()
    const txid = await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: '200@TSLA',
      to: bobLoanAddr
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)
    const tslaLoanHeight = await bob.container.getBlockCount()

    await bob.generate(12)
    {
      const interests = await bob.rpc.loan.getInterest('scheme')
      expect(interests[0].interestPerBlock.toFixed(8)).toStrictEqual('0.00011415')
      expect(interests[0].totalInterest.toFixed(8)).toStrictEqual('0.00148395')

      // manually calculate interest to compare rpc getInterest above is working correctly
      const height = await bob.container.getBlockCount()
      const tslaInterestPerBlock = (netInterest * 200) / (365 * blocksPerDay) //  netInterest * loanAmt / 365 * blocksPerDay
      expect(tslaInterestPerBlock.toFixed(8)).toStrictEqual('0.00011416')
      const tslaInterestTotal = tslaInterestPerBlock * (height - tslaLoanHeight + 1)
      expect(tslaInterestTotal.toFixed(8)).toStrictEqual('0.00148402') // slightly diff: rpc(0.00148395) vs manual(0.00148402)
    }

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.loanSchemeId).toStrictEqual('scheme')
    expect(vaultAfter.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(vaultAfter.state).toStrictEqual('active')
    expect(vaultAfter.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(15000))
    expect(vaultAfter.loanAmounts).toStrictEqual(['200.00148395@TSLA'])
    expect(vaultAfter.interestAmounts).toStrictEqual(['0.00148395@TSLA'])
    expect(vaultAfter.loanValue).toStrictEqual(new BigNumber(400.0029679))
    expect(vaultAfter.interestValue).toStrictEqual(new BigNumber(0.0029679))
    expect(vaultAfter.collateralRatio).toStrictEqual(3750)
    expect(vaultAfter.informativeRatio).toStrictEqual(new BigNumber(3749.97217614)) // 15000 / 400.00029679 * 100

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
    expect(vaultAfterTSLAAmt - vaultBeforeTSLAAmt).toStrictEqual(5.00000285)

    const rawtx = await bob.container.call('getrawtransaction', [txid, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should take more than one loan', async () => {
    const bobLoanAddr = await bob.generateAddress()
    const txid = await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: ['90@TSLA', '10@GOOGL'],
      to: bobLoanAddr
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    const loanHeight = await bob.container.getBlockCount()

    await bob.generate(12)
    {
      const interests = await bob.rpc.loan.getInterest('scheme')
      expect(interests[0].interestPerBlock.toFixed(8)).toStrictEqual('0.00005136')
      expect(interests[0].totalInterest.toFixed(8)).toStrictEqual('0.00066768')
      expect(interests[1].interestPerBlock.toFixed(8)).toStrictEqual('0.00000570')
      expect(interests[1].totalInterest.toFixed(8)).toStrictEqual('0.00007410')

      // manually calculate interest to compare rpc getInterest above is working correctly
      const height = await bob.container.getBlockCount()
      const tslaInterestPerBlock = (netInterest * 90) / (365 * blocksPerDay)
      expect(tslaInterestPerBlock.toFixed(8)).toStrictEqual('0.00005137')
      const tslaInterestTotal = tslaInterestPerBlock * (height - loanHeight + 1)
      expect(tslaInterestTotal.toFixed(8)).toStrictEqual('0.00066781')

      const googlInterestPerBlock = (netInterest * 10) / (365 * blocksPerDay)
      expect(googlInterestPerBlock.toFixed(8)).toStrictEqual('0.00000571')
      const googlInterestTotal = googlInterestPerBlock * (height - loanHeight + 1)
      expect(googlInterestTotal.toFixed(8)).toStrictEqual('0.00007420')
    }

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.loanSchemeId).toStrictEqual('scheme')
    expect(vaultAfter.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(vaultAfter.state).toStrictEqual('active')
    expect(vaultAfter.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(15000))
    expect(vaultAfter.loanAmounts).toStrictEqual(['90.00066768@TSLA', '10.00007410@GOOGL'])
    expect(vaultAfter.interestAmounts).toStrictEqual(['0.00066768@TSLA', '0.00007410@GOOGL'])
    expect(vaultAfter.loanValue).toStrictEqual(new BigNumber(220.00163176))
    expect(vaultAfter.interestValue).toStrictEqual(new BigNumber(0.00163176))
    expect(vaultAfter.collateralRatio).toStrictEqual(6818)
    expect(vaultAfter.informativeRatio).toStrictEqual(new BigNumber(6818.13124748)) // 15000 / 220.00163176 * 100

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
      { index: 0, collaterals: ['6666.66656667@DFI', '0.66666666@BTC'], loan: '60.06704305@TSLA' },
      { index: 1, collaterals: ['3322.23466667@DFI', '0.33222347@BTC'], loan: '29.93352191@TSLA' },
      { index: 2, collaterals: ['11.09876666@DFI', '0.00110987@BTC'], loan: '10.00006270@GOOGL' }
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
        loanAmounts: ['504.75646879@TSLA', '1009.51293759@GOOGL'],
        interestAmounts: ['4.75646879@TSLA', '9.51293759@GOOGL'],
        collateralValue: new BigNumber(10000),
        loanValue: new BigNumber(5047.56468794),
        interestValue: new BigNumber(0.56468794),
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
          { index: 0, collaterals: ['500@TSLA'], loan: '504.75646879@TSLA' },
          { index: 1, collaterals: ['1000@GOOGL'], loan: '1009.51293759@GOOGL' }
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
      amounts: '300000@TSLA'
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

  it('should not takeLoan when DFI collateral value less than 50%', async () => {
    {
      // reduce DFI value to below 50% of total collateral
      const now = Math.floor(new Date().getTime() / 1000)
      await alice.rpc.oracle.setOracleData(
        oracleId,
        now, {
          prices: [
            { tokenAmount: '0.4@DFI', currency: 'USD' },
            { tokenAmount: '10000@BTC', currency: 'USD' },
            { tokenAmount: '2@TSLA', currency: 'USD' }
          ]
        })
      await alice.generate(12)
      await tGroup.waitForSync()
    }

    const promise = bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: '0.01@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('At least 50% of the vault must be in DFI when taking a loan')

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
