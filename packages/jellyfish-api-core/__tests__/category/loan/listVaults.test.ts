import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan listVault', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should listVaults', async () => {
    // Before createVault
    {
      const result = await testing.rpc.loan.listVaults()
      expect(result).toStrictEqual({})
    }

    await testing.container.call('createloanscheme', [100, 1.5, 'default'])
    await testing.generate(1)

    await testing.container.call('createloanscheme', [200, 2.5, 'scheme'])
    await testing.generate(1)

    const owneraddress = await testing.generateAddress()

    const vaultId1 = await testing.container.call('createvault', [owneraddress, 'default'])
    await testing.generate(1)

    const vaultId2 = await testing.container.call('createvault', [owneraddress, 'scheme'])
    await testing.generate(1)

    // After createVault
    {
      const result = await testing.rpc.loan.listVaults()
      expect(result).toStrictEqual({
        [vaultId1]: {
          owneraddress,
          loanschemeid: 'default',
          isunderliquidation: false
        },
        [vaultId2]: {
          owneraddress,
          loanschemeid: 'scheme',
          isunderliquidation: false
        }
      })
    }
  })
})
