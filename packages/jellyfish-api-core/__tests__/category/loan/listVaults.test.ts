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

  it('should listVaults with empty array if there is no vault available', async () => {
    const data = await client.loan.listVaults()
    expect(Object.keys(data).length).toStrictEqual(0)
  })

  it('should listVaults', async () => {
    // NOTE(jingyi2811): default scheme
    await container.call('createloanscheme', [100, 1, 'default'])
    await container.generate(1)

    const loanschemeid = 'scheme'

    await container.call('createloanscheme', [200, 2, loanschemeid])
    await container.generate(1)

    const owneraddress = await container.getNewAddress()

    const vaultId = await container.call('createvault', [owneraddress, loanschemeid])
    await container.generate(1)

    const result = await client.loan.listVaults()
    expect(result).toStrictEqual({
      [vaultId]: {
        owneraddress,
        loanschemeid,
        isliquidated: false
      }
    })
  })
})
