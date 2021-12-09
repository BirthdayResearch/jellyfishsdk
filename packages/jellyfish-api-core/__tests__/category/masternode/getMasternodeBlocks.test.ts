import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { MasternodeBlock } from '../../../src/category/masternode'
import { Testing } from '@defichain/jellyfish-testing'

describe('Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should show list of blocks for masternode', async () => {
    const address = await testing.container.getNewAddress('', 'legacy')
    const id = await testing.container.call('createmasternode', [address])
    await testing.container.generate(1)

    await testing.container.setDeFiConf(['masternode_operator=' + address])
    await testing.container.restart()

    await testing.container.generate(20)
    const mintedBlockNumber = 5
    await testing.container.generate(mintedBlockNumber, address)

    const identifier: MasternodeBlock = {
      id
    }
    let masternodeBlock = await testing.rpc.masternode.getMasternodeBlocks(identifier)
    expect(Object.keys(masternodeBlock).length).toEqual(mintedBlockNumber)

    identifier.ownerAddress = address
    identifier.id = undefined
    masternodeBlock = await testing.rpc.masternode.getMasternodeBlocks(identifier)
    expect(Object.keys(masternodeBlock).length).toEqual(mintedBlockNumber)

    identifier.operatorAddress = address
    identifier.ownerAddress = undefined
    masternodeBlock = await testing.rpc.masternode.getMasternodeBlocks(identifier)
    expect(Object.keys(masternodeBlock).length).toEqual(mintedBlockNumber)
  })

  it('should show only list of blocks for masternode according to the depth', async () => {
    const address = await testing.container.getNewAddress('', 'legacy')
    const id = await testing.container.call('createmasternode', [address])
    await testing.container.generate(1)

    await testing.container.setDeFiConf(['masternode_operator=' + address])
    await testing.container.restart()

    await testing.container.generate(20)
    const mintedBlockNumber = 20
    await testing.container.generate(mintedBlockNumber, address)

    const identifier: MasternodeBlock = {
      id
    }
    const depth = 1
    const masternodeBlock = await testing.rpc.masternode.getMasternodeBlocks(identifier, depth)
    expect(Object.keys(masternodeBlock).length).toEqual(depth)
  })

  it('should fail if no identifier information is provided', async () => {
    const identifier: MasternodeBlock = {}
    const promise = testing.rpc.masternode.getMasternodeBlocks(identifier)
    await expect(promise).rejects.toThrow('Provide masternode identifier information')
  })

  it('should fail if more than 1 identifier information is provided', async () => {
    const address = await testing.container.getNewAddress('', 'legacy')
    const id = await testing.container.call('createmasternode', [address])
    await testing.container.generate(1)
    const identifier: MasternodeBlock = {
      id,
      ownerAddress: address
    }

    const promise = testing.rpc.masternode.getMasternodeBlocks(identifier)
    await expect(promise).rejects.toThrow('Only provide one identifier information')
  })

  it('should fail if non masternode address is used for owner or operator', async () => {
    const nonMasternodeAddress = await testing.container.getNewAddress('', 'legacy')

    const identifier: MasternodeBlock = {
      ownerAddress: nonMasternodeAddress
    }
    let promise = testing.rpc.masternode.getMasternodeBlocks(identifier)
    await expect(promise).rejects.toThrow('Masternode not found')

    identifier.operatorAddress = nonMasternodeAddress
    identifier.ownerAddress = undefined

    promise = testing.rpc.masternode.getMasternodeBlocks(identifier)
    await expect(promise).rejects.toThrow('Masternode not found')
  })

  it('should fail if an invalid address is used for owner or operator', async () => {
    const invalidAddress = 'abce12345'

    const identifier: MasternodeBlock = {
      ownerAddress: invalidAddress
    }
    let promise = testing.rpc.masternode.getMasternodeBlocks(identifier)
    await expect(promise).rejects.toThrow('Invalid P2PKH address')

    identifier.operatorAddress = invalidAddress
    identifier.ownerAddress = undefined

    promise = testing.rpc.masternode.getMasternodeBlocks(identifier)
    await expect(promise).rejects.toThrow('Invalid P2PKH address')
  })
})
