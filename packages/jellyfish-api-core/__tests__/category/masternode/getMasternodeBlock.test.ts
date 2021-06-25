import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'

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

  it('should getMasternodeBlocks with ID', async () => {
    const masternodeID = await client.masternode.createMasternode(await container.getNewAddress())

    await container.generate(1)

    const blocksResult = await client.masternode.getMasternodeBlocks({ id: masternodeID })

    for (const value of Object.values(blocksResult)) {
      expect(typeof value).toStrictEqual('string')
      expect(value.length).toStrictEqual(64)
    }
  })

  it('should getMasternodeBlocks with owner address', async () => {
    const address = await container.getNewAddress()
    await client.masternode.createMasternode(address)

    await container.generate(1)

    const blocksResult = await client.masternode.getMasternodeBlocks({ ownerAddress: address })

    for (const value of Object.values(blocksResult)) {
      expect(typeof value).toStrictEqual('string')
      expect(value.length).toStrictEqual(64)
    }
  })

  it('should getMasternodeBlocks with operator address', async () => {
    const address = await container.getNewAddress()
    await client.masternode.createMasternode(address)

    await container.generate(1)

    const blocksResult = await client.masternode.getMasternodeBlocks({ operatorAddress: address })

    for (const value of Object.values(blocksResult)) {
      expect(typeof value).toStrictEqual('string')
      expect(value.length).toStrictEqual(64)
    }
  })

  it('should getMasternodeBlocks with id and depth', async () => {
    const masternodeId = await client.masternode.createMasternode(await container.getNewAddress())

    await container.generate(1)

    const blocksResult = await client.masternode.getMasternodeBlocks({ id: masternodeId }, 10)

    for (const value of Object.values(blocksResult)) {
      expect(typeof value).toStrictEqual('string')
      expect(value.length).toStrictEqual(64)
    }
  })

  it('should getMasternodeBlocks with owner address and depth', async () => {
    const address = await container.getNewAddress()
    await client.masternode.createMasternode(address)

    await container.generate(1)

    const blocksResult = await client.masternode.getMasternodeBlocks({ ownerAddress: address }, 10)

    for (const value of Object.values(blocksResult)) {
      expect(typeof value).toStrictEqual('string')
      expect(value.length).toStrictEqual(64)
    }
  })

  it('should getMasternodeBlocks with operator address and depth', async () => {
    const address = await container.getNewAddress()
    await client.masternode.createMasternode(address)

    await container.generate(1)

    const blocksResult = await client.masternode.getMasternodeBlocks({ operatorAddress: address }, 10)

    for (const value of Object.values(blocksResult)) {
      expect(typeof value).toStrictEqual('string')
      expect(value.length).toStrictEqual(64)
    }
  })

  it('should throw and error with invalid id', async () => {
    const invalidId = 'c3285ad8ab28886beeeeb92562f40168ba8d877cff6f2f02301c99053ed33349'
    const promise = client.masternode.getMasternodeBlocks({ id: invalidId })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Masternode not found')
  })

  it('should throw an error with invalid owner address ', async () => {
    const invalidOwnerAddress = 'INVALIDADDRESS'
    const promise = client.masternode.getMasternodeBlocks({ ownerAddress: invalidOwnerAddress })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid P2PKH address')
  })

  it('should throw an error with invalid operator address ', async () => {
    const invalidOperatorAddress = 'INVALIDADDRESS'
    const promise = client.masternode.getMasternodeBlocks({ operatorAddress: invalidOperatorAddress })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid P2PKH address')
  })

  it('should throw an error when identifier is not passed', async () => {
    const promise = client.masternode.getMasternodeBlocks({})

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Provide masternode identifier information')
  })

  it('should throw an error when multiple identifiers are provided', async () => {
    const address = await container.getNewAddress()
    const masternodeID = await client.masternode.createMasternode(address)

    await container.generate(1)

    const promise = client.masternode.getMasternodeBlocks({ id: masternodeID, ownerAddress: address, operatorAddress: address })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Only provide one identifier information')
  })
})
