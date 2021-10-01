import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'

describe('Loan', () => {
  let container: LoanMasterNodeRegTestContainer
  let testing: Testing
  let oracleId: string

  beforeEach(async () => {
    container = new LoanMasterNodeRegTestContainer()
    testing = Testing.create(container)
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    await testing.token.create({ symbol: 'TSLA' })
    await testing.generate(1)

    oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TSLA',
      currency: 'USD'
    }], 1])
    await testing.generate(1)
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should getLoanInfo - include collateral tokens', async () => {
    // Before setCollateralToken
    {
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(
        {
          'Collateral tokens': {},
          'Loan tokens': {},
          'Loan schemes': [],
          collateralValueUSD: new BigNumber(0),
          loanValueUSD: new BigNumber(0)
        }
      )
    }

    const collateralTokenId = await testing.container.call('setcollateraltoken', [{
      token: 'TSLA',
      factor: new BigNumber(0.5),
      priceFeedId: oracleId
    }])
    await testing.generate(1)

    // After setCollateralToken
    {
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(
        {
          'Collateral tokens': {
            [collateralTokenId]: {
              activateAfterBlock: new BigNumber(104),
              factor: new BigNumber(0.5),
              priceFeedId: oracleId,
              token: 'TSLA'
            }
          },
          'Loan tokens': {},
          'Loan schemes': [],
          collateralValueUSD: new BigNumber(0),
          loanValueUSD: new BigNumber(0)
        }
      )
    }
  })

  it('should getLoanInfo - include loan schemes', async () => {
    // Before createLoanScheme
    {
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(
        {
          'Collateral tokens': {},
          'Loan tokens': {},
          'Loan schemes': [],
          collateralValueUSD: new BigNumber(0),
          loanValueUSD: new BigNumber(0)
        }
      )
    }

    await testing.container.call('createloanscheme', [100, new BigNumber(1.5), 'default'])
    await testing.container.generate(1)

    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await testing.container.generate(1)

    // After createLoanScheme
    {
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(
        {
          'Collateral tokens': {},
          'Loan tokens': {},
          'Loan schemes': [{
            id: 'default',
            mincolratio: new BigNumber(100),
            interestrate: new BigNumber(1.5),
            default: true
          }, {
            id: 'scheme',
            mincolratio: new BigNumber(200),
            interestrate: new BigNumber(2.5),
            default: false
          }],
          collateralValueUSD: new BigNumber(0),
          loanValueUSD: new BigNumber(0)
        }
      )
    }
  })

  it('should getLoanInfo - include loan tokens', async () => {
    // Before setLoanToken
    {
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(
        {
          'Collateral tokens': {},
          'Loan tokens': {},
          'Loan schemes': [],
          collateralValueUSD: new BigNumber(0),
          loanValueUSD: new BigNumber(0)
        }
      )
    }

    // setLoanToken with new token
    const anotherTokenOracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'APPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)
    const loanTokenId = await testing.container.call('setloantoken', [{
      symbol: 'APPL',
      name: 'APPLE',
      priceFeedId: anotherTokenOracleId,
      interest: new BigNumber(0.01)
    }])
    await testing.generate(1)
    const height = new BigNumber(await testing.container.getBlockCount())

    // After setLoanToken
    {
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(
        {
          'Collateral tokens': {},
          'Loan tokens': {
            [loanTokenId]: {
              token: {
                2: {
                  collateralAddress: GenesisKeys[0].owner.address,
                  creationHeight: height,
                  creationTx: loanTokenId,
                  decimal: new BigNumber(8),
                  destructionHeight: new BigNumber(-1),
                  destructionTx: '0000000000000000000000000000000000000000000000000000000000000000',
                  finalized: false,
                  isDAT: true,
                  isLPS: false,
                  isLoanToken: true,
                  limit: new BigNumber(0),
                  mintable: true,
                  minted: new BigNumber(0),
                  name: 'APPLE',
                  symbol: 'APPL',
                  symbolKey: 'APPL',
                  tradeable: true
                }
              },
              priceFeedId: anotherTokenOracleId,
              interest: new BigNumber(0.01)
            }
          },
          'Loan schemes': [],
          collateralValueUSD: new BigNumber(0),
          loanValueUSD: new BigNumber(0)
        }
      )
    }
  })
})
