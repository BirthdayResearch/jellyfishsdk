import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

const tGroup = TestingGroup.create(3, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
let vaultId: string
let vaultAddress: string
let vaultId1: string
let vaultAddress1: string
let liqVaultId: string
let loanTokenAddress: string

async function setup (): Promise<void> {
  // token setup
  const collateralAddress = await tGroup.get(0).container.getNewAddress()
  await tGroup.get(0).token.dfi({ address: collateralAddress, amount: 100000 })
  await tGroup.get(0).generate(1)
  await tGroup.get(0).token.create({ symbol: 'BTC', collateralAddress })
  await tGroup.get(0).generate(1)
  await tGroup.get(0).token.mint({ symbol: 'BTC', amount: 30000 })
  await tGroup.get(0).generate(1)

  // oracle setup
  const addr = await tGroup.get(0).generateAddress()
  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'BTC', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'AMZN', currency: 'USD' },
    { token: 'UBER', currency: 'USD' }
  ]
  const oracleId = await tGroup.get(0).rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
  await tGroup.get(0).generate(1)

  const timestamp = Math.floor(new Date().getTime() / 1000)
  await tGroup.get(0).rpc.oracle.setOracleData(
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
  await tGroup.get(0).generate(1)

  // setCollateralToken DFI
  await tGroup.get(0).rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    priceFeedId: 'DFI/USD'
  })
  await tGroup.get(0).generate(1)

  // setCollateralToken BTC
  await tGroup.get(0).rpc.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(0.5),
    priceFeedId: 'BTC/USD'
  })
  await tGroup.get(0).generate(1)

  // setLoanToken TSLA
  await tGroup.get(0).rpc.loan.setLoanToken({
    symbol: 'TSLA',
    priceFeedId: 'TSLA/USD'
  })
  await tGroup.get(0).generate(1)

  // mint loan token TSLA
  await tGroup.get(0).token.mint({ symbol: 'TSLA', amount: 20000 })
  await tGroup.get(0).generate(1)

  // setLoanToken AMZN
  await tGroup.get(0).rpc.loan.setLoanToken({
    symbol: 'AMZN',
    priceFeedId: 'AMZN/USD'
  })
  await tGroup.get(0).generate(1)

  // mint loan token AMZN
  await tGroup.get(0).token.mint({ symbol: 'AMZN', amount: 40000 })
  await tGroup.get(0).generate(1)

  // setLoanToken UBER
  await tGroup.get(0).rpc.loan.setLoanToken({
    symbol: 'UBER',
    priceFeedId: 'UBER/USD'
  })
  await tGroup.get(0).generate(1)

  // createLoanScheme 'scheme'
  await tGroup.get(0).rpc.loan.createLoanScheme({
    minColRatio: 200,
    interestRate: new BigNumber(3),
    id: 'scheme'
  })
  await tGroup.get(0).generate(1)

  // createVault
  vaultAddress = await tGroup.get(0).generateAddress()
  vaultId = await tGroup.get(0).rpc.loan.createVault({
    ownerAddress: vaultAddress,
    loanSchemeId: 'scheme'
  })
  await tGroup.get(0).generate(1)

  // depositToVault DFI 1000
  await tGroup.get(0).rpc.loan.depositToVault({
    vaultId: vaultId, from: collateralAddress, amount: '10000@DFI'
  })
  await tGroup.get(0).generate(1)

  // depositToVault BTC 1
  await tGroup.get(0).rpc.loan.depositToVault({
    vaultId: vaultId, from: collateralAddress, amount: '1@BTC'
  })
  await tGroup.get(0).generate(1)

  // createVault #2
  vaultAddress1 = await tGroup.get(0).generateAddress()
  vaultId1 = await tGroup.get(0).rpc.loan.createVault({
    ownerAddress: vaultAddress1,
    loanSchemeId: 'scheme'
  })
  await tGroup.get(0).generate(1)

  await tGroup.get(0).rpc.loan.depositToVault({
    vaultId: vaultId1, from: collateralAddress, amount: '10000@DFI'
  })
  await tGroup.get(0).generate(1)

  // createVault for liquidation
  const liqVaultAddress = await tGroup.get(0).generateAddress()
  liqVaultId = await tGroup.get(0).rpc.loan.createVault({
    ownerAddress: liqVaultAddress,
    loanSchemeId: 'scheme'
  })
  await tGroup.get(0).generate(1)

  await tGroup.get(0).rpc.loan.depositToVault({
    vaultId: liqVaultId, from: collateralAddress, amount: '10000@DFI'
  })
  await tGroup.get(0).generate(1)

  await tGroup.get(0).rpc.loan.takeLoan({
    vaultId: liqVaultId,
    amounts: '100@UBER'
  })
  await tGroup.get(0).generate(1)

  // liquidated: true
  await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '100000@UBER', currency: 'USD' }] })
  await tGroup.get(0).generate(1)
  await tGroup.waitForSync()

  // fixture for loanPayback
  const tokenAddress = await tGroup.get(0).container.getNewAddress()
  await tGroup.get(0).token.dfi({ address: tokenAddress, amount: 600000 })
  await tGroup.get(0).generate(1)
  await tGroup.get(0).token.create({ symbol: 'dUSD', collateralAddress: tokenAddress })
  await tGroup.get(0).generate(1)
  await tGroup.get(0).token.mint({ symbol: 'dUSD', amount: 100000 })
  await tGroup.get(0).generate(1)

  // create TSLA-dUSD
  await tGroup.get(0).poolpair.create({
    tokenA: 'TSLA',
    tokenB: 'dUSD'
  })
  await tGroup.get(0).generate(1)

  // add TSLA-dUSD
  await tGroup.get(0).poolpair.add({
    a: { symbol: 'TSLA', amount: 20000 },
    b: { symbol: 'dUSD', amount: 10000 }
  })
  await tGroup.get(0).generate(1)

  // create AMZN-dUSD
  await tGroup.get(0).poolpair.create({
    tokenA: 'AMZN',
    tokenB: 'dUSD'
  })
  await tGroup.get(0).generate(1)

  // add AMZN-dUSD
  await tGroup.get(0).poolpair.add({
    a: { symbol: 'AMZN', amount: 40000 },
    b: { symbol: 'dUSD', amount: 10000 }
  })
  await tGroup.get(0).generate(1)

  // create dUSD-DFI
  await tGroup.get(0).poolpair.create({
    tokenA: 'dUSD',
    tokenB: 'DFI'
  })
  await tGroup.get(0).generate(1)

  // add dUSD-DFI
  await tGroup.get(0).poolpair.add({
    a: { symbol: 'dUSD', amount: 25000 },
    b: { symbol: 'DFI', amount: 10000 }
  })
  await tGroup.get(0).generate(1)

  loanTokenAddress = await tGroup.get(0).generateAddress()
  await tGroup.get(0).rpc.loan.takeLoan({
    vaultId: vaultId,
    to: loanTokenAddress,
    amounts: '40@TSLA'
  })
  await tGroup.get(0).generate(1)
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
    const burnInfoBefore = await tGroup.get(0).container.call('getburninfo')
    expect(burnInfoBefore.paybackburn).toStrictEqual(undefined)

    const loanAccBefore = await tGroup.get(0).container.call('getaccount', [loanTokenAddress])
    expect(loanAccBefore).toStrictEqual(['40.00000000@TSLA'])

    const vaultBefore = await tGroup.get(0).container.call('getvault', [vaultId])
    expect(vaultBefore.collateralValue).toStrictEqual(15000) // DFI(10000) + BTC(1 * 10000 * 0.5)
    expect(vaultBefore.loanAmount).toStrictEqual(['40.00002280@TSLA']) // 40 + (40 * 0.00000057)
    expect(vaultBefore.loanValue).toStrictEqual(80.0000456) // 40.00002280 * 2 (::1 TSLA = 2 DFI)
    expect(vaultBefore.currentRatio).toStrictEqual(18750) // 15000 / 80.0000456 * 100

    const txid = await tGroup.get(0).rpc.loan.loanPayback({
      vaultId: vaultId,
      amounts: '13@TSLA',
      from: loanTokenAddress
    })
    expect(typeof txid).toStrictEqual('string')
    await tGroup.get(0).generate(1)

    const loanAccAfter = await tGroup.get(0).container.call('getaccount', [loanTokenAddress])
    expect(loanAccAfter).toStrictEqual(['27.00000000@TSLA']) // 40 - 13 = 27

    const vaultAfter = await tGroup.get(0).container.call('getvault', [vaultId])
    expect(vaultAfter.loanAmount).toStrictEqual(['27.00003021@TSLA']) // 27 + (27 * 0.00000057) = 27.00001539
    expect(vaultAfter.loanValue).toStrictEqual(54.00006042) // 27.00003021 * 2 (::1 TSLA = 2 DFI)
    expect(vaultAfter.currentRatio).toStrictEqual(27778) // 15000 / 54.00006042 * 100

    const burnInfoAfter = await tGroup.get(0).container.call('getburninfo')
    expect(burnInfoAfter.paybackburn).toStrictEqual(0.00000297)
  })
})

