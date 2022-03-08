import { Testing } from '@defichain/jellyfish-testing'
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
    const wallets = await client.wallet.listWallets()
    expect(wallets).toStrictEqual(['', 'test'])
  })
})

describe('Wallet with masternode', () => {
  const master = new MasterNodeRegTestContainer()
  const testing = Testing.create(master)

  beforeAll(async () => {
    await testing.container.start()
    await testing.rpc.wallet.createWallet('test')
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should listWallets', async () => {
    const wallets = await testing.rpc.wallet.listWallets()
    expect(wallets).toEqual(['', 'test'])
  })
})
