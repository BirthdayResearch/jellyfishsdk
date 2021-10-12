import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'

async function expectEmptyLoanInfo (testing: Testing): Promise<void> {
  const data = await testing.rpc.loan.getLoanInfo()
  expect(data).toStrictEqual({
    'Collateral tokens': {},
    'Loan tokens': {},
    'Loan schemes': [],
    collateralValueUSD: new BigNumber(0),
    loanValueUSD: new BigNumber(0)
  })
}

function now (): number {
  return Math.floor(new Date().getTime() / 1000)
}

describe('Loan', () => {
  let container: LoanMasterNodeRegTestContainer
  let testing: Testing
  let collateralOraclId!: string

  beforeEach(async () => {
    container = new LoanMasterNodeRegTestContainer()
    testing = Testing.create(container)
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.token.create({ symbol: 'BTC' })
    await testing.generate(1)

    // prep as collateral
    collateralOraclId = await testing.rpc.oracle.appointOracle(
      await testing.generateAddress(),
      [
        { token: 'BTC', currency: 'USD' },
        { token: 'DFI', currency: 'USD' }
      ],
      { weightage: 1 }
    )
    await testing.generate(1)
    await testing.rpc.oracle.setOracleData(collateralOraclId, now(), { prices: [{ tokenAmount: '1@BTC', currency: 'USD' }] })
    await testing.generate(1)
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should getLoanInfo - include collateral tokens', async () => {
    // Before setCollateralToken
    await expectEmptyLoanInfo(testing)

    // set collateral
    const collateralTokenId = await testing.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await testing.generate(1)

    // After setCollateralToken
    {
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        'Collateral tokens': {
          [collateralTokenId]: {
            activateAfterBlock: new BigNumber(105),
            factor: new BigNumber(0.5),
            fixedIntervalPriceId: 'BTC/USD',
            token: 'BTC'
          }
        },
        'Loan tokens': {},
        'Loan schemes': [],
        collateralValueUSD: new BigNumber(0),
        loanValueUSD: new BigNumber(0)
      })
    }
  })

  it('should getLoanInfo - include loan schemes', async () => {
    // Before createLoanScheme
    await expectEmptyLoanInfo(testing)

    await testing.container.call('createloanscheme', [
      100,
      new BigNumber(1.5),
      'default'
    ])
    await testing.container.generate(1)

    await testing.container.call('createloanscheme', [
      200,
      new BigNumber(2.5),
      'scheme'
    ])
    await testing.container.generate(1)

    // After createLoanScheme
    {
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        'Collateral tokens': {},
        'Loan tokens': {},
        'Loan schemes': [
          {
            id: 'default',
            mincolratio: new BigNumber(100),
            interestrate: new BigNumber(1.5),
            default: true
          },
          {
            id: 'scheme',
            mincolratio: new BigNumber(200),
            interestrate: new BigNumber(2.5),
            default: false
          }
        ],
        collateralValueUSD: new BigNumber(0),
        loanValueUSD: new BigNumber(0)
      })
    }
  })

  it('should getLoanInfo - include loan tokens', async () => {
    // Before setLoanToken
    await expectEmptyLoanInfo(testing)

    // setLoanToken with new token
    const tslaOracleId = await testing.rpc.oracle.appointOracle(
      await testing.generateAddress(),
      [{
        token: 'TSLA',
        currency: 'USD'
      }],
      { weightage: 1 }
    )
    await testing.generate(1)
    await testing.rpc.oracle.setOracleData(tslaOracleId, now(), { prices: [{ tokenAmount: '1@TSLA', currency: 'USD' }] })
    await testing.generate(1)
    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      name: 'TESLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)
    const height = new BigNumber(await testing.container.getBlockCount())

    // After setLoanToken
    {
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        'Collateral tokens': {},
        'Loan tokens': {
          [loanTokenId]: {
            token: {
              2: {
                collateralAddress: GenesisKeys[0].owner.address,
                creationHeight: height,
                creationTx: expect.any(String),
                decimal: new BigNumber(8),
                destructionHeight: new BigNumber(-1),
                destructionTx:
                  '0000000000000000000000000000000000000000000000000000000000000000',
                finalized: false,
                isDAT: true,
                isLPS: false,
                isLoanToken: true,
                limit: new BigNumber(0),
                mintable: true,
                minted: new BigNumber(0),
                name: 'TESLA',
                symbol: 'TSLA',
                symbolKey: 'TSLA',
                tradeable: true
              }
            },
            fixedIntervalPriceId: 'TSLA/USD',
            interest: new BigNumber(0)
          }
        },
        'Loan schemes': [],
        collateralValueUSD: new BigNumber(0),
        loanValueUSD: new BigNumber(0)
      })
    }
  })

  it('should getLoanInfo - include collateral value and loan value', async () => {
    { // extra setup: setCollateral, setLoan, createVault, deposit, takeLoan
      await testing.rpc.loan.setCollateralToken({
        token: 'BTC',
        factor: new BigNumber(1),
        fixedIntervalPriceId: 'BTC/USD'
      })
      await testing.rpc.oracle.setOracleData(collateralOraclId, now(), { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
      await testing.generate(1)
      await testing.rpc.loan.setCollateralToken({
        token: 'DFI',
        factor: new BigNumber(1),
        fixedIntervalPriceId: 'DFI/USD'
      })
      await testing.generate(1)

      const tslaOracleId = await testing.rpc.oracle.appointOracle(
        await testing.generateAddress(),
        [{
          token: 'TSLA',
          currency: 'USD'
        }],
        { weightage: 1 }
      )
      await testing.generate(1)
      await testing.rpc.oracle.setOracleData(tslaOracleId, now(), { prices: [{ tokenAmount: '1@TSLA', currency: 'USD' }] })
      await testing.generate(1)
      await testing.rpc.loan.setLoanToken({
        symbol: 'TSLA',
        name: 'TESLA',
        fixedIntervalPriceId: 'TSLA/USD'
      })
      await testing.generate(1)

      // loan scheme set up
      await testing.rpc.loan.createLoanScheme({
        minColRatio: 1000,
        interestRate: new BigNumber(3),
        id: 'scheme'
      })
      await testing.generate(1)

      const vaultAddress = await testing.generateAddress()
      const vaultId = await testing.rpc.loan.createVault({
        ownerAddress: vaultAddress,
        loanSchemeId: 'scheme'
      })
      await testing.generate(1)

      // fund vault for balance just enough for loan amount
      const collateralAddress = await container.getNewAddress()
      await testing.token.mint({ amount: 50, symbol: 'BTC' })
      await testing.token.dfi({ amount: 50, address: collateralAddress })
      await testing.generate(1)
      await testing.token.send({ address: collateralAddress, amount: 50, symbol: 'BTC' })
      await testing.generate(1)
      await testing.rpc.loan.depositToVault({ vaultId: vaultId, from: collateralAddress, amount: '50@DFI' })
      await testing.generate(1)
      await testing.rpc.loan.depositToVault({ vaultId: vaultId, from: collateralAddress, amount: '50@BTC' })
      await testing.generate(1)

      await testing.rpc.loan.takeLoan({
        vaultId: vaultId,
        amounts: '9.9@TSLA'
      })
      await testing.generate(1)
    }

    // After setLoanToken
    {
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data.collateralValueUSD).toStrictEqual(new BigNumber(100)) // total collateral usd value
      expect((data.loanValueUSD as any as BigNumber).gt(9.9))
      expect((data.loanValueUSD as any as BigNumber).lt(9.9001))
    }
  })
})
