import { DeFiDRpcError, GenesisKeys, StartFlags } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'
import { P2WPKH } from '@defichain/jellyfish-address'
import { VaultActive } from '@defichain/jellyfish-api-core/src/category/loan'
import { Script } from '@defichain/jellyfish-transaction'

const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)
let aliceAddr: string
let bobVaultId: string
let bobVaultAddr: string
let bobVault: any
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
let aProviders: MockProviders
let aBuilder: P2WPKHTransactionBuilder
let bProviders: MockProviders
let bBuilder: P2WPKHTransactionBuilder
let script: Script
const netInterest = (3 + 0) / 100 // (scheme.rate + loanToken.interest) / 100
const blocksPerDay = (60 * 60 * 24) / (10 * 60) // 144 in regtest

async function fundForFeesIfUTXONotAvailable (amount = 10): Promise<void> {
  const prevouts = await bProviders.prevout.all()
  if (prevouts.length === 0) {
    // Fund 10 DFI UTXO to bProviders.getAddress() for fees
    await fundEllipticPair(bob.container, bProviders.ellipticPair, amount)
    await bProviders.setupMocks()
  }
}

async function setup (): Promise<void> {
  // token setup
  aliceAddr = await alice.container.getNewAddress()
  await alice.token.dfi({ address: aliceAddr, amount: 70000 })
  await alice.generate(1)
  await alice.token.create({ symbol: 'BTC', collateralAddress: aliceAddr })
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
    { token: 'UBER', currency: 'USD' },
    { token: 'CAT', currency: 'USD' },
    { token: 'XYZ', currency: 'USD' },
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
        { tokenAmount: '4@AMZN', currency: 'USD' },
        { tokenAmount: '4@UBER', currency: 'USD' },
        { tokenAmount: '2@CAT', currency: 'USD' },
        { tokenAmount: '4@XYZ', currency: 'USD' }
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
    symbol: 'AMZN',
    fixedIntervalPriceId: 'AMZN/USD'
  })
  await alice.generate(1)

  await alice.rpc.loan.setLoanToken({
    symbol: 'UBER',
    fixedIntervalPriceId: 'UBER/USD'
  })
  await alice.generate(1)

  await alice.rpc.loan.setLoanToken({
    symbol: 'CAT',
    fixedIntervalPriceId: 'CAT/USD'
  })
  await alice.generate(1)

  await alice.rpc.loan.setLoanToken({
    symbol: 'XYZ',
    fixedIntervalPriceId: 'XYZ/USD'
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

  bobVaultAddr = await bProviders.getAddress()
  bobVaultId = await bob.rpc.loan.createVault({
    ownerAddress: bobVaultAddr,
    loanSchemeId: 'scheme'
  })
  await bob.generate(1)

  liqVaultAddr = await bProviders.getAddress()
  liqVaultId = await bob.rpc.loan.createVault({
    ownerAddress: liqVaultAddr,
    loanSchemeId: 'scheme'
  })
  await bob.generate(1)

  mayLiqVaultAddr = await bProviders.getAddress()
  mayLiqVaultId = await bob.rpc.loan.createVault({
    ownerAddress: mayLiqVaultAddr,
    loanSchemeId: 'scheme'
  })
  await bob.generate(1)

  frozenVaultAddr = await bProviders.getAddress()
  frozenVaultId = await bob.rpc.loan.createVault({
    ownerAddress: frozenVaultAddr,
    loanSchemeId: 'scheme'
  })
  await bob.generate(1)

  emptyVaultAddr = await bProviders.getAddress()
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

describe('loans.takeLoan success', () => {
  beforeEach(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()

    aProviders = await getProviders(alice.container)
    aProviders.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey))
    aBuilder = new P2WPKHTransactionBuilder(aProviders.fee, aProviders.prevout, aProviders.elliptic, RegTest)

    bProviders = await getProviders(bob.container)
    bProviders.setEllipticPair(WIF.asEllipticPair(GenesisKeys[1].owner.privKey))
    bBuilder = new P2WPKHTransactionBuilder(bProviders.fee, bProviders.prevout, bProviders.elliptic, RegTest)

    await setup()

    await fundForFeesIfUTXONotAvailable(10)
    script = await bProviders.elliptic.script()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  it('should takeLoan', async () => {
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 2, amount: new BigNumber(40) }] // 40@TSLA
    }, script)

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

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    const interestAfter = await alice.rpc.loan.getInterest('scheme', 'TSLA')

    const vaultBeforeLoanTSLAAcc = bobVault.loanAmounts?.find((amt: string) => amt.split('@')[1] === 'TSLA')
    const vaultBeforeLoanTSLAAmount = vaultBeforeLoanTSLAAcc !== undefined ? Number(vaultBeforeLoanTSLAAcc?.split('@')[0]) : 0
    const vaultAfterLoanTSLAAcc = vaultAfter.loanAmounts.find((amt: string) => amt.split('@')[1] === 'TSLA')
    const vaultAfterLoanTSLAAmount = Number(vaultAfterLoanTSLAAcc?.split('@')[0])

    const interestAfterTSLA = interestAfter.find((interest: { 'token': string }) => interest.token === 'TSLA')

    expect(new BigNumber(vaultAfterLoanTSLAAmount - vaultBeforeLoanTSLAAmount)).toStrictEqual(new BigNumber(40).plus(interestAfterTSLA?.totalInterest as BigNumber))
    // check the account of the vault address
    expect(await alice.rpc.account.getAccount(await bProviders.getAddress())).toStrictEqual(['40.00000000@TSLA'])
  })

  it('should takeLoan to a given address', async () => {
    const vaultBefore = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    const toAddress = await bob.generateAddress()
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: P2WPKH.fromAddress(RegTest, toAddress, P2WPKH).getScript(),
      tokenAmounts: [{ token: 5, amount: new BigNumber(40) }]
    }, script)

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

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    const interestAfter = await bob.rpc.loan.getInterest('scheme', 'CAT')

    const vaultBeforeLoanTSLAAcc = vaultBefore.loanAmounts.find((amt: string) => amt.split('@')[1] === 'CAT')
    const vaultBeforeLoanTSLAAmount = vaultBeforeLoanTSLAAcc !== undefined ? Number(vaultBeforeLoanTSLAAcc?.split('@')[0]) : 0
    const vaultAfterLoanTSLAAcc = vaultAfter.loanAmounts.find((amt: string) => amt.split('@')[1] === 'CAT')
    const vaultAfterLoanTSLAAmount = Number(vaultAfterLoanTSLAAcc?.split('@')[0])

    const interestAfterTSLA = interestAfter.find((interest: { 'token': string }) => interest.token === 'CAT')
    const interestAccuredTSLA = interestAfterTSLA?.totalInterest

    expect(new BigNumber(vaultAfterLoanTSLAAmount - vaultBeforeLoanTSLAAmount)).toStrictEqual(new BigNumber(40).plus(interestAccuredTSLA as BigNumber))
    // check toAddress account
    expect(await bob.rpc.account.getAccount(toAddress)).toStrictEqual(['40.00000000@CAT'])
  })

  it('should takeLoan multiple tokens', async () => {
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 3, amount: new BigNumber(40) }, { token: 4, amount: new BigNumber(30) }] // 40@AMZN, 30@UBER
    }, script)

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

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    const interestAfter = await bob.rpc.loan.getInterest('scheme')

    const vaultBeforeLoanAMZNAcc = bobVault.loanAmounts?.find((amt: string) => amt.split('@')[1] === 'AMZN')
    const vaultBeforeLoanAMZNAmount = vaultBeforeLoanAMZNAcc !== undefined ? Number(vaultBeforeLoanAMZNAcc?.split('@')[0]) : 0
    const vaultBeforeLoanUBERAcc = bobVault.loanAmounts?.find((amt: string) => amt.split('@')[1] === 'UBER')
    const vaultBeforeLoanUBERAmount = vaultBeforeLoanUBERAcc !== undefined ? Number(vaultBeforeLoanUBERAcc?.split('@')[0]) : 0

    const vaultAfterLoanAMZNAcc = vaultAfter.loanAmounts.find((amt: string) => amt.split('@')[1] === 'AMZN')
    const vaultAfterLoanAMZNAmount = Number(vaultAfterLoanAMZNAcc?.split('@')[0])
    const vaultAfterLoanUBERAcc = vaultAfter.loanAmounts.find((amt: string) => amt.split('@')[1] === 'UBER')
    const vaultAfterLoanUBERAmount = Number(vaultAfterLoanUBERAcc?.split('@')[0])

    const interestAfterAMZN = interestAfter.find((interest: { 'token': string }) => interest.token === 'AMZN')
    const interestAfterUBER = interestAfter.find((interest: { 'token': string }) => interest.token === 'UBER')

    expect(new BigNumber(vaultAfterLoanAMZNAmount - vaultBeforeLoanAMZNAmount)).toStrictEqual(new BigNumber(40).plus(interestAfterAMZN?.totalInterest as BigNumber))
    expect(new BigNumber(vaultAfterLoanUBERAmount - vaultBeforeLoanUBERAmount)).toStrictEqual(new BigNumber(30).plus(interestAfterUBER?.totalInterest as BigNumber))

    // check the account of the vault address
    expect(await bob.rpc.account.getAccount(await bProviders.getAddress())).toStrictEqual(expect.arrayContaining(['40.00000000@AMZN', '30.00000000@UBER']))
  })
})

