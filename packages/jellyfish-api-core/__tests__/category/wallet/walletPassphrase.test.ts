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

  it('should throw error when walletPassphrase is called', async () => {
    const promise = client.wallet.walletPassphrase('password', -100)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(
      "RpcApiError: 'Error: running with an unencrypted wallet, but walletpassphrase was called.', code: -15, method: walletpassphrase"
    )
  })
})

describe('Encrypted wallet on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await client.wallet.encryptWallet('password')
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error when walletPassphrase is called with a negative timeout', async () => {
    const promise = client.wallet.walletPassphrase('password', -100)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(
      "RpcApiError: 'Timeout cannot be negative.', code: -8, method: walletpassphrase"
    )
  })

  it('should throw error when walletPassphrase is called without a passphrase', async () => {
    const promise = client.wallet.walletPassphrase('', 100)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(
      "RpcApiError: 'passphrase can not be empty', code: -8, method: walletpassphrase"
    )
  })

  it('should throw error when walletPassphrase is called with a wrong passphrase', async () => {
    const promise = client.wallet.walletPassphrase('incorrectpassword', 100)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(
      "RpcApiError: 'Error: The wallet passphrase entered was incorrect.', code: -14, method: walletpassphrase"
    )
  })

  it('should unlock wallet when walletPassphrase is called with the correct passphrase', async () => {
    const promise = client.wallet.walletPassphrase('password', 100)

    await expect(promise).resolves.not.toThrow()
  })
})
