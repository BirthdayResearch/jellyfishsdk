import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan createVault', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getVault', async () => {
    // NOTE(jingyi2811): default scheme
    await testing.container.call('createloanscheme', [100, 1, 'default'])
    await testing.generate(1)

    const ownerAddress = await testing.generateAddre()
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
