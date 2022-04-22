import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'

describe('Vault estimateCollateral', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  async function setupVault (testing: Testing): Promise<void> {
    // token setup
    const collateralAddress = await testing.container.getNewAddress()
    await testing.token.dfi({ address: collateralAddress, amount: 30000 })
    await testing.generate(1)
    // Setup collateral token
    await testing.token.create({ symbol: 'BTC', collateralAddress })
    await testing.generate(1)
    await testing.token.mint({ symbol: 'BTC', amount: 20000 })
    await testing.generate(1)
    // Setup non collateral token
    await testing.token.create({ symbol: 'DOGE', collateralAddress })
    await testing.generate(1)

    // oracle setup
    const addr = await testing.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'MSFT', currency: 'USD' }
    ]
    const oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await testing.generate(1)
    const oracleTickTimestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, oracleTickTimestamp, {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '10000@BTC', currency: 'USD' },
        { tokenAmount: '2@TSLA', currency: 'USD' },
        { tokenAmount: '5@MSFT', currency: 'USD' }
      ]
    })
    await testing.generate(1)

    // collateral token
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.generate(1)

    // collateral token
    await testing.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await testing.generate(1)

    // loan token
    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)
    await testing.rpc.loan.setLoanToken({
      symbol: 'MSFT',
      fixedIntervalPriceId: 'MSFT/USD'
    })
    await testing.generate(1)

    // loan scheme set up
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await testing.generate(1)

    const vaultOwner = await testing.generateAddress()

    const vaultId = await testing.rpc.vault.createVault({
      ownerAddress: vaultOwner,
      loanSchemeId: 'scheme'
    })
    await testing.generate(1)

    await testing.rpc.vault.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '10000@DFI'
    })
    await testing.generate(1)

    await testing.container.waitForPriceValid('TSLA/USD')
    await testing.container.waitForPriceValid('MSFT/USD')
  }

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setupVault(testing)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should fail if given token is not loan token', async () => {
    const tokenInfo: Record<string, TokenInfo> = await testing.container.call('gettoken', ['BTC'])
    const promise = testing.rpc.vault.estimateCollateral(['100@BTC'], 150)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Token with id (${Object.keys(tokenInfo)[0]}) is not a loan token!`)
  })

  it('should fail if sum of collateral token ratio does not add up to 1 (upper bound)', async () => {
    const promise = testing.rpc.vault.estimateCollateral(['1000@TSLA', '1000@MSFT'], 150, { DFI: 0.5, BTC: 0.6 })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('total split between collateral tokens = 1.10000000 vs expected 1.00000000')
  })

  it('should fail if sum of collateral token ratio does not add up to 1 (lower bound)', async () => {
    const promise = testing.rpc.vault.estimateCollateral(['1000@TSLA', '1000@MSFT'], 150, { DFI: 0.5, BTC: 0.4 })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('total split between collateral tokens = 0.90000000 vs expected 1.00000000')
  })

  it('should fail if sum of collateral token ratio does not add up to 1 (0)', async () => {
    const promise = testing.rpc.vault.estimateCollateral(['1000@TSLA', '1000@MSFT'], 150, { DFI: 0, BTC: 0 })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('total split between collateral tokens = 0.00000000 vs expected 1.00000000')
  })

  it('should fail if non collateral token given', async () => {
    const promise = testing.rpc.vault.estimateCollateral(['1000@TSLA'], 150, { DFI: 0.5, DOGE: 0.5 })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('(DOGE) is not a valid collateral!')
  })

  it('should fail if collateral token does not exists', async () => {
    const promise = testing.rpc.vault.estimateCollateral(['1000@TSLA'], 150, { DFI: 0.5, CAT: 0.5 })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Token CAT does not exist!')
  })

  it('should estimateCollateral for single loan & collateral token', async () => {
    const estimation = await testing.rpc.vault.estimateCollateral(['1000@TSLA'], 150)
    /**
     * Taking loan of 1000 TSLA with DFI as collateral (Default DFI ratio is 1)
     * loanValueInCollateral = 1000 * 1
     * collateralValue = loanValueInCollateral / pricePerUSD(collateralFixedPrice/loanFixedPrice)
     * As such its collateralFixedPrice/loanFixedPrice = 1 / 2 = 0.5
     * = 1000 / 0.5 = 2000
     * actualCollateralValue = collateralValue * colRatio/100 = 2000 * 1.5 = 3000
     * As collateral DFI has factor of 1
     * amount = actualCollateralValue / 1 = 3000
     */
    expect(estimation.length).toStrictEqual(1)
    expect(estimation).toContain('3000.00000000@DFI')
  })

  it('should estimateCollateral with single loan token & 0.5 split for collateral tokens', async () => {
    const estimation = await testing.rpc.vault.estimateCollateral(['1000@TSLA'], 150, { DFI: 0.5, BTC: 0.5 })
    /**
     * Taking loan of 1000 TSLA with DFI and BTC s collateral
     * loanValueInCollateral = 1000 * 0.5 = 500 for both DFI and BTC
     * collateralValue = loanValueInCollateral / valueRatioAccordingToOracle(collateralFixedPrice/loanFixedPrice)
     * As such its collateralFixedPrice/loanFixedPrice
     * DFI => 500 / 1/2 = 500 / 0.5 = 1000
     * BTC => 500 / 10000/2 = 500 / 5000 = 0.1
     * actualCollateralValue = collateralValue * colRatio/100
     * DFI => 1000 * 1.5 = 1500
     * BTC => 0.1 * 1.5 = 0.15
     * As collateral DFI has factor of 1 and BTC has a factor of 0.5
     * DFI => 1500 / 1 = 1500
     * BTC => 0.15 / 0.5 = 0.3
     */
    expect(estimation.length).toStrictEqual(2)
    expect(estimation).toContain('1500.00000000@DFI')
    expect(estimation).toContain('0.30000000@BTC')
  })

  it('should estimateCollateral with single loan token & 0.3/0.7 split for collateral tokens', async () => {
    const estimation = await testing.rpc.vault.estimateCollateral(['1000@TSLA'], 150, { DFI: 0.3, BTC: 0.7 })
    /**
     * Taking loan of 1000 TSLA with DFI and BTC s collateral
     * loanValueInCollateral
     * DFI => 1000 * 0.3 = 300
     * BTC => 1000 * 0.7 = 700
     * collateralValue = loanValueInCollateral / valueRatioAccordingToOracle(collateralFixedPrice/loanFixedPrice)
     * DFI => 300 / 1/2 = 300 / 0.5 = 600
     * BTC => 700 / 10000/2 = 700 / 5000 = 0.14
     * actualCollateralValue = collateralValue * colRatio/100
     * DFI => 600 * 1.5 = 900
     * BTC => 0.14 * 1.5 = 0.21
     * As collateral DFI has factor of 1 and BTC has a factor of 0.5
     * DFI => 900 / 1 = 900
     * BTC => 0.21 / 0.5 = 0.42
     */
    expect(estimation.length).toStrictEqual(2)
    expect(estimation).toContain('900.00000000@DFI')
    expect(estimation).toContain('0.42000000@BTC')
  })

  // Alternative col ratio of 200
  it('should estimateCollateral for single loan & collateral token with targetRatio of 200', async () => {
    const estimation = await testing.rpc.vault.estimateCollateral(['1000@TSLA'], 200)
    /**
     * Taking loan of 1000 TSLA with DFI as collateral (Default DFI ratio is 1)
     * loanValueInCollateral = 1000 * 1
     * collateralValue = loanValueInCollateral / pricePerUSD(collateralFixedPrice/loanFixedPrice)
     * As such its collateralFixedPrice/loanFixedPrice = 1 / 2 = 0.5
     * = 1000 / 0.5 = 2000
     * actualCollateralValue = collateralValue * colRatio/100 = 2000 * 2 = 4000
     * As collateral DFI has factor of 1
     * amount = actualCollateralValue / 1 = 4000
     */
    expect(estimation.length).toStrictEqual(1)
    expect(estimation).toContain('4000.00000000@DFI')
  })

  // More than one loan tokens
  it('should estimateCollateral for 2 loan tokens & single collateral token', async () => {
    const estimation = await testing.rpc.vault.estimateCollateral(['500@TSLA', '1000@MSFT'], 150)
    /**
     * Taking loan of 500 TSLA & 1000 MSFT with DFI as collateral (Default DFI ratio is 1)
     * loanValueInCollateral
     * TSLA / DFI => 500 * 1
     * MSFT / DFI => 1000 * 1
     * collateralValue = loanValueInCollateral / pricePerUSD(collateralFixedPrice/loanFixedPrice)
     * As such its collateralFixedPrice/loanFixedPrice, with TSLA being 1/2 and MSFT being 1/5
     * TSLA / DFI => 500 / 0.5 = 1000
     * MSFT / DFI => 1000 / 0.2 = 5000
     * actualCollateralValue = collateralValue * colRatio/100
     * TSLA / DFI => 1000 * 1.5 = 1500
     * MSFT / DFI => 5000 * 1.5 = 7500
     * As collateral DFI has factor of 1
     * amount = actualCollateralValue / 1
     * TSLA / DFI => 1500 / 1 = 1500
     * MSFT / DFI => 7500 / 1 = 7500
     * total = 1500 + 7500 = 9000
     */
    expect(estimation.length).toStrictEqual(1)
    expect(estimation).toContain('9000.00000000@DFI')
  })

  it('should estimateCollateral with 2 loan tokens & 0.3/0.7 split for collateral tokens', async () => {
    const estimation = await testing.rpc.vault.estimateCollateral(['500@TSLA', '1000@MSFT'], 150, { DFI: 0.3, BTC: 0.7 })
    /**
     * Taking loan of 500 TSLA & 1000 MSFT with DFI as collateral
     * loanValueInCollateral
     * TSLA / DFI => 500 * 0.3 = 150
     * MSFT / DFI => 1000 * 0.3 = 300
     * TSLA / BTC => 500 * 0.7 = 350
     * MSFT / BTC => 1000 * 0.7 = 700
     * collateralValue = loanValueInCollateral / pricePerUSD(collateralFixedPrice/loanFixedPrice)
     * As such its collateralFixedPrice/loanFixedPrice:
     * DFI, with TSLA being 1/2 and MSFT being 1/5
     * BTC, with TSLA being 10000/2 = 5000 and MSFT being 10000/5 = 2000
     * TSLA / DFI => 150 / 0.5 = 300
     * MSFT / DFI => 300 / 0.2 = 1500
     * TSLA / BTC => 350 / 5000 = 0.07
     * MSFT / BTC => 700 / 2000 = 0.35
     * actualCollateralValue = collateralValue * colRatio/100
     * TSLA / DFI => 300 * 1.5 = 450
     * MSFT / DFI => 1500 * 1.5 = 2250
     * TSLA / BTC => 0.07 * 1.5 = 0.105
     * MSFT / BTC => 0.35 * 1.5 = 0.525
     * As collateral DFI has factor of 1, and BTC has factor of 0.5
     * amount = actualCollateralValue / 1
     * TSLA / DFI => 450 / 1 = 450
     * MSFT / DFI => 2250 / 1 = 2250
     * TSLA / BTC => 0.105 / 0.5 = 0.21
     * MSFT / BTC => 0.525 / 0.5 = 1.05
     * total DFI = 450 + 2250 = 2700
     * total BTC = 0.21 + 1.05 = 1.26
     */
    expect(estimation.length).toStrictEqual(2)
    expect(estimation).toContain('2700.00000000@DFI')
    expect(estimation).toContain('1.26000000@BTC')
  })
})
