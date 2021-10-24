import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan listLoanSchemes', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should listLoanSchemes', async () => {
    // Before createLoanScheme
    {
      const data = await testing.rpc.loan.listLoanSchemes()
      expect(data.length).toStrictEqual(0)
    }

    await testing.container.call('createloanscheme', [100, new BigNumber(1.5), 'default'])
    await testing.container.generate(1)

    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await testing.container.generate(1)

    // After createLoanScheme
    {
      const data = await testing.rpc.loan.listLoanSchemes()
      expect(data).toStrictEqual(
        [
          { id: 'default', mincolratio: new BigNumber(100), interestrate: new BigNumber(1.5), default: true },
          { id: 'scheme', mincolratio: new BigNumber(200), interestrate: new BigNumber(2.5), default: false }
        ]
      )
    }
  })
})
