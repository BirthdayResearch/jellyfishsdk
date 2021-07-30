import { ContainerAdapterClient } from '../../container_adapter_client'
import { LoanMasterNodeRegTestContainer } from './loan_container'

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
    await container.call('createloanscheme', [100, 1, 'default'])
    await container.generate(1)

    await container.call('createloanscheme', [150, 1.5, 'scheme'])
    await container.generate(1)

    const result = await client.loan.listLoanSchemes()

    expect(result).toStrictEqual(
      [
        { id: 'default', mincolratio: 100, interestrate: 1, default: true },
        { id: 'scheme', mincolratio: 150, interestrate: 1.5, default: false }
      ]
    )
  })
})
