import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)
let bobVaultId: string
let bobVaultAddr: string
let bobVaultId1: string
let bobVaultAddr1: string
let bobLiqVaultId: string
let bobloanAddr: string
let bobColAddr: string

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
    priceFeedId: 'DFI/USD'
  })
  await alice.generate(1)

  // setCollateralToken BTC
  await alice.rpc.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(0.5),
    priceFeedId: 'BTC/USD'
  })
  await alice.generate(1)

  // setLoanToken TSLA
  await alice.rpc.loan.setLoanToken({
    symbol: 'TSLA',
    priceFeedId: 'TSLA/USD'
  })
  await alice.generate(1)

  // mint loan token TSLA
  await alice.token.mint({ symbol: 'TSLA', amount: 20000 })
  await alice.generate(1)

  await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['20000@TSLA'] })
  await alice.generate(1)

  // setLoanToken AMZN
  await alice.rpc.loan.setLoanToken({
    symbol: 'AMZN',
    priceFeedId: 'AMZN/USD'
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
    priceFeedId: 'UBER/USD'
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

  bobColAddr = await bob.generateAddress()
  await bob.token.dfi({ address: bobColAddr, amount: 30000 })
  await bob.generate(1)
  await tGroup.waitForSync()

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

  bobloanAddr = await bob.generateAddress()
  await bob.rpc.loan.takeLoan({
    vaultId: bobVaultId,
    to: bobloanAddr,
    amounts: '40@TSLA'
  })
  await bob.generate(1)
  await tGroup.waitForSync()
}

beforeEach(async () => {
  await tGroup.start()
  await setup()
})

afterEach(async () => {
  await tGroup.stop()
})

describe('loanPayback', () => {
  it('should loanPayback', async () => {
    const burnInfoBefore = await bob.container.call('getburninfo')
    expect(burnInfoBefore.paybackburn).toStrictEqual(undefined)

    const loanAccBefore = await bob.container.call('getaccount', [bobloanAddr])
    expect(loanAccBefore).toStrictEqual(['40.00000000@TSLA'])

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.collateralValue).toStrictEqual(15000) // DFI(10000) + BTC(1 * 10000 * 0.5)
    expect(vaultBefore.loanAmount).toStrictEqual(['40.00002280@TSLA']) // 40 + (40 * 0.00000057)
    expect(vaultBefore.loanValue).toStrictEqual(80.0000456) // 40.00002280 * 2 (::1 TSLA = 2 DFI)
    expect(vaultBefore.currentRatio).toStrictEqual(18750) // 15000 / 80.0000456 * 100

    const txid = await bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '13@TSLA',
      from: bobloanAddr
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    const loanAccAfter = await bob.container.call('getaccount', [bobloanAddr])
    expect(loanAccAfter).toStrictEqual(['27.00000000@TSLA']) // 40 - 13 = 27

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmount).toStrictEqual(['27.00003021@TSLA']) // 27 + (27 * 0.00000057) = 27.00001539
    expect(vaultAfter.loanValue).toStrictEqual(54.00006042) // 27.00003021 * 2 (::1 TSLA = 2 DFI)
    expect(vaultAfter.currentRatio).toStrictEqual(27778) // 15000 / 54.00006042 * 100

    const burnInfoAfter = await bob.container.call('getburninfo')
    expect(burnInfoAfter.paybackburn).toStrictEqual(0.00000297)
  })
})

