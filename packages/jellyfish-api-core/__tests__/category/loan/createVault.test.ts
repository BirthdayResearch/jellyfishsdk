import { ContainerAdapterClient } from '../../container_adapter_client'
import { LoanMasterNodeRegTestContainer } from './loan_container'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    // NOTE(jingyi2811): default scheme
    await container.call('createloanscheme', [100, 1, 'default'])
    await container.generate(1)
  })

  afterEach(async () => {
    const result = await container.call('listloanschemes')
    const data = result.filter((r: { default: boolean }) => !r.default)

    for (let i = 0; i < data.length; i += 1) {
      await container.call('destroyloanscheme', [data[i].id])
      await container.generate(1)
    }
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should not create vault if address is invalid', async () => {
    await container.call('createloanscheme', [200, 2, 'scheme'])
    await container.generate(1)

    const promise = await client.loan.createVault({
      ownerAddress: '1234',
      loanSchemeId: undefined
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'Error: Invalid owneraddress address\', code: -5, method: createvault')
  })
})
