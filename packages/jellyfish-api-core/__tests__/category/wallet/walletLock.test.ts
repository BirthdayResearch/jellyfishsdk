import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Unencrypted wallet on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error when walletLock is called', async () => {
    const promise = client.wallet.walletLock()

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(
      "RpcApiError: 'Error: running with an unencrypted wallet, but walletlock was called.', code: -15, method: walletlock"
    )
  })
})

describe('Encrypted wallet on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await client.wallet.encryptWallet('password')
    await client.wallet.walletPassphrase('password', 10000)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should walletLock without failing', async () => {
    const method = client.wallet.importPrivKey(await client.wallet.dumpPrivKey(await client.wallet.getNewAddress()))
    const promise = client.wallet.walletLock()

    await expect(method).resolves.not.toThrow()
    await expect(promise).resolves.not.toThrow()
  })
})
