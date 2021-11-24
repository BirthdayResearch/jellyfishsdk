import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { VaultActive, VaultLiquidation } from '../../../src/category/loan'

const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)
let aliceColAddr: string
let oracleId: string

function now (): number {
  return Math.floor(new Date().getTime() / 1000)
}

async function setup1 (): Promise<void> {
  // token setup
  aliceColAddr = await alice.generateAddress()
  await alice.token.dfi({ address: aliceColAddr, amount: 30000 })
  await alice.generate(1)
  await alice.token.create({ symbol: 'BTC', collateralAddress: aliceColAddr })
  await alice.generate(1)
  await alice.token.mint({ symbol: 'BTC', amount: 30000 })
  await alice.generate(1)
  await alice.token.create({ symbol: 'DUSD', collateralAddress: aliceColAddr })
  await alice.generate(1)
  await alice.token.mint({ symbol: 'DUSD', amount: 30000 })
  await alice.generate(1)

  // oracle setup
  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'BTC', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' }
  ]
  oracleId = await alice.rpc.oracle.appointOracle(await alice.generateAddress(), priceFeeds, { weightage: 1 })
  await alice.generate(1)
  await alice.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '100@DFI', currency: 'USD' }] })
  await alice.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '100@BTC', currency: 'USD' }] })
  await alice.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '100@TSLA', currency: 'USD' }] })
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
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'BTC/USD'
  })
  await alice.generate(1)

  // loan token
  await alice.rpc.loan.setLoanToken({
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await alice.generate(1)

  await alice.token.mint({ symbol: 'TSLA', amount: 30000 })
  await alice.generate(1)

  await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['10000@TSLA'] })
  await alice.generate(1)

  // setup pools
  // create pool DUSD-TSLA
  await alice.poolpair.create({
    tokenA: 'DUSD',
    tokenB: 'TSLA',
    ownerAddress: aliceColAddr
  })
  await alice.generate(1)

  // create pool DUSD-DFI
  await alice.poolpair.create({
    tokenA: 'DUSD',
    tokenB: 'DFI',
    ownerAddress: aliceColAddr
  })
  await alice.generate(1)

  // add pool liquidity
  await alice.poolpair.add({
    a: { symbol: 'DUSD', amount: 1000 },
    b: { symbol: 'DFI', amount: 1000 }
  })
  await alice.generate(1)

  await alice.poolpair.add({
    a: { symbol: 'DUSD', amount: 1000 },
    b: { symbol: 'TSLA', amount: 1000 }
  })
  await alice.generate(1)

  // Loan200 scheme set up
  await alice.rpc.loan.createLoanScheme({
    minColRatio: 200,
    interestRate: new BigNumber(1),
    id: 'Loan200'
  })
  await alice.generate(1)
  await tGroup.waitForSync()
}

describe('placeAuctionBid DUSD pools setup', () => {
  beforeEach(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()
    await setup1()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  it('should make the vault active after completion of one auction batch', async () => {
    // create vault
    const aliceVaultAddr = await alice.generateAddress()
    const aliceVaultId = await alice.rpc.loan.createVault({
      ownerAddress: aliceVaultAddr,
      loanSchemeId: 'Loan200'
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: aliceVaultId, from: aliceColAddr, amount: '60@DFI'
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: aliceVaultId, from: aliceColAddr, amount: '60@BTC'
    })
    await alice.generate(1)

    const aliceLoanAddr = await bob.generateAddress()
    await alice.rpc.loan.takeLoan({
      vaultId: aliceVaultId,
      amounts: '60@TSLA',
      to: aliceLoanAddr
    })
    await alice.generate(1)

    const aliceLoanAcc = await bob.container.call('getaccount', [aliceLoanAddr])
    expect(aliceLoanAcc).toStrictEqual(['60.00000000@TSLA'])

    // update the price again for 101@TSLA
    await alice.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '100@DFI', currency: 'USD' }, { tokenAmount: '100@BTC', currency: 'USD' }, { tokenAmount: '101@TSLA', currency: 'USD' }] })
    await alice.generate(12)

    // see the aliceVaultId inLiquidation
    const vault = await alice.rpc.loan.getVault(aliceVaultId) as VaultLiquidation
    expect(vault.state).toStrictEqual('inLiquidation')
    expect(vault.batches).toStrictEqual([
      { index: 0, collaterals: ['49.99999980@DFI', '49.99999980@BTC'], loan: '50.00009488@TSLA' },
      { index: 1, collaterals: ['10.00000020@DFI', '10.00000020@BTC'], loan: '10.00001922@TSLA' }
    ])

    // place auction bid for the first batch
    const txid1 = await alice.rpc.loan.placeAuctionBid({
      vaultId: aliceVaultId,
      index: 0,
      from: aliceColAddr,
      amount: '59.41@TSLA'
    })
    expect(typeof txid1).toStrictEqual('string')
    await alice.container.generate(1)

    // end the auction
    await alice.container.generate(35)

    // check the vault again
    const vaultAfter = await alice.rpc.loan.getVault(aliceVaultId) as VaultActive
    expect(vaultAfter.state).toStrictEqual('active')
    expect(Number(vaultAfter.collateralAmounts[0].split('@')[0])).toBeGreaterThan(10.00000020)

    // update the prices back
    await alice.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '100@DFI', currency: 'USD' }, { tokenAmount: '100@BTC', currency: 'USD' }, { tokenAmount: '100@TSLA', currency: 'USD' }] })
    await alice.generate(12)
    await tGroup.waitForSync()
  })
})

