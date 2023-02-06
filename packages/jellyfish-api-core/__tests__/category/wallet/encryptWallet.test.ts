import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Wallet without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if passphrase for encryptWallet is empty', async () => {
    await expect(client.wallet.encryptWallet(''))
      .rejects.toThrow("RpcApiError: 'passphrase can not be empty', code: -8, method: encryptwallet")
  })

  it('should encryptWallet with a given passphrase', async () => {
    expect(await client.wallet.encryptWallet('yourpassphrase'))
      .toStrictEqual('wallet encrypted; The keypool has been flushed and a new HD seed was generated (if you are using HD). You need to make a new backup.')
  })

  it('should throw error when encryptWallet is called again after encryption', async () => {
    await expect(client.wallet.encryptWallet('yourpassphrase'))
      .rejects.toThrow("RpcApiError: 'Error: running with an encrypted wallet, but encryptwallet was called.', code: -15, method: encryptwallet")
  })
})

describe('Wallet on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if passphrase for encryptWallet is empty', async () => {
    await expect(client.wallet.encryptWallet(''))
      .rejects.toThrow("RpcApiError: 'passphrase can not be empty', code: -8, method: encryptwallet")
  })

  it('should encryptWallet with a given passphrase', async () => {
    expect(await client.wallet.encryptWallet('yourpassphrase'))
      .toStrictEqual('wallet encrypted; The keypool has been flushed and a new HD seed was generated (if you are using HD). You need to make a new backup.')
  })

  it('should throw error when encryptWallet is called again after encryption', async () => {
    await expect(client.wallet.encryptWallet('yourpassphrase'))
      .rejects.toThrow("RpcApiError: 'Error: running with an encrypted wallet, but encryptwallet was called.', code: -15, method: encryptwallet")
  })
})
