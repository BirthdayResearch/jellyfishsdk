import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('multi nodes', () => {
  const aContainer = new MasterNodeRegTestContainer()
  const aClient = new ContainerAdapterClient(aContainer)

  const bContainer = new MasterNodeRegTestContainer()
  const bClient = new ContainerAdapterClient(bContainer)

  beforeAll(async () => {
    await aContainer.start()
    await aContainer.waitForReady()
    await aContainer.waitForWalletCoinbaseMaturity()

    await bContainer.start()
    await bContainer.waitForReady()
    await bContainer.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await aContainer.stop()
    await bContainer.stop()
  })

  it('', async () => {
    const aBlockChainInfo = await aClient.blockchain.getBlockchainInfo()
    console.log('aBlockChainInfo: ', aBlockChainInfo)
    const bBlockChainInfo = await bClient.blockchain.getBlockchainInfo()
    console.log('bBlockChainInfo: ', bBlockChainInfo)
  })
})
