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
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])
    await testing.generate(1)

    {
      const data = await testing.rpc.loan.listLoanTokens()
      expect(data).toStrictEqual({})
    }

    const loanTokenId = await testing.container.call('setloantoken', [{
      symbol: 'AAPL',
      name: 'APPLE',
      priceFeedId,
      interest: new BigNumber(0.01)
    }])
    await container.generate(1)

    const data = await testing.rpc.loan.listLoanTokens()
    expect(data).toStrictEqual(
      {
        [loanTokenId]: {
          token: {
            1: {
              collateralAddress: expect.any(String),
              creationHeight: expect.any(BigNumber),
              creationTx: expect.any(String),
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
              name: 'APPLE',
              symbol: 'AAPL',
              symbolKey: 'AAPL',
              tradeable: true
            }
          },
          priceFeedId,
          interest: new BigNumber(0.01)
        }
      }
    )
  })
})
