import { ContainerAdapterClient } from '../../container_adapter_client'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should listLoanSchemes with empty array if there is no scheme available', async () => {
    const data = await client.loan.listLoanSchemes()
    expect(data.length).toStrictEqual(0)
  })

  it('should listLoanSchemes', async () => {
    await container.call('createloanscheme', [100, 1.5, 'default'])
    await container.generate(1)

    await container.call('createloanscheme', [200, 2.5, 'scheme'])
    await container.generate(1)

    const result = await client.loan.listLoanSchemes()
    expect(result).toStrictEqual(
      [
        { id: 'default', mincolratio: new BigNumber(100), interestrate: new BigNumber(1.5), default: true },
        { id: 'scheme', mincolratio: new BigNumber(200), interestrate: new BigNumber(2.5), default: false }
      ]
    )
  })
})