describe('loans.takeLoan failed', () => {
  beforeAll(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()

    aProviders = await getProviders(alice.container)
    aProviders.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey))
    aBuilder = new P2WPKHTransactionBuilder(aProviders.fee, aProviders.prevout, aProviders.elliptic, RegTest)

    bProviders = await getProviders(bob.container)
    bProviders.setEllipticPair(WIF.asEllipticPair(GenesisKeys[1].owner.privKey))
    bBuilder = new P2WPKHTransactionBuilder(bProviders.fee, bProviders.prevout, bProviders.elliptic, RegTest)

    script = await bProviders.elliptic.script()
    await setup()
  })

  beforeEach(async () => {
    await fundForFeesIfUTXONotAvailable(10)
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should not takeLoan on nonexistent vault', async () => {
    const txn = await bBuilder.loans.takeLoan({
      vaultId: '0'.repeat(64),
      to: { stack: [] },
      tokenAmounts: [{ token: 2, amount: new BigNumber(40) }]
    }, script)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
  })

  it('should not takeLoan on nonexistent loan token', async () => {
    const script = await bProviders.elliptic.script()
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 1, amount: new BigNumber(40) }] // BTC(1) is not a loan token
    }, script)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Loan token with id (1) does not exist!')
  })

  it('should not takeLoan by other than the vault owner', async () => {
    // node1 tries to take a loan from node0's vault
    const aScript = await aProviders.elliptic.script()
    await fundEllipticPair(alice.container, aProviders.ellipticPair, 10)

    const txn = await aBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: P2WPKH.fromAddress(RegTest, await aProviders.getAddress(), P2WPKH).getScript(),
      tokenAmounts: [{ token: 2, amount: new BigNumber(40) }]
    }, aScript)

    const promise = sendTransaction(alice.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('tx must have at least one input from vault owner')
  })

  it('should not takeLoan while exceeding vault collateralization ratio', async () => {
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 2, amount: new BigNumber(5000) }]
    }, script)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Vault does not have enough collateralization ratio defined by loan scheme')
  })

  it('should not takeLoan while exceeding vault collateralization ratio (multiple tokens)', async () => {
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: { stack: [] },
      tokenAmounts: [
        { token: 2, amount: new BigNumber(1550) },
        { token: 3, amount: new BigNumber(1200) }
      ]
    }, script)
    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Vault does not have enough collateralization ratio defined by loan scheme')
  })

  it('should not takeLoan on mintable:false token', async () => {
    await alice.container.call('updateloantoken', ['TSLA', { mintable: false }])
    await alice.generate(1)
    await tGroup.waitForSync()

    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 2, amount: new BigNumber(30) }]
    }, script)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Loan cannot be taken on token with id (2) as "mintable" is currently false')

    await alice.container.call('updateloantoken', ['TSLA', { mintable: true }])
    await alice.generate(1)
    await tGroup.waitForSync()
  })

  it('should not takeLoan on inLiquidation vault', async () => {
    await bob.rpc.loan.takeLoan({
      vaultId: liqVaultId,
      amounts: '1000@UBER'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    await alice.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      { prices: [{ tokenAmount: '6@UBER', currency: 'USD' }] })
    await alice.generate(12)
    await tGroup.waitForSync()

    const liqVault = await bob.rpc.loan.getVault(liqVaultId)
    expect(liqVault.state).toStrictEqual('inLiquidation')

    const txn = await bBuilder.loans.takeLoan({
      vaultId: liqVaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 6, amount: new BigNumber(30) }]
    }, script)

    const promise = sendTransaction(alice.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Cannot take loan on vault under liquidation')
  })

  it('should not takeLoan on mayLiquidate vault', async () => {
    await bob.rpc.loan.takeLoan({
      vaultId: mayLiqVaultId,
      amounts: '2500@CAT'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    await alice.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      { prices: [{ tokenAmount: '2.2@CAT', currency: 'USD' }] })
    await alice.generate(6)
    await tGroup.waitForSync()

    const mayLiqVault = await bob.rpc.loan.getVault(mayLiqVaultId)
    expect(mayLiqVault.state).toStrictEqual('mayLiquidate')

    const txn = await bBuilder.loans.takeLoan({
      vaultId: mayLiqVaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 4, amount: new BigNumber(1) }]
    }, script)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
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

    const frozenVault = await bob.rpc.loan.getVault(frozenVaultId)
    expect(frozenVault.state).toStrictEqual('frozen')

    const txn = await bBuilder.loans.takeLoan({
      vaultId: frozenVaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 2, amount: new BigNumber(1) }]
    }, script)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Cannot take loan while any of the asset\'s price in the vault is not live')
  })

  it('should not takeLoan as no live fixed prices', async () => {
    await alice.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: '3@GOOGL', currency: 'USD' }
        ]
      }
    )
    await alice.generate(1)

    await alice.rpc.loan.setLoanToken({
      symbol: 'GOOGL',
      fixedIntervalPriceId: 'GOOGL/USD'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 7, amount: new BigNumber(40) }]
    }, script)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('TakeLoanTx: No live fixed prices for GOOGL/USD')
  })

  it('should not takeLoan when DFI collateral value less than 50% of the minimum required collateral', async () => {
    {
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

    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 2, amount: new BigNumber(1000) }]
    }, script)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'TakeLoanTx: At least 50% of the minimum required collateral must be in DFI or DUSD\', code: -26')

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
    const txn = await bBuilder.loans.takeLoan({
      vaultId: emptyVaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 3, amount: new BigNumber(1) }]
    }, script)

    const promise = sendTransaction(bob.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`TakeLoanTx: Vault with id ${emptyVaultId} has no collaterals`)
  })
})