describe('loanPayback multiple amounts', () => {
  it('should loanPayback with multiple amounts', async () => {
    const burnInfoBefore = await bob.container.call('getburninfo')
    expect(burnInfoBefore.paybackburn).toStrictEqual(undefined)

    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: ['15@AMZN'],
      to: bobloanAddr
    })
    await bob.generate(1)

    const loanTokenAccBefore = await bob.container.call('getaccount', [bobloanAddr])
    expect(loanTokenAccBefore).toStrictEqual(['40.00000000@TSLA', '15.00000000@AMZN'])

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.loanAmount).toStrictEqual(['40.00004560@TSLA', '15.00000855@AMZN'])
    expect(vaultBefore.loanValue).toStrictEqual(140.0001254)
    expect(vaultBefore.currentRatio).toStrictEqual(10714)

    const txid = await bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: ['13@TSLA', '6@AMZN'],
      from: bobloanAddr
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    const loanTokenAccAfter = await bob.container.call('getaccount', [bobloanAddr])
    expect(loanTokenAccAfter).toStrictEqual(['27.00000000@TSLA', '9.00000000@AMZN'])

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmount).toStrictEqual(['27.00005301@TSLA', '9.00001197@AMZN'])
    expect(vaultAfter.loanValue).toStrictEqual(90.0001539)
    expect(vaultAfter.currentRatio).toStrictEqual(16667)

    const burnInfoAfter = await bob.container.call('getburninfo')
    expect(burnInfoAfter.paybackburn).toStrictEqual(0.00000514)
  })
})

describe('loanPayback with utxos', () => {
  it('should loanPayback with utxos', async () => {
    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.loanAmount).toStrictEqual(['40.00002280@TSLA'])
    expect(vaultBefore.loanValue).toStrictEqual(80.0000456)
    expect(vaultBefore.currentRatio).toStrictEqual(18750)

    const utxo = await bob.container.fundAddress(bobloanAddr, 250)

    const txid = await bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '13@TSLA',
      from: bobloanAddr
    }, [utxo])
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmount).toStrictEqual(['27.00005301@TSLA'])
    expect(vaultAfter.loanValue).toStrictEqual(54.00010602)
    expect(vaultAfter.currentRatio).toStrictEqual(27778)

    const rawtx = await bob.container.call('getrawtransaction', [txid, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })
})

describe('loanPayback failed', () => {
  it('should not loanPayback with arbitrary utxo', async () => {
    const utxo = await bob.container.fundAddress(bobVaultAddr, 250)
    const promise = bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '13@TSLA',
      from: bobloanAddr
    }, [utxo])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('tx must have at least one input from token owner')
  })

  it('should not loanPayback on nonexistent vault', async () => {
    const promise = bob.rpc.loan.loanPayback({
      vaultId: '0'.repeat(64),
      amounts: '30@TSLA',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Cannot find existing vault with id ${'0'.repeat(64)}`)
  })

  it('should not loanPayback on nonexistent loan token', async () => {
    const promise = bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '1@BTC',
      from: bobloanAddr

    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Loan token with id (1) does not exist!')
  })

  it('should not loanPayback on invalid token', async () => {
    const promise = bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '1@INVALID',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid Defi token: INVALID')
  })

  it('should not loanPayback on incorrect auth', async () => {
    const promise = alice.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '30@TSLA',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Address (${bobloanAddr}) is not owned by the wallet`)
  })

  it('should not loanPayback as no loan on vault', async () => {
    const promise = bob.rpc.loan.loanPayback({
      vaultId: bobVaultId1,
      amounts: '30@TSLA',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`There are no loans on this vault (${bobVaultId1})`)
  })

  it('should not loanPayback while exceeds loan value', async () => {
    const promise = bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '41@TSLA',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    // loanValue 80.0000456 - loanPayback 80 =  0.00004560
    await expect(promise).rejects.toThrow('amount 0.00000000 is less than 0.00004560')
  })

  it('should not loanPayback as no token in this vault', async () => {
    const promise = bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '30@AMZN',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('There is no loan on token (AMZN) in this vault!')
  })

  it('should not loanPayback on liquidation vault', async () => {
    const liqVault = await bob.container.call('getvault', [bobLiqVaultId])
    expect(liqVault.isUnderLiquidation).toStrictEqual(true)

    const promise = bob.rpc.loan.loanPayback({
      vaultId: bobLiqVaultId,
      amounts: '30@UBER',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot payback loan on vault under liquidation')
  })
})
