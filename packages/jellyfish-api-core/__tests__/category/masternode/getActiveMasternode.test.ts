import { MasterNodeRegTestContainer, GenesisKeys, ContainerGroup } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Masternode', () => {
  const group = new ContainerGroup([
    new MasterNodeRegTestContainer(GenesisKeys[0]),
    new MasterNodeRegTestContainer(GenesisKeys[1])
  ])

  const clients = [
    new ContainerAdapterClient(group.get(0)),
    new ContainerAdapterClient(group.get(1))
  ]

  beforeAll(async () => {
    await group.start()
    await group.get(0).waitForWalletCoinbaseMaturity()
    await group.get(1).waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await group.stop()
  })

  it('should getActiveMasternodeCount', async () => {
    const addresses = [
      await group.get(0).getNewAddress(),
      await group.get(1).getNewAddress()
    ]

    for (let i = 0; i < addresses.length; i++) {
      await clients[i].masternode.createMasternode(addresses[i])
      await group.get(i).generate(20, addresses[i])
      await group.waitForSync()
    }
    const activeMasternodes = await clients[0].masternode.getActiveMasternodeCount()

    expect(activeMasternodes).toStrictEqual(addresses.length)
  })
})
