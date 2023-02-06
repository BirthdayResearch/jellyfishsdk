import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Unencrypted Wallet without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if walletPassphrase is called', async () => {
    await expect(client.wallet.walletPassphrase('password', -100))
      .rejects.toThrow("RpcApiError: 'Error: running with an unencrypted wallet, but walletpassphrase was called.', code: -15, method: walletpassphrase")
  })
})

describe('Encrypted Wallet without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await client.wallet.encryptWallet('password')
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if timeout is negative', async () => {
    await expect(client.wallet.walletPassphrase('password', -100))
      .rejects.toThrow("RpcApiError: 'Timeout cannot be negative.', code: -8, method: walletpassphrase")
  })

  it('should throw error if passphrase is empty', async () => {
    await expect(client.wallet.walletPassphrase('', 100))
      .rejects.toThrow("RpcApiError: 'passphrase can not be empty', code: -8, method: walletpassphrase")
  })

  it('should throw error if passphrase is incorrect', async () => {
    await expect(client.wallet.walletPassphrase('wrongpassphrase', 100))
      .rejects.toThrow("RpcApiError: 'Error: The wallet passphrase entered was incorrect.', code: -14, method: walletpassphrase")
  })
})

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
    await expect(client.wallet.walletPassphrase('password', -100))
      .rejects.toThrow("RpcApiError: 'Error: running with an unencrypted wallet, but walletpassphrase was called.', code: -15, method: walletpassphrase")
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
    await expect(client.wallet.walletPassphrase('password', -100))
      .rejects.toThrow("RpcApiError: 'Timeout cannot be negative.', code: -8, method: walletpassphrase")
  })

  it('should throw error if passphrase is empty', async () => {
    await expect(client.wallet.walletPassphrase('', 100))
      .rejects.toThrow("RpcApiError: 'passphrase can not be empty', code: -8, method: walletpassphrase")
  })

  it('should throw error if passphrase is incorrect', async () => {
    await expect(client.wallet.walletPassphrase('wrongpassword', 100))
      .rejects.toThrow("RpcApiError: 'Error: The wallet passphrase entered was incorrect.', code: -14, method: walletpassphrase")
  })
})
