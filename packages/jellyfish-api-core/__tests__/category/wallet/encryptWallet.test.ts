import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '@defichain/jellyfish-api-core'

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
    const promise = client.wallet.encryptWallet('')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(
      "RpcApiError: 'passphrase can not be empty', code: -8, method: encryptwallet"
    )
  })

  it('should encryptWallet with a given passphrase', async () => {
    const promise = await client.wallet.encryptWallet('yourpassphrase')

    expect(promise).toStrictEqual(
      'wallet encrypted; The keypool has been flushed and a new HD seed was generated (if you are using HD). You need to make a new backup.'
    )
  })

  it('should throw error when encryptWallet is called again after encryption', async () => {
    const promise = client.wallet.encryptWallet('yourpassphrase')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(
      "RpcApiError: 'Error: running with an encrypted wallet, but encryptwallet was called.', code: -15, method: encryptwallet"
    )
  })
})

describe('Wallet without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if passphrase for wallet encryption is empty', async () => {
    const promise = client.wallet.encryptWallet('')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(
      "RpcApiError: 'passphrase can not be empty', code: -8, method: encryptwallet"
    )
  })

  it('should encryptWallet with a given passphrase', async () => {
    const promise = await client.wallet.encryptWallet('yourpassphrase')

    expect(promise).toStrictEqual(
      'wallet encrypted; The keypool has been flushed and a new HD seed was generated (if you are using HD). You need to make a new backup.'
    )
  })

  it('should throw error when encryptWallet is called again after encryption', async () => {
    const promise = client.wallet.encryptWallet('yourpassphrase')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(
      "RpcApiError: 'Error: running with an encrypted wallet, but encryptwallet was called.', code: -15, method: encryptwallet"
    )
  })
})
