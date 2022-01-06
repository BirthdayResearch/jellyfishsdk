import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Wallet without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await client.wallet.createWallet('test')
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should listWallets', async () => {
    await expect(client.wallet.listWallets()).resolves.toEqual(['', 'test'])
  })
})

describe('Wallet with masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await client.wallet.createWallet('test')
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should listWallets', async () => {
    await expect(client.wallet.listWallets()).resolves.toEqual(['', 'test'])
  })
})