describe('takeLoan with 50% DUSD or DFI collaterals', () => {
  const fortCanningRoadHeight = 128

  beforeEach(async () => {
    const startFlags: StartFlags[] = [{ name: 'fortcanningroadheight', value: fortCanningRoadHeight }]
    await tGroup.start({ startFlags: startFlags })
    await alice.container.waitForWalletCoinbaseMaturity()
    await bob.container.waitForWalletCoinbaseMaturity()

    aProviders = await getProviders(alice.container)
    aProviders.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey))
    aBuilder = new P2WPKHTransactionBuilder(aProviders.fee, aProviders.prevout, aProviders.elliptic, RegTest)

    bProviders = await getProviders(bob.container)
    bProviders.setEllipticPair(WIF.asEllipticPair(GenesisKeys[1].owner.privKey))
    bBuilder = new P2WPKHTransactionBuilder(bProviders.fee, bProviders.prevout, bProviders.elliptic, RegTest)

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
    await tGroup.waitForSync()

    // loan scheme set up
    await bob.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await bob.generate(1)

    bobVaultAddr = await bProviders.getAddress()
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

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    await bProviders.setupMocks()

    const tslaLoanAmount = 2500 // loan amount = 5000 USD
    const tslaLoanHeight = await bob.container.getBlockCount()

    const toAddress = await bob.generateAddress()
    const bScript = await bProviders.elliptic.script()
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: P2WPKH.fromAddress(RegTest, toAddress, P2WPKH).getScript(),
      tokenAmounts: [{ token: 3, amount: new BigNumber(tslaLoanAmount) }]
    }, bScript)

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

    // manually calculate interest to compare rpc getInterest above is working correctly
    const height = await bob.container.getBlockCount()
    const tslaInterestPerBlock = new BigNumber((netInterest * tslaLoanAmount) / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    expect(tslaInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].interestPerBlock.toFixed(8))
    const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(new BigNumber(height - tslaLoanHeight))
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

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    await bProviders.setupMocks()

    const tslaLoanAmount = 2500 // loan amount = 5000 USD
    const tslaLoanHeight = await bob.container.getBlockCount()

    const toAddress = await bob.generateAddress()
    const bScript = await bProviders.elliptic.script()
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: P2WPKH.fromAddress(RegTest, toAddress, P2WPKH).getScript(),
      tokenAmounts: [{ token: 3, amount: new BigNumber(tslaLoanAmount) }]
    }, bScript)

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

    // manually calculate interest to compare rpc getInterest above is working correctly
    const height = await bob.container.getBlockCount()
    const tslaInterestPerBlock = new BigNumber((netInterest * tslaLoanAmount) / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    expect(tslaInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].interestPerBlock.toFixed(8))
    const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(new BigNumber(height - tslaLoanHeight))
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

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    await bProviders.setupMocks()

    const tslaLoanAmount = 1250 // loan amount = 2500 USD
    const tslaLoanHeight = await bob.container.getBlockCount()

    const toAddress = await bob.generateAddress()
    const bScript = await bProviders.elliptic.script()
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: P2WPKH.fromAddress(RegTest, toAddress, P2WPKH).getScript(),
      tokenAmounts: [{ token: 3, amount: new BigNumber(tslaLoanAmount) }]
    }, bScript)

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

    // manually calculate interest to compare rpc getInterest above is working correctly
    const height = await bob.container.getBlockCount()
    const tslaInterestPerBlock = new BigNumber((netInterest * tslaLoanAmount) / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    expect(tslaInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].interestPerBlock.toFixed(8))
    const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(new BigNumber(height - tslaLoanHeight))
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

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    await bProviders.setupMocks()

    const tslaLoanAmount = 5000 // loan amount = 10000 USD
    const tslaLoanHeight = await bob.container.getBlockCount()

    const toAddress = await bob.generateAddress()
    const bScript = await bProviders.elliptic.script()
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: P2WPKH.fromAddress(RegTest, toAddress, P2WPKH).getScript(),
      tokenAmounts: [{ token: 3, amount: new BigNumber(tslaLoanAmount) }]
    }, bScript)

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

    // manually calculate interest to compare rpc getInterest above is working correctly
    const height = await bob.container.getBlockCount()
    const tslaInterestPerBlock = new BigNumber((netInterest * tslaLoanAmount) / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    expect(tslaInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].interestPerBlock.toFixed(8))
    const tslaInterestTotal = tslaInterestPerBlock.multipliedBy(new BigNumber(height - tslaLoanHeight))
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

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    await bProviders.setupMocks()

    const tslaLoanAmount = 2500 // loan amount = 5000 USD

    const toAddress = await bob.generateAddress()
    const bScript = await bProviders.elliptic.script()
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: P2WPKH.fromAddress(RegTest, toAddress, P2WPKH).getScript(),
      tokenAmounts: [{ token: 3, amount: new BigNumber(tslaLoanAmount) }]
    }, bScript)

    // Ensure the created txn is correct
    const outs = sendTransaction(bob.container, txn)
    await expect(outs).rejects.toThrow(DeFiDRpcError)
    await expect(outs).rejects.toThrow('DeFiDRpcError: \'TakeLoanTx: At least 50% of the minimum required collateral must be in DFI or DUSD\', code: -26')
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

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    await bProviders.setupMocks()

    const tslaLoanAmount = 1250 // loan amount = 2500 USD

    const toAddress = await bob.generateAddress()
    const bScript = await bProviders.elliptic.script()
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: P2WPKH.fromAddress(RegTest, toAddress, P2WPKH).getScript(),
      tokenAmounts: [{ token: 3, amount: new BigNumber(tslaLoanAmount) }]
    }, bScript)

    // Ensure the created txn is correct
    const outs = sendTransaction(bob.container, txn)
    await expect(outs).rejects.toThrow(DeFiDRpcError)
    await expect(outs).rejects.toThrow('DeFiDRpcError: \'TakeLoanTx: At least 50% of the minimum required collateral must be in DFI or DUSD\', code: -26')
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
    await bob.generate(4)

    const blockCount = await bob.container.getBlockCount()
    expect(blockCount).toBeLessThan(fortCanningRoadHeight)

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    await bProviders.setupMocks()

    const tslaLoanAmount = 5000 // loan amount = 10000 USD

    const toAddress = await bob.generateAddress()
    const bScript = await bProviders.elliptic.script()
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: P2WPKH.fromAddress(RegTest, toAddress, P2WPKH).getScript(),
      tokenAmounts: [{ token: 3, amount: new BigNumber(tslaLoanAmount) }]
    }, bScript)

    // Ensure the created txn is correct
    const outs = sendTransaction(bob.container, txn)
    await expect(outs).rejects.toThrow(DeFiDRpcError)
    await expect(outs).rejects.toThrow('DeFiDRpcError: \'TakeLoanTx: At least 50% of the minimum required collateral must be in DFI or DUSD\', code: -26')
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

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    await bProviders.setupMocks()

    const tslaLoanAmount = 3750 // loan amount = 7500 USD

    const toAddress = await bob.generateAddress()
    const bScript = await bProviders.elliptic.script()
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: P2WPKH.fromAddress(RegTest, toAddress, P2WPKH).getScript(),
      tokenAmounts: [{ token: 3, amount: new BigNumber(tslaLoanAmount) }]
    }, bScript)

    // Ensure the created txn is correct
    const outs = sendTransaction(bob.container, txn)
    await expect(outs).rejects.toThrow(DeFiDRpcError)
    await expect(outs).rejects.toThrow('DeFiDRpcError: \'TakeLoanTx: At least 50% of the minimum required collateral must be in DFI or DUSD\', code: -26')
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

    await fundEllipticPair(bob.container, bProviders.ellipticPair, 10)
    await bProviders.setupMocks()

    const tslaLoanAmount = 5000.5 // loan amount = 10001 USD

    const toAddress = await bob.generateAddress()
    const bScript = await bProviders.elliptic.script()
    const txn = await bBuilder.loans.takeLoan({
      vaultId: bobVaultId,
      to: P2WPKH.fromAddress(RegTest, toAddress, P2WPKH).getScript(),
      tokenAmounts: [{ token: 3, amount: new BigNumber(tslaLoanAmount) }]
    }, bScript)

    // Ensure the created txn is correct
    const outs = sendTransaction(bob.container, txn)
    await expect(outs).rejects.toThrow(DeFiDRpcError)
    await expect(outs).rejects.toThrow('DeFiDRpcError: \'TakeLoanTx: At least 50% of the minimum required collateral must be in DFI or DUSD\', code: -26')
  })
})
