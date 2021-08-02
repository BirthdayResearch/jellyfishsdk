import { ContainerAdapterClient } from '../../container_adapter_client'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { UTXO } from '@defichain/jellyfish-api-core/category/oracle'

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

  it('should create vault', async () => {
    await container.call('createloanscheme', [200, 2, 'scheme'])
    await container.generate(1)

    const vaultId = await client.loan.createVault(await container.getNewAddress(), 'scheme')

    expect(typeof vaultId).toStrictEqual('string')
    expect(vaultId.length).toStrictEqual(64)

    await container.generate(1)
  })

  it('should not create vault with invalid address', async () => {
    await container.call('createloanscheme', [200, 2, 'scheme'])
    await container.generate(1)

    const promise = client.loan.createVault('INVALID_OWNER_ADDRESS', 'scheme')
    await expect(promise).rejects.toThrow('Error: Invalid owneraddress address\', code: -5, method: createvault')
  })

  it('should not create vault with not exists loan scheme id', async () => {
    const promise = client.loan.createVault(await container.getNewAddress(), 'scheme')
    await expect(promise).rejects.toThrow('pcApiError: \'Test VaultTx execution failed:\nCannot find existing loan scheme with id scheme\', code: -32600, method: createvault')
  })

  it('should create vault with utxos', async () => {
    await container.call('createloanscheme', [200, 2, 'scheme'])
    await container.generate(1)

    const address = await container.call('getnewaddress')
    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const vaultId = await client.loan.createVault(await container.getNewAddress(), 'scheme', { utxos: inputs })

    expect(typeof vaultId).toStrictEqual('string')
    expect(vaultId.length).toStrictEqual(64)

    await container.generate(1)
  })

  it('should not create vault with arbritary utxos', async () => {
    await container.call('createloanscheme', [200, 2, 'scheme'])
    await container.generate(1)

    const { txid, vout } = await container.fundAddress(await container.call('getnewaddress'), 10)
    const vaultId = await client.loan.createVault(await container.getNewAddress(), 'scheme', { utxos: [{ txid, vout }] })

    expect(typeof vaultId).toStrictEqual('string')
    expect(vaultId.length).toStrictEqual(64)

    await container.generate(1)
  })
})
