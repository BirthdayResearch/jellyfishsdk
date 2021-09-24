import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'

describe('Loan listVault', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)
  let collateralAddress: string
  let oracleId: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    collateralAddress = await testing.generateAddress()
    await testing.token.dfi({ address: collateralAddress, amount: 40000 })

    // loan scheme
    await testing.container.call('createloanscheme', [100, 1, 'default'])
    await testing.generate(1)

    // price oracle
    const addr = await testing.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'AAPL', currency: 'USD' }
    ]
    oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await testing.generate(1)
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '2@AAPL', currency: 'USD' }] })

    // collateral tokens
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      priceFeedId: 'DFI/USD'
    })

    // loan tokens
    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      priceFeedId: 'TSLA/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'AAPL',
      priceFeedId: 'AAPL/USD'
    })
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should listVaults', async () => {
    // Before createVault
    {
      const vaults = await testing.rpc.loan.listVaults()
      expect(vaults).toStrictEqual({})
    }

    // create an empty vault
    const ownerAddress1 = await testing.generateAddress()
    const vaultId1 = await testing.rpc.loan.createVault({ ownerAddress: ownerAddress1 })
    await testing.generate(1)

    // create a vault and deposit collateral
    const ownerAddress2 = await testing.generateAddress()
    const vaultId2 = await testing.rpc.loan.createVault({ ownerAddress: ownerAddress2 })
    await testing.generate(1)
    await testing.rpc.loan.depositToVault({ vaultId: vaultId2, from: collateralAddress, amount: '10000@DFI' })
    await testing.generate(1)

    // create a vault and deposit collateral and take a loan
    const ownerAddress3 = await testing.generateAddress()
    // another loan scheme
    await testing.container.call('createloanscheme', [110, 1, 'scheme'])
    await testing.generate(1)
    const vaultId3 = await testing.rpc.loan.createVault({ ownerAddress: ownerAddress3, loanSchemeId: 'scheme' })
    await testing.generate(1)
    await testing.rpc.loan.depositToVault({ vaultId: vaultId3, from: collateralAddress, amount: '10000@DFI' })
    await testing.generate(1)
    await testing.rpc.loan.takeLoan({ vaultId: vaultId3, amounts: '30@TSLA' })
    await testing.generate(1)

    // create a vault and make it liqudated.
    const ownerAddress4 = await testing.generateAddress()
    const vaultId4 = await testing.rpc.loan.createVault({ ownerAddress: ownerAddress4 })
    await testing.generate(1)
    await testing.rpc.loan.depositToVault({ vaultId: vaultId4, from: collateralAddress, amount: '10000@DFI' })
    await testing.generate(1)
    await testing.rpc.loan.takeLoan({ vaultId: vaultId4, amounts: '30@AAPL' })
    await testing.generate(1)
    // make vault enter under liquidation state by a price hike of the loan token
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1000@AAPL', currency: 'USD' }] })
    await testing.generate(1)

    // List vaults
    const vaults = await testing.rpc.loan.listVaults()
    expect(vaults).toStrictEqual({
      [vaultId1]: {
        ownerAddress: ownerAddress1,
        loanSchemeId: 'default',
        isUnderLiquidation: false
      },
      [vaultId2]: {
        ownerAddress: ownerAddress2,
        loanSchemeId: 'default',
        isUnderLiquidation: false
      },
      [vaultId3]: {
        ownerAddress: ownerAddress3,
        loanSchemeId: 'scheme',
        isUnderLiquidation: false
      },
      [vaultId4]: {
        ownerAddress: ownerAddress4,
        loanSchemeId: 'default',
        isUnderLiquidation: true
      }
    })
  })
})