describe('loanPayback multiple amounts', () => {
  it('should loanPayback with multiple amounts', async () => {
    const burnInfoBefore = await tGroup.get(0).container.call('getburninfo')
    expect(burnInfoBefore.paybackburn).toStrictEqual(undefined)

    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: ['15@AMZN'],
      to: loanTokenAddress
    })
    await tGroup.get(0).generate(1)

    const loanTokenAccBefore = await tGroup.get(0).container.call('getaccount', [loanTokenAddress])
    expect(loanTokenAccBefore).toStrictEqual(['40.00000000@TSLA', '15.00000000@AMZN'])

    const vaultBefore = await tGroup.get(0).container.call('getvault', [vaultId])
    expect(vaultBefore.loanAmount).toStrictEqual(['40.00004560@TSLA', '15.00000855@AMZN'])
    expect(vaultBefore.loanValue).toStrictEqual(140.0001254)
    expect(vaultBefore.currentRatio).toStrictEqual(10714)

    const txid = await tGroup.get(0).rpc.loan.loanPayback({
      vaultId: vaultId,
      amounts: ['13@TSLA', '6@AMZN'],
      from: loanTokenAddress
    })
    expect(typeof txid).toStrictEqual('string')
    await tGroup.get(0).generate(1)

    const loanTokenAccAfter = await tGroup.get(0).container.call('getaccount', [loanTokenAddress])
    expect(loanTokenAccAfter).toStrictEqual(['27.00000000@TSLA', '9.00000000@AMZN'])

    const vaultAfter = await tGroup.get(0).container.call('getvault', [vaultId])
    expect(vaultAfter.loanAmount).toStrictEqual(['27.00005301@TSLA', '9.00001197@AMZN'])
    expect(vaultAfter.loanValue).toStrictEqual(90.0001539)
    expect(vaultAfter.currentRatio).toStrictEqual(16667)

    const burnInfoAfter = await tGroup.get(0).container.call('getburninfo')
    expect(burnInfoAfter.paybackburn).toStrictEqual(0.00000514)
  })
})

