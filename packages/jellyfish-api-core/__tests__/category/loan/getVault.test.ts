import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan getVault', () => {
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

    const ownerAddress = await testing.generateAddress()
    const vaultId = await container.call('createvault', [ownerAddress, 'default'])
    await container.generate(1)

    const data = await testing.rpc.loan.getVault(vaultId)
    expect(data).toStrictEqual({
      collateralAmounts: [],
      collateralValue: '',
      isUnderLiquidation: false,
      loanAmount: [],
      loanSchemeId: 'default',
      loanValue: '',
      ownerAddress: 'bcrt1qu87peqaquwl3uspnzh5rmkxffqmtn5wn3axt4u'
    })
  })

  it('should not getVault if vault id is invalid', async () => {
    const promise = testing.rpc.loan.getVault('2cca2e3be0504af2daac12255cb5a691447e0aa3c9ca9120fb634a96010d2b4f')
    await expect(promise).rejects.toThrow('RpcApiError: \'vault <2cca2e3be0504af2daac12255cb5a691447e0aa3c9ca9120fb634a96010d2b4f> not found\', code: -20, method: getvault')
  })
})
