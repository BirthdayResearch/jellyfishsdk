import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasternodeBlock } from '../../../src/category/masternode'

describe('Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should show list of blocks for masternode', async () => {
    const address = await container.getNewAddress('', 'legacy')
    const id = await container.call('createmasternode', [address])
    await container.generate(1)

    await container.setDeFiConf(['masternode_operator=' + address])
    await container.restart()

    await container.generate(20)
    const mintedBlockNumber = 5
    await container.generate(mintedBlockNumber, address)

    const identifier: MasternodeBlock = {
      id,
      ownerAuthAddress: address
    }
    const masternodeBlock = await client.masternode.getMasternodeBlocks(identifier)
    expect(Object.keys(masternodeBlock).length).toEqual(mintedBlockNumber)
  })

  it('should show only list of blocks for masternode according to the depth', async () => {
    const address = await container.getNewAddress('', 'legacy')
    const id = await container.call('createmasternode', [address])
    await container.generate(1)

    await container.setDeFiConf(['masternode_operator=' + address])
    await container.restart()

    await container.generate(20)
    const mintedBlockNumber = 20
    await container.generate(mintedBlockNumber, address)

    const identifier: MasternodeBlock = {
      id,
      ownerAuthAddress: address
    }
    const depth = 1
    const masternodeBlock = await client.masternode.getMasternodeBlocks(identifier, depth)
    console.log(masternodeBlock)
    expect(Object.keys(masternodeBlock).length).toEqual(depth)
  })
})
