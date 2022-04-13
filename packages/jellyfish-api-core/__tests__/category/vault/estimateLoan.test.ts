import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

/**
 * Seperating the cases to isolate env so that test can run faster
 * without env interfering with each other.
 */
async function setupVault (tGroup: TestingGroup): Promise<{
  vaultId: string
  collateralAddress: string
  oracleId: string
}> {
  // token setup
  const collateralAddress = await tGroup.get(0).container.getNewAddress()
  await tGroup.get(0).token.dfi({ address: collateralAddress, amount: 30000 })
  await tGroup.get(0).generate(1)
  await tGroup.get(0).token.create({ symbol: 'BTC', collateralAddress })
  await tGroup.get(0).generate(1)
  await tGroup.get(0).token.mint({ symbol: 'BTC', amount: 20000 })
  await tGroup.get(0).generate(1)

  // oracle setup
  const addr = await tGroup.get(0).generateAddress()
  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'BTC', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'MSFT', currency: 'USD' }
  ]
  const oracleId = await tGroup.get(0).rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
  await tGroup.get(0).generate(1)
  const oracleTickTimestamp = Math.floor(new Date().getTime() / 1000)
  await tGroup.get(0).rpc.oracle.setOracleData(oracleId, oracleTickTimestamp, {
    prices: [
      { tokenAmount: '1@DFI', currency: 'USD' },
      { tokenAmount: '10000@BTC', currency: 'USD' },
      { tokenAmount: '2@TSLA', currency: 'USD' },
      { tokenAmount: '5@MSFT', currency: 'USD' }
    ]
  })
  await tGroup.get(0).generate(1)

  // collateral token
  await tGroup.get(0).rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })
  await tGroup.get(0).generate(1)

  await tGroup.get(0).rpc.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(0.5),
    fixedIntervalPriceId: 'BTC/USD'
  })
  await tGroup.get(0).generate(1)

  // loan token
  await tGroup.get(0).rpc.loan.setLoanToken({
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await tGroup.get(0).generate(1)
  await tGroup.get(0).rpc.loan.setLoanToken({
    symbol: 'MSFT',
    fixedIntervalPriceId: 'MSFT/USD'
  })
  await tGroup.get(0).generate(1)

  // loan scheme set up
  await tGroup.get(0).rpc.loan.createLoanScheme({
    minColRatio: 150,
    interestRate: new BigNumber(3),
    id: 'scheme'
  })
  await tGroup.get(0).generate(1)
  const vaultOwner = await tGroup.get(0).generateAddress()

  const vaultId = await tGroup.get(0).rpc.vault.createVault({
    ownerAddress: vaultOwner,
    loanSchemeId: 'scheme'
  })
  await tGroup.get(0).generate(1)

  await tGroup.get(0).rpc.vault.depositToVault({
    vaultId: vaultId, from: collateralAddress, amount: '10000@DFI'
  })
  await tGroup.get(0).rpc.vault.depositToVault({
    vaultId: vaultId, from: collateralAddress, amount: '1@BTC'
  })
  await tGroup.get(0).generate(1)

  await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
    prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }, { tokenAmount: '5@MSFT', currency: 'USD' }]
  })

  await tGroup.get(0).generate(1)

  await tGroup.waitForSync()

  return { vaultId, collateralAddress, oracleId }
}

