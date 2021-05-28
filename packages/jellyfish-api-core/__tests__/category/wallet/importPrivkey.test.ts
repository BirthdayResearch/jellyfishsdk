import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('ImportPrivKey', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should should import private key without failing ', async () => {
    const privatekey = await client.wallet.dumpPrivKey(await client.wallet.getNewAddress())
    const promise = client.wallet.importPrivKey(privatekey)

    await expect(promise).resolves.not.toThrow()
  })

  it('should import private key with rescan set to false', async () => {
    const privateKey = await client.wallet.dumpPrivKey(await client.wallet.getNewAddress())
    const promise = client.wallet.importPrivKey(privateKey, '', false)

    await expect(promise).resolves.not.toThrow()
  })

  it('should import private key with label passed', async () => {
    const privateKey = await client.wallet.dumpPrivKey(await client.wallet.getNewAddress('testing'))
    const promise = client.wallet.importPrivKey(privateKey, 'testing')

    await expect(promise).resolves.not.toThrow()
  })

  it('should fail and throw an error with invalid private key', async () => {
    const privateKey = 'invalidPrivateKey'
    const promise = client.wallet.importPrivKey(privateKey)

    await expect(promise).rejects.toThrow('Invalid private key encoding')
  })
})
