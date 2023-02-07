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

  it('should throw error if walletPassphrase is called', async () => {
    const promise = client.wallet.walletPassphrase('password', -100)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Error: running with an unencrypted wallet, but walletpassphrase was called.', code: -15, method: walletpassphrase")
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

  it('should throw error if timeout is negative', async () => {
    const promise = client.wallet.walletPassphrase('password', -100)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Timeout cannot be negative.', code: -8, method: walletpassphrase")
  })

  it('should throw error if passphrase is empty', async () => {
    const promise = client.wallet.walletPassphrase('', 100)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'passphrase can not be empty', code: -8, method: walletpassphrase")
  })

  it('should throw error if passphrase is incorrect', async () => {
    const promise = client.wallet.walletPassphrase('incorrectpassword', 100)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Error: The wallet passphrase entered was incorrect.', code: -14, method: walletpassphrase")
  })

  it('should unlock wallet without errors', async () => {
    const promise = client.wallet.walletPassphrase('password', 100)

    await expect(promise).resolves.not.toThrow()
  })
})