async function setup2 (): Promise<void> {
  // token setup
  aliceColAddr = await alice.generateAddress()
  await alice.token.dfi({ address: aliceColAddr, amount: 30000 })
  await alice.generate(1)
  await alice.token.create({ symbol: 'BTC', collateralAddress: aliceColAddr })
  await alice.generate(1)
  await alice.token.mint({ symbol: 'BTC', amount: 30000 })
  await alice.generate(1)

  // oracle setup
  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'BTC', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' }
  ]
  oracleId = await alice.rpc.oracle.appointOracle(await alice.generateAddress(), priceFeeds, { weightage: 1 })
  await alice.generate(1)
  await alice.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '100@DFI', currency: 'USD' }] })
  await alice.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '100@BTC', currency: 'USD' }] })
  await alice.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '100@TSLA', currency: 'USD' }] })
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
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'BTC/USD'
  })
  await alice.generate(1)

  // loan token
  await alice.rpc.loan.setLoanToken({
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await alice.generate(1)

  await alice.token.mint({ symbol: 'TSLA', amount: 30000 })
  await alice.generate(1)

  await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['10000@TSLA'] })
  await alice.generate(1)

  // loan scheme set up
  await alice.rpc.loan.createLoanScheme({
    minColRatio: 200,
    interestRate: new BigNumber(3),
    id: 'Loan200'
  })
  await alice.generate(1)
  await tGroup.waitForSync()

  // // create DFI-TSLA pool
  // await alice.poolpair.create({
  //   tokenA: 'DFI',
  //   tokenB: 'TSLA',
  //   ownerAddress: aliceColAddr
  // })
  // await alice.generate(1)

  // // add DFI-TSLA
  // await alice.poolpair.add({
  //   a: { symbol: 'DFI', amount: 1000 },
  //   b: { symbol: 'TSLA', amount: 1000 }
  // })
  // await alice.generate(1)
}

describe('placeAuctionBid without pools setup', () => {
  beforeEach(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()
    await setup2()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  it('should check vault state after completion of one auction batch', async () => {
    // create vault
    const aliceVaultAddr = await alice.generateAddress()
    const aliceVaultId = await alice.rpc.loan.createVault({
      ownerAddress: aliceVaultAddr,
      loanSchemeId: 'Loan200'
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: aliceVaultId, from: aliceColAddr, amount: '60@DFI'
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: aliceVaultId, from: aliceColAddr, amount: '60@BTC'
    })
    await alice.generate(1)

    const aliceLoanAddr = await bob.generateAddress()
    await alice.rpc.loan.takeLoan({
      vaultId: aliceVaultId,
      amounts: '60@TSLA',
      to: aliceLoanAddr
    })
    await alice.generate(1)

    const aliceLoanAcc = await bob.container.call('getaccount', [aliceLoanAddr])
    expect(aliceLoanAcc).toStrictEqual(['60.00000000@TSLA'])

    // update the price again for 101@TSLA
    await alice.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '100@DFI', currency: 'USD' }, { tokenAmount: '100@BTC', currency: 'USD' }, { tokenAmount: '101@TSLA', currency: 'USD' }] })
    await alice.generate(12)

    // see the aliceVaultId inLiquidation
    const vault = await alice.rpc.loan.getVault(aliceVaultId) as VaultLiquidation
    expect(vault.state).toStrictEqual('inLiquidation')
    expect(vault.batches).toStrictEqual([
      { index: 0, collaterals: ['49.99999980@DFI', '49.99999980@BTC'], loan: '50.00028513@TSLA' },
      { index: 1, collaterals: ['10.00000020@DFI', '10.00000020@BTC'], loan: '10.00005727@TSLA' }
    ])

    // place auction bid for the first batch
    const txid1 = await alice.rpc.loan.placeAuctionBid({
      vaultId: aliceVaultId,
      index: 0,
      from: aliceColAddr,
      amount: '59.41@TSLA'
    })
    expect(typeof txid1).toStrictEqual('string')
    await alice.container.generate(1)

    // end the auction
    await alice.container.generate(35)

    // check the vault again
    const vaultAfter = await alice.rpc.loan.getVault(aliceVaultId) as VaultLiquidation
    console.log(vaultAfter)
    expect(vaultAfter.state).toStrictEqual('inLiquidation')
    expect(Number(vaultAfter.batches[0].collaterals[0].split('@')[0])).toStrictEqual(10.00000020) // 10.00000020@DFI

    // update the prices back
    await alice.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '100@DFI', currency: 'USD' }, { tokenAmount: '100@BTC', currency: 'USD' }, { tokenAmount: '100@TSLA', currency: 'USD' }] })
    await alice.generate(12)
    await tGroup.waitForSync()
  })
})
