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

  it('should getVault', async () => {
    // NOTE(jingyi2811): default scheme
    await container.call('createloanscheme', [100, 1, 'default'])
    await container.generate(1)

    const ownerAddress = await container.getNewAddress()
    const vaultId = await container.call('createvault', [ownerAddress, 'default'])
    await container.generate(1)

    const data = await client.loan.getVault(vaultId)
    expect(data).toStrictEqual({
      loanschemeid: 'default',
      owneraddress: ownerAddress,
      isunderliquidation: false
    })
  })

  it('should not getVault if vault id is invalid', async () => {
    const promise = client.loan.getVault('2cca2e3be0504af2daac12255cb5a691447e0aa3c9ca9120fb634a96010d2b4f')
    await expect(promise).rejects.toThrow('RpcApiError: \'vault <2cca2e3be0504af2daac12255cb5a691447e0aa3c9ca9120fb634a96010d2b4f> not found\', code: -20, method: getvault')
  })
})
