import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { MasternodeBlock } from '../../../src/category/masternode'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('Masternode', () => {
  const tGroup = TestingGroup.create(2, i => new MasterNodeRegTestContainer(RegTestFoundationKeys[i]))
  const masterNodeProvider1 = tGroup.get(0)
  const masterNodeProvider2 = tGroup.get(1)

  beforeAll(async () => {
    await tGroup.start()
    await masterNodeProvider1.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await masterNodeProvider1.container.stop()
  })

  it('should show list of blocks for masternode', async () => {
    const address = await masterNodeProvider1.container.getNewAddress('', 'legacy')
    const id = await masterNodeProvider1.rpc.masternode.createMasternode(address)
    await masterNodeProvider1.container.generate(1)

    await masterNodeProvider1.container.setDeFiConf([`masternode_operator=${address}`])
    await masterNodeProvider1.container.restart()

    await masterNodeProvider1.container.generate(20)
    const mintedBlockNumber = 5
    await masterNodeProvider1.container.generate(mintedBlockNumber, address)

    const identifier: MasternodeBlock = {
      id
    }
    let masternodeBlock = await masterNodeProvider1.rpc.masternode.getMasternodeBlocks(identifier)
    expect(Object.keys(masternodeBlock).length).toEqual(mintedBlockNumber)

    identifier.ownerAddress = address
    identifier.id = undefined
    masternodeBlock = await masterNodeProvider1.rpc.masternode.getMasternodeBlocks(identifier)
    expect(Object.keys(masternodeBlock).length).toEqual(mintedBlockNumber)

    identifier.operatorAddress = address
    identifier.ownerAddress = undefined
    masternodeBlock = await masterNodeProvider1.rpc.masternode.getMasternodeBlocks(identifier)
    expect(Object.keys(masternodeBlock).length).toEqual(mintedBlockNumber)
  })

  it('should show only list of blocks for masternode according to the depth', async () => {
    const address = await masterNodeProvider1.container.getNewAddress('', 'legacy')
    const id = await masterNodeProvider1.rpc.masternode.createMasternode(address)
    await masterNodeProvider1.container.generate(1)

    await masterNodeProvider1.container.setDeFiConf([`masternode_operator=${address}`])
    await masterNodeProvider1.container.restart()

    await masterNodeProvider1.container.generate(20)
    const mintedBlockNumber = 20
    await masterNodeProvider1.container.generate(mintedBlockNumber, address)

    const identifier: MasternodeBlock = {
      id
    }
    const depth = 1
    const masternodeBlock = await masterNodeProvider1.rpc.masternode.getMasternodeBlocks(identifier, depth)
    expect(Object.keys(masternodeBlock).length).toEqual(depth)
  })

  it('should mint blocks by different masternode correctly and the depth is correct', async () => {
    const masterNode1Addr = await masterNodeProvider1.container.getNewAddress('', 'legacy')
    const masterNode1Id = await masterNodeProvider1.container.call('createmasternode', [masterNode1Addr])
    await masterNodeProvider1.container.generate(1)

    await masterNodeProvider1.container.setDeFiConf([`masternode_operator=${masterNode1Addr}`])
    await masterNodeProvider1.container.restart()
    const masterNode1Identifier: MasternodeBlock = {
      id: masterNode1Id
    }

    const masterNode2Addr = await masterNodeProvider2.container.getNewAddress('', 'legacy')
    const masterNode2Id = await masterNodeProvider2.rpc.masternode.createMasternode(masterNode2Addr)
    await masterNodeProvider2.container.generate(1)

    await masterNodeProvider2.container.setDeFiConf([`masternode_operator=${masterNode2Addr}`])
    await masterNodeProvider2.container.restart()
    const masterNode2Identifier: MasternodeBlock = {
      id: masterNode2Id
    }

    await masterNodeProvider1.container.generate(20)
    await masterNodeProvider2.container.generate(20)

    const numberOfBlockPerMasterNode = 10
    for (let i = 0; i < numberOfBlockPerMasterNode; i++) {
      await masterNodeProvider1.container.generate(1, masterNode1Addr)
      await masterNodeProvider1.container.generate(1)
      await masterNodeProvider2.container.generate(1, masterNode2Addr)
      await masterNodeProvider2.container.generate(1)
    }
    const masternode1Block = await masterNodeProvider1.rpc.masternode.getMasternodeBlocks(masterNode1Identifier)
    const masternode2Block = await masterNodeProvider2.rpc.masternode.getMasternodeBlocks(masterNode2Identifier)

    expect(Object.keys(masternode1Block).length).toEqual(numberOfBlockPerMasterNode)
    expect(Object.keys(masternode2Block).length).toEqual(numberOfBlockPerMasterNode)

    const depth = 4
    const masternode1BlockDepth = await masterNodeProvider1.rpc.masternode.getMasternodeBlocks(masterNode1Identifier, depth)
    const masternode2BlockDepth = await masterNodeProvider2.rpc.masternode.getMasternodeBlocks(masterNode2Identifier, depth)

    // currently the depth = 4 does not return the last 4 blocks by each masternode,
    // instead, it only returns the blocks that are minted by masternode in the last 4 latest block globally,
    // this may not be the expected behaviour of the rpc call
    expect(Object.keys(masternode1BlockDepth).length).toEqual(depth)
    expect(Object.keys(masternode2BlockDepth).length).toEqual(depth)
  })

  it('should fail if no identifier information is provided', async () => {
    const identifier: MasternodeBlock = {}
    const promise = masterNodeProvider1.rpc.masternode.getMasternodeBlocks(identifier)
    await expect(promise).rejects.toThrow('Provide masternode identifier information')
  })

  it('should fail if more than 1 identifier information is provided', async () => {
    const address = await masterNodeProvider1.container.getNewAddress('', 'legacy')
    const id = await masterNodeProvider1.rpc.masternode.createMasternode(address)
    await masterNodeProvider1.container.generate(1)
    const identifier: MasternodeBlock = {
      id,
      ownerAddress: address
    }

    const promise = masterNodeProvider1.rpc.masternode.getMasternodeBlocks(identifier)
    await expect(promise).rejects.toThrow('Only provide one identifier information')
  })

  it('should fail if non masternode address is used for owner or operator', async () => {
    const nonMasternodeAddress = await masterNodeProvider1.container.getNewAddress('', 'legacy')

    const identifier: MasternodeBlock = {
      ownerAddress: nonMasternodeAddress
    }
    let promise = masterNodeProvider1.rpc.masternode.getMasternodeBlocks(identifier)
    await expect(promise).rejects.toThrow('Masternode not found')

    identifier.operatorAddress = nonMasternodeAddress
    identifier.ownerAddress = undefined

    promise = masterNodeProvider1.rpc.masternode.getMasternodeBlocks(identifier)
    await expect(promise).rejects.toThrow('Masternode not found')
  })

  it('should fail if an invalid address is used for owner or operator', async () => {
    const invalidAddress = 'abce12345'

    const identifier: MasternodeBlock = {
      ownerAddress: invalidAddress
    }
    let promise = masterNodeProvider1.rpc.masternode.getMasternodeBlocks(identifier)
    await expect(promise).rejects.toThrow('Invalid P2PKH address')

    identifier.operatorAddress = invalidAddress
    identifier.ownerAddress = undefined

    promise = masterNodeProvider1.rpc.masternode.getMasternodeBlocks(identifier)
    await expect(promise).rejects.toThrow('Invalid P2PKH address')
  })
})