describe('loanPayback with utxos', () => {
  it('should loanPayback with utxos', async () => {
    const vaultBefore = await tGroup.get(0).container.call('getvault', [vaultId])
    expect(vaultBefore.loanAmount).toStrictEqual(['40.00002280@TSLA'])
    expect(vaultBefore.loanValue).toStrictEqual(80.0000456)
    expect(vaultBefore.currentRatio).toStrictEqual(18750)

    const utxo = await tGroup.get(0).container.fundAddress(loanTokenAddress, 250)

    const txid = await tGroup.get(0).rpc.loan.loanPayback({
      vaultId: vaultId,
      amounts: '13@TSLA',
      from: loanTokenAddress
    }, [utxo])
    expect(typeof txid).toStrictEqual('string')
    await tGroup.get(0).generate(1)

    const vaultAfter = await tGroup.get(0).container.call('getvault', [vaultId])
    expect(vaultAfter.loanAmount).toStrictEqual(['27.00005301@TSLA'])
    expect(vaultAfter.loanValue).toStrictEqual(54.00010602)
    expect(vaultAfter.currentRatio).toStrictEqual(27778)

    const rawtx = await tGroup.get(0).container.call('getrawtransaction', [txid, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })
})

describe('loanPayback failed', () => {
  it('should not loanPayback with arbitrary utxo', async () => {
    const utxo = await tGroup.get(0).container.fundAddress(vaultAddress, 250)
    const promise = tGroup.get(0).rpc.loan.loanPayback({
      vaultId: vaultId,
      amounts: '13@TSLA',
      from: loanTokenAddress
    }, [utxo])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('tx must have at least one input from token owner')
  })

  it('should not loanPayback on nonexistent vault', async () => {
    const promise = tGroup.get(0).rpc.loan.loanPayback({
      vaultId: '0'.repeat(64),
      amounts: '30@TSLA',
      from: loanTokenAddress
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Cannot find existing vault with id ${'0'.repeat(64)}`)
  })

  it('should not loanPayback on nonexistent loan token', async () => {
    const promise = tGroup.get(0).rpc.loan.loanPayback({
      vaultId: vaultId,
      amounts: '1@BTC',
      from: loanTokenAddress

    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Loan token with id (1) does not exist!')
  })

  it('should not loanPayback on invalid token', async () => {
    const promise = tGroup.get(0).rpc.loan.loanPayback({
      vaultId: vaultId,
      amounts: '1@INVALID',
      from: loanTokenAddress
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid Defi token: INVALID')
  })

  it('should not loanPayback on incorrect auth', async () => {
    const promise = tGroup.get(1).rpc.loan.loanPayback({
      vaultId: vaultId,
      amounts: '30@TSLA',
      from: loanTokenAddress
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Address (${loanTokenAddress}) is not owned by the wallet`)
  })

  it('should not loanPayback as no loan on vault', async () => {
    const promise = tGroup.get(0).rpc.loan.loanPayback({
      vaultId: vaultId1,
      amounts: '30@TSLA',
      from: loanTokenAddress
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`There are no loans on this vault (${vaultId1})`)
  })

  it('should not loanPayback while exceeds loan value', async () => {
    const promise = tGroup.get(0).rpc.loan.loanPayback({
      vaultId: vaultId,
      amounts: '41@TSLA',
      from: loanTokenAddress
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    // loanValue 80.0000456 - loanPayback 80 =  0.00004560
    await expect(promise).rejects.toThrow('amount 0.00000000 is less than 0.00004560')
  })

  it('should not loanPayback as no token in this vault', async () => {
    const promise = tGroup.get(0).rpc.loan.loanPayback({
      vaultId: vaultId,
      amounts: '30@AMZN',
      from: loanTokenAddress
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('There is no loan on token (AMZN) in this vault!')
  })

  it('should not loanPayback on liquidation vault', async () => {
    const liqVault = await tGroup.get(0).container.call('getvault', [liqVaultId])
    expect(liqVault.isUnderLiquidation).toStrictEqual(true)

    const promise = tGroup.get(0).rpc.loan.loanPayback({
      vaultId: liqVaultId,
      amounts: '30@UBER',
      from: loanTokenAddress
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot payback loan on vault under liquidation')
  })
})