// Passing cases
describe('Vault estimateLoan', () => {
  const tGroup = TestingGroup.create(2, i => new MasterNodeRegTestContainer())
  let vaultId: string // dual collateral, with loan taken, test: loan:collateral ratio

  beforeAll(async () => {
    await tGroup.start()
    await tGroup.get(0).container.waitForWalletCoinbaseMaturity();
    ({ vaultId } = await setupVault(tGroup))
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should estimateLoan for single loan token', async () => {
    const estimation = await tGroup.get(1).rpc.vault.estimateLoan(vaultId, { TSLA: 1 })
    /**
     * The collateral currently is 10000 DFI with factor of 1 and 1 BTC with factor of 0.5
     * As such the total value is 10000 * 1 + 10000 * 0.5
     * Default colRatio would be the default loan minColRatio
     * (totalValue * tokenPercentageSplit / valueRatioAccordingToOracle) * (100/minColRatio)
     * ((15000 * 1) / 2) * 100 / 150 = 5000 TSLA
     */
    expect(estimation.length).toStrictEqual(1)
    expect(estimation).toContain('5000.00000000@TSLA')
  })

  it('should estimateLoan with 0.5 split for loan tokens', async () => {
    const estimation = await tGroup.get(1).rpc.vault.estimateLoan(vaultId, { TSLA: 0.5, MSFT: 0.5 })
    /**
     * The collateral currently is 10000 DFI with factor of 1 and 1 BTC with factor of 0.5
     * As such the total value is 10000 * 1 + 10000 * 0.5
     * Default colRatio would be the default loan minColRatio
     * (totalValue * tokenPercentageSplit / valueRatioAccordingToOracle) * (100/minColRatio)
     * ((15000 * 0.5) / 2) * 100 / 150 = 2500 TSLA
     * ((15000 * 0.5) / 5) * 100 / 150 = 1000 MSFT
     */

    expect(estimation.length).toStrictEqual(2)
    expect(estimation).toContain('2500.00000000@TSLA')
    expect(estimation).toContain('1000.00000000@MSFT')
  })

  it('should estimateLoan with 0.3/0.7 split for loan tokens', async () => {
    const estimation = await tGroup.get(1).rpc.vault.estimateLoan(vaultId, { TSLA: 0.3, MSFT: 0.7 })
    /**
     * The collateral currently is 10000 DFI with factor of 1 and 1 BTC with factor of 0.5
     * As such the total value is 10000 * 1 + 10000 * 0.5
     * Default colRatio would be the default loan minColRatio
     * (totalValue * tokenPercentageSplit / valueRatioAccordingToOracle) * (100/minColRatio)
     * ((15000 * 0.3) / 2) * 100 / 150 = 1500 TSLA
     * ((15000 * 0.7) / 5) * 100 / 150 = 1400 MSFT
     */

    expect(estimation.length).toStrictEqual(2)
    expect(estimation).toContain('1500.00000000@TSLA')
    expect(estimation).toContain('1400.00000000@MSFT')
  })

  // Alternative col ratio of 200
  it('should estimateLoan for single loan token with targetRatio of 200', async () => {
    const estimation = await tGroup.get(1).rpc.vault.estimateLoan(vaultId, { TSLA: 1 }, 200)
    /**
     * The collateral currently is 10000 DFI with factor of 1 and 1 BTC with factor of 0.5
     * As such the total value is 10000 * 1 + 10000 * 0.5
     * With targetRatio of 200
     * (totalValue * tokenPercentageSplit / valueRatioAccordingToOracle) * (100/200)
     * ((15000 * 1) / 2) * 100 / 200 = 3750 TSLA
     */
    expect(estimation.length).toStrictEqual(1)
    expect(estimation).toContain('3750.00000000@TSLA')
  })

  it('should estimateLoan with 0.5 split for loan tokens with targetRatio of 200', async () => {
    const estimation = await tGroup.get(1).rpc.vault.estimateLoan(vaultId, { TSLA: 0.5, MSFT: 0.5 }, 200)
    /**
     * The collateral currently is 10000 DFI with factor of 1 and 1 BTC with factor of 0.5
     * As such the total value is 10000 * 1 + 10000 * 0.5
     * With targetRatio of 200
     * (totalValue * tokenPercentageSplit / valueRatioAccordingToOracle) * (100/200)
     * ((15000 * 0.5) / 2) * 100 / 200 = 1875 TSLA
     * ((15000 * 0.5) / 5) * 100 / 200 = 750 MSFT
     */

    expect(estimation.length).toStrictEqual(2)
    expect(estimation).toContain('1875.00000000@TSLA')
    expect(estimation).toContain('750.00000000@MSFT')
  })

  it('should estimateLoan with 0.3/0.7 split for loan tokens with targetRatio of 200', async () => {
    const estimation = await tGroup.get(1).rpc.vault.estimateLoan(vaultId, { TSLA: 0.3, MSFT: 0.7 }, 200)
    /**
     * The collateral currently is 10000 DFI with factor of 1 and 1 BTC with factor of 0.5
     * As such the total value is 10000 * 1 + 10000 * 0.5
     * With targetRatio of 200
     * (totalValue * tokenPercentageSplit / valueRatioAccordingToOracle) * (100/200)
     * ((15000 * 0.3) / 2) * 100 / 200 = 1125 TSLA
     * ((15000 * 0.7) / 5) * 100 / 200 = 1050 MSFT
     */

    expect(estimation.length).toStrictEqual(2)
    expect(estimation).toContain('1125.00000000@TSLA')
    expect(estimation).toContain('1050.00000000@MSFT')
  })
})

