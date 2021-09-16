import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'

describe('Loan getVault', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    await testing.container.call('createloanscheme', [100, 1, 'default'])
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getVault', async () => {
    const ownerAddress = await testing.generateAddress()
    const vaultId = await testing.rpc.container.call('createvault', [ownerAddress, 'default'])
    await container.generate(1)

    const data = await testing.rpc.loan.getVault(vaultId)
    expect(data).toStrictEqual({
      loanSchemeId: 'default', // Get default loan scheme
      ownerAddress: ownerAddress,
      isUnderLiquidation: false,
      collateralAmounts: [],
      loanAmount: [],
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      currentRatio: expect.any(BigNumber)
    })
  })

  it('should not getVault if vault id is invalid', async () => {
    // Pass non existing hex id
    const promise = testing.rpc.loan.getVault('2cca2e3be0504af2daac12255cb5a691447e0aa3c9ca9120fb634a96010d2b4f')
    await expect(promise).rejects.toThrow('RpcApiError: \'Vault <2cca2e3be0504af2daac12255cb5a691447e0aa3c9ca9120fb634a96010d2b4f> not found\', code: -20, method: getvault')

    // Pass non hex id
    const promise2 = testing.rpc.loan.getVault('INVALID_VAULT_ID')
    await expect(promise2).rejects.toThrow('RpcApiError: \'vaultId must be of length 64 (not 16, for \'INVALID_VAULT_ID\')\', code: -8, method: getvault')

    // Pass hex id with invalid length
    const promise3 = testing.rpc.loan.getVault(Buffer.from('INVALID_VAULT_ID').toString('hex'))
    await expect(promise3).rejects.toThrow('RpcApiError: \'vaultId must be of length 64 (not 32, for \'494e56414c49445f5641554c545f4944\')\', code: -8, method: getvault')
  })
})
