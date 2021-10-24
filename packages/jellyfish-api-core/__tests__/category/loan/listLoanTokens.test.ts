import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should listLoanTokens', async () => {
    {
      const data = await testing.rpc.loan.listLoanTokens()
      expect(data).toStrictEqual([])
    }

    const oracleId1 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp1 = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId1, timestamp1, { prices: [{ tokenAmount: '0.5@AAPL', currency: 'USD' }] })
    await testing.generate(1)

    const loanTokenId1 = await testing.container.call('setloantoken', [{
      symbol: 'AAPL',
      name: 'APPLE',
      fixedIntervalPriceId: 'AAPL/USD',
      mintable: true,
      interest: new BigNumber(0.01)
    }])
    await testing.generate(1)

    const height1 = new BigNumber(await testing.container.getBlockCount())

    const oracleId2 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TSLA',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp2 = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId2, timestamp2, { prices: [{ tokenAmount: '0.5@TSLA', currency: 'USD' }] })
    await testing.generate(1)

    const loanTokenId2 = await testing.container.call('setloantoken', [{
      symbol: 'TSLA',
      name: 'TESLA',
      fixedIntervalPriceId: 'TSLA/USD',
      mintable: false,
      interest: new BigNumber(0.02)
    }])
    await testing.generate(1)

    const height2 = new BigNumber(await testing.container.getBlockCount())

    const data = await testing.rpc.loan.listLoanTokens()
    expect(data).toStrictEqual([
      {
        token: {
          1: {
            collateralAddress: expect.any(String),
            creationHeight: height1,
            creationTx: loanTokenId1,
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
            symbol: 'AAPL',
            symbolKey: 'AAPL',
            tradeable: true
          }
        },
        fixedIntervalPriceId: 'AAPL/USD',
        interest: new BigNumber(0.01)
      },
      {
        token: {
          2: {
            collateralAddress: expect.any(String),
            creationHeight: height2,
            creationTx: loanTokenId2,
            decimal: new BigNumber(8),
            destructionHeight: new BigNumber(-1),
            destructionTx: '0000000000000000000000000000000000000000000000000000000000000000',
            finalized: false,
            isDAT: true,
            isLPS: false,
            isLoanToken: true,
            limit: new BigNumber(0),
            mintable: false,
            minted: new BigNumber(0),
            name: 'TESLA',
            symbol: 'TSLA',
            symbolKey: 'TSLA',
            tradeable: true
          }
        },
        fixedIntervalPriceId: 'TSLA/USD',
        interest: new BigNumber(0.02)
      }
    ])
  })
})
