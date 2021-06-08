import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Balance on masternode', () => {
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

  it('should getUnconfirmedBalance', async () => {
    const address = 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU'
    const unconfirmedbalance = await client.wallet.getUnconfirmedBalance()

    expect(unconfirmedbalance.toNumber()).toStrictEqual(0)
    await client.wallet.sendToAddress(address, 35)

    await container.generate(1)

    const newUnconfirmedBalance = await client.wallet.getUnconfirmedBalance()

    expect(newUnconfirmedBalance.toNumber()).toStrictEqual(0)
  })
})
