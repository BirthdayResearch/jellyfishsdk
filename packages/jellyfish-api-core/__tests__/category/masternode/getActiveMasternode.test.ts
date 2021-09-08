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

  it('should getActiveMasternodeCount = 2', async () => {
    for (let i = 0; i < 2; i++) {
      const address = group.get(i).getNewAddress()
      await clients[i].masternode.createMasternode(address)
      await group.get(i).generate(20, address)
      await group.waitForSync()
    }
    
    const activeMasternodes = await clients[0].masternode.getActiveMasternodeCount()
    expect(activeMasternodes).toStrictEqual(2)
  })
})
