import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Masternode', () => {
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

  it('should getActiveMasternodesCount', async () => {
    await client.masternode.getActiveMasternodeCount() // 1

    const ownerAddress = await container.getNewAddress()

    await client.masternode.createMasternode(ownerAddress)
    await container.generate(20, ownerAddress) // Enables masternode

    await client.masternode.getActiveMasternodeCount() // 1
  })
})
