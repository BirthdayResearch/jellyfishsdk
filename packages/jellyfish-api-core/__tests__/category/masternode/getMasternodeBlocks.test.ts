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
      id
    }
    let masternodeBlock = await client.masternode.getMasternodeBlocks(identifier)
    expect(Object.keys(masternodeBlock).length).toEqual(mintedBlockNumber)

    identifier.ownerAddress = address
    identifier.id = undefined
    masternodeBlock = await client.masternode.getMasternodeBlocks(identifier)
    expect(Object.keys(masternodeBlock).length).toEqual(mintedBlockNumber)

    identifier.operatorAddress = address
    identifier.ownerAddress = undefined
    masternodeBlock = await client.masternode.getMasternodeBlocks(identifier)
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
      id
    }
    const depth = 1
    const masternodeBlock = await client.masternode.getMasternodeBlocks(identifier, depth)
    expect(Object.keys(masternodeBlock).length).toEqual(depth)
  })

  it('should fail if no identifier information is provided', async () => {
    const identifier: MasternodeBlock = {}
    const promise = client.masternode.getMasternodeBlocks(identifier)
    await expect(promise).rejects.toThrow('Provide masternode identifier information')
  })

  it('should fail if more than 1 identifier information is provided', async () => {
    const address = await container.getNewAddress('', 'legacy')
    const id = await container.call('createmasternode', [address])
    await container.generate(1)
    const identifier: MasternodeBlock = {
      id,
      ownerAddress: address
    }

    const promise = client.masternode.getMasternodeBlocks(identifier)
    await expect(promise).rejects.toThrow('Only provide one identifier information')
  })
})