// Failure cases
describe('Vault estimateLoan', () => {
  const tGroup = TestingGroup.create(2, i => new MasterNodeRegTestContainer())
  let vaultId: string // dual collateral, with loan taken, test: loan:collateral ratio
  let liqVaultId: string // dual collateral, with loan taken, test: liquidated vault, DFI/total collateral ratio
  let collateralAddress!: string
  let oracleId!: string

  beforeAll(async () => {
    await tGroup.start()
    await tGroup.get(0).container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  async function setup (): Promise<void> {
    // token setup
    ({ vaultId, collateralAddress, oracleId } = await setupVault(tGroup))

    // 2 types of collateral token, loan taken, to be liquidated
    liqVaultId = await tGroup.get(0).rpc.vault.createVault({
      ownerAddress: await tGroup.get(0).generateAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.vault.depositToVault({
      vaultId: liqVaultId, from: collateralAddress, amount: '10000@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.vault.depositToVault({
      vaultId: liqVaultId, from: collateralAddress, amount: '1@BTC'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
      prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }, { tokenAmount: '5@MSFT', currency: 'USD' }]
    })
    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: liqVaultId,
      amounts: '2000@TSLA'
    })
    await tGroup.get(0).generate(1)

    await tGroup.waitForSync()
  }

  it('should fail if vault does not exists', async () => {
    const promise = tGroup.get(1).rpc.vault.estimateLoan('0'.repeat(64), { TSLA: 1 })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
  })

  it('should fail if loan token does not exists', async () => {
    const promise = tGroup.get(1).rpc.vault.estimateLoan(vaultId, { CAT: 1 })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Token CAT does not exist!')
  })

  it('should fail if given token is not loan token', async () => {
    const promise = tGroup.get(1).rpc.vault.estimateLoan(vaultId, { BTC: 1 })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('(BTC) is not a loan token!')
  })

  it('should fail when try to estimateLoan for liquidated vault', async () => {
    // trigger liquidation
    // current loan value = 4000usd
    // max loan available to borrow  = (10,000 + 10,000 *0.5 (col factor))/1.5 = 10000
    // tsla price to liquidate = 10000/2000  = 5
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '5.5@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(13)
    const liqVault = await tGroup.get(1).container.call('getvault', [liqVaultId])
    expect(liqVault.state).toStrictEqual('inLiquidation')

    const promise = tGroup.get(1).rpc.vault.estimateLoan(liqVaultId, { TSLA: 1 })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Vault <${liqVaultId}> is in liquidation.`)
  })

  it('should fail if sum of loan token ratio does not add up to 1', async () => {
    const promise = tGroup.get(1).rpc.vault.estimateLoan(vaultId, { TSLA: 0.6, MSFT: 0.5 })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('total split between loan tokens = 1.10000000 vs expected 1.00000000')
  })
})
