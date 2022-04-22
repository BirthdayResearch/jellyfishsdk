import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'

describe('Vault estimateVault', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  async function setup (): Promise<void> {
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

    await testing.container.waitForPriceValid('TSLA/USD')
    await testing.container.waitForPriceValid('MSFT/USD')
  }

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should fail if collateralAmounts array contains non collateral token', async () => {
    const tokenInfo: Record<string, TokenInfo> = await testing.container.call('gettoken', ['DOGE'])
    const promise = testing.rpc.vault.estimateVault(['5000@DOGE'], ['100@TSLA'])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Token with id (${Object.keys(tokenInfo)[0]}) is not a valid collateral!`)
  })

  it('should fail if collateralAmounts array contains non collateral token (loan token)', async () => {
    const tokenInfo: Record<string, TokenInfo> = await testing.container.call('gettoken', ['MSFT'])
    const promise = testing.rpc.vault.estimateVault(['500@MSFT'], ['100@TSLA'])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Token with id (${Object.keys(tokenInfo)[0]}) is not a valid collateral!`)
  })

  it('should fail if loanAmounts array contains non loan token', async () => {
    const tokenInfo: Record<string, TokenInfo> = await testing.container.call('gettoken', ['BTC'])
    const promise = testing.rpc.vault.estimateVault(['10000@DFI'], ['1@BTC'])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Token with id (${Object.keys(tokenInfo)[0]}) is not a loan token!`)
  })

  it('should estimateVault for empty values', async () => {
    const estimation = await testing.rpc.vault.estimateVault([], [])
    expect(estimation.collateralValue).toStrictEqual(new BigNumber('0'))
    expect(estimation.loanValue).toStrictEqual(new BigNumber('0'))
    expect(estimation.informativeRatio).toStrictEqual(new BigNumber('-1'))
    expect(estimation.collateralRatio).toStrictEqual(-1)
  })

  it('should estimateVault (overcollateralized)', async () => {
    const estimation = await testing.rpc.vault.estimateVault(['10000@DFI', '1@BTC'], ['1000@MSFT'])
    expect(estimation.collateralValue).toStrictEqual(new BigNumber('15000')) // DFI is 1 to 1 USD, BTC is 10k USD with 0.5 factor making it 5000
    expect(estimation.loanValue).toStrictEqual(new BigNumber('5000')) // TSLA price/USD + MSFT price/USD = 1000 * 5
    expect(estimation.informativeRatio).toStrictEqual(new BigNumber('300')) // informativeRatio = collateralValue / loanValue = 15000 / 5000 * 100
    expect(estimation.collateralRatio).toStrictEqual(300) // collateralRatio = informativeRatio rounded
  })

  it('should estimateVault (undercollateralized)', async () => {
    const estimation = await testing.rpc.vault.estimateVault(['5000@DFI', '1@BTC'], ['5000@TSLA', '1000@MSFT'])
    expect(estimation.collateralValue).toStrictEqual(new BigNumber('10000')) // DFI is 1 to 1 USD, BTC is 10k USD with 0.5 factor making it 5000
    expect(estimation.loanValue).toStrictEqual(new BigNumber('15000')) // TSLA price/USD + MSFT price/USD = 5000 * 2 + 1000 * 5
    expect(estimation.informativeRatio).toStrictEqual(new BigNumber('66.66666666')) // informativeRatio = collateralValue / loanValue = 10000 / 15000 * 100
    expect(estimation.collateralRatio).toStrictEqual(67) // collateralRatio = informativeRatio rounded
  })

  it('should estimateVault with collateral only', async () => {
    const estimation = await testing.rpc.vault.estimateVault(['5000@DFI', '1@BTC'], [])
    expect(estimation.collateralValue).toStrictEqual(new BigNumber('10000')) // DFI is 1 to 1 USD, BTC is 10k USD with 0.5 factor making it 5000
    expect(estimation.loanValue).toStrictEqual(new BigNumber('0'))
    expect(estimation.informativeRatio).toStrictEqual(new BigNumber('-1')) // informativeRatio = collateralValue / loanValue = 10000 / 0 * 100
    expect(estimation.collateralRatio).toStrictEqual(-1) // collateralRatio = informativeRatio rounded
  })

  it('should estimateVault with loan only', async () => {
    const estimation = await testing.rpc.vault.estimateVault([], ['5000@TSLA', '1000@MSFT'])
    expect(estimation.collateralValue).toStrictEqual(new BigNumber('0'))
    expect(estimation.loanValue).toStrictEqual(new BigNumber('15000')) // TSLA price/USD + MSFT price/USD = 5000 * 2 + 1000 * 5
    expect(estimation.informativeRatio).toStrictEqual(new BigNumber('0')) // informativeRatio = collateralValue / loanValue = 0 / 15000 * 100
    expect(estimation.collateralRatio).toStrictEqual(0) // collateralRatio = informativeRatio rounded
  })
})
