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
    await tGroup.waitForSync()
  })

  afterAll(async () => {
    await tGroup.stop()
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
    // check both MN1, MN2 on the same tip
    expect(await masterNodeProvider1.rpc.blockchain.getBestBlockHash()).toStrictEqual(await masterNodeProvider2.rpc.blockchain.getBestBlockHash())

    // MN identifiers - use owner address
    const MN1Identifier: MasternodeBlock = {
      ownerAddress: RegTestFoundationKeys[0].owner.address
    }
    const MN2Identifier: MasternodeBlock = {
      ownerAddress: RegTestFoundationKeys[1].owner.address
    }

    // get minted blocks so far.
    const MN1AlreadyMinedBlocks = await masterNodeProvider1.rpc.masternode.getMasternodeBlocks(MN1Identifier)
    const MN2AlreadyMinedBlocks = await masterNodeProvider2.rpc.masternode.getMasternodeBlocks(MN2Identifier)

    // mine blocks alternatively
    const numberOfBlockPerMasterNode = 10
    for (let i = 0; i < numberOfBlockPerMasterNode; i++) {
      await masterNodeProvider1.container.generate(1)
      await tGroup.waitForSync()
      await masterNodeProvider2.container.generate(1)
      await tGroup.waitForSync()
    }

    // check both MN1, MN2 on the same tip
    expect(await masterNodeProvider1.rpc.blockchain.getBestBlockHash()).toStrictEqual(await masterNodeProvider2.rpc.blockchain.getBestBlockHash())

    const MN1MinedBlocks = await masterNodeProvider1.rpc.masternode.getMasternodeBlocks(MN1Identifier)
    const MN2MinedBlocks = await masterNodeProvider2.rpc.masternode.getMasternodeBlocks(MN2Identifier)

    expect(Object.keys(MN1MinedBlocks).length).toEqual(Object.keys(MN1AlreadyMinedBlocks).length + numberOfBlockPerMasterNode)
    expect(Object.keys(MN2MinedBlocks).length).toEqual(Object.keys(MN2AlreadyMinedBlocks).length + numberOfBlockPerMasterNode)

    // Query with depth given
    {
      const depth = 4
      const MN1MinedBlocks = await masterNodeProvider1.rpc.masternode.getMasternodeBlocks(MN1Identifier, depth)
      const MN2MinedBlocks = await masterNodeProvider2.rpc.masternode.getMasternodeBlocks(MN2Identifier, depth)

      // should return last two blocks mined by each MN, within a depth of 4 from the tip.
      expect(Object.keys(MN1MinedBlocks).length).toEqual(depth / 2)
      expect(Object.keys(MN2MinedBlocks).length).toEqual(depth / 2)
    }
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
