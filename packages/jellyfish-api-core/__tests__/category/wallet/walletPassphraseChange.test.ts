import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Unencrypted Wallet on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error when walletPassphraseChange is called', async () => {
    const promise = client.wallet.walletPassphraseChange('wrongpassword', 'newpassword')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(
      "RpcApiError: 'Error: running with an unencrypted wallet, but walletpassphrasechange was called.', code: -15, method: walletpassphrasechange"
    )
  })
})

describe('Encrypted Wallet on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await client.wallet.encryptWallet('password')
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error when walletPassphraseChange is called with an incorrect passphrase', async () => {
    const promise = client.wallet.walletPassphraseChange('wrongpassword', 'newpassword')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(
      "RpcApiError: 'Error: The wallet passphrase entered was incorrect.', code: -14, method: walletpassphrasechange"
    )
  })

  it('should throw error when walletPassphraseChange is called with an empty passphrase', async () => {
    const promise = client.wallet.walletPassphraseChange('', 'newpassword')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(
      "RpcApiError: 'passphrase can not be empty', code: -8, method: walletpassphrasechange"
    )
  })

  it('should walletPassphraseChange when the correct old passphrase is provided', async () => {
    const promise = client.wallet.walletPassphraseChange('password', 'newpassword')

    await expect(promise).resolves.not.toThrow()
  })
})
