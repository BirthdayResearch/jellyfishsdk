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

  it('should getMasternodeBlocks with id', async () => {
    const id = await client.masternode.createMasternode(await container.getNewAddress())

    await container.generate(1)

    const blocksResult = await client.masternode.getMasternodeBlocks({ id })

    for (const value of Object.values(blocksResult)) {
      expect(typeof value).toStrictEqual('string')
      expect(value.length).toStrictEqual(64)
    }
  })

  it('should getMasternodeBlocks with owner address', async () => {
    const ownerAddress = await container.getNewAddress()
    await client.masternode.createMasternode(ownerAddress)

    await container.generate(1)

    const blocksResult = await client.masternode.getMasternodeBlocks({ ownerAddress })

    for (const value of Object.values(blocksResult)) {
      expect(typeof value).toStrictEqual('string')
      expect(value.length).toStrictEqual(64)
    }
  })

  it('should getMasternodeBlocks with operator address', async () => {
    const operatorAddress = await container.getNewAddress()
    await client.masternode.createMasternode(operatorAddress)

    await container.generate(1)

    const blocksResult = await client.masternode.getMasternodeBlocks({ operatorAddress })

    for (const value of Object.values(blocksResult)) {
      expect(typeof value).toStrictEqual('string')
      expect(value.length).toStrictEqual(64)
    }
  })

  it('should getMasternodeBlocks with id and depth', async () => {
    const id = await client.masternode.createMasternode(await container.getNewAddress())

    await container.generate(1)

    const blocksResult = await client.masternode.getMasternodeBlocks({ id }, 10)

    for (const value of Object.values(blocksResult)) {
      expect(typeof value).toStrictEqual('string')
      expect(value.length).toStrictEqual(64)
    }
  })

  it('should getMasternodeBlocks with owner address and depth', async () => {
    const ownerAddress = await container.getNewAddress()
    await client.masternode.createMasternode(ownerAddress)

    await container.generate(1)

    const blocksResult = await client.masternode.getMasternodeBlocks({ ownerAddress }, 10)

    for (const value of Object.values(blocksResult)) {
      expect(typeof value).toStrictEqual('string')
      expect(value.length).toStrictEqual(64)
    }
  })

  it('should getMasternodeBlocks with operator address and depth', async () => {
    const operatorAddress = await container.getNewAddress()
    await client.masternode.createMasternode(operatorAddress)

    await container.generate(1)

    const blocksResult = await client.masternode.getMasternodeBlocks({ operatorAddress }, 10)

    for (const value of Object.values(blocksResult)) {
      expect(typeof value).toStrictEqual('string')
      expect(value.length).toStrictEqual(64)
    }
  })

  it('should throw and error with invalid id', async () => {
    const id = 'c3285ad8ab28886beeeeb92562f40168ba8d877cff6f2f02301c99053ed33349'
    const promise = client.masternode.getMasternodeBlocks({ id })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Masternode not found')
  })

  it('should throw an error with invalid owner address ', async () => {
    const ownerAddress = 'INVALIDADDRESS'
    const promise = client.masternode.getMasternodeBlocks({ ownerAddress })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid P2PKH address')
  })

  it('should throw an error with invalid operator address ', async () => {
    const operatorAddress = 'INVALIDADDRESS'
    const promise = client.masternode.getMasternodeBlocks({ operatorAddress })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid P2PKH address')
  })

  it('should throw an error when identifier is not passed', async () => {
    const promise = client.masternode.getMasternodeBlocks({})

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Provide masternode identifier information')
  })

  it('should throw an error when multiple identifiers are provided', async () => {
    const ownerAddress = await container.getNewAddress()
    const id = await client.masternode.createMasternode(ownerAddress)

    await container.generate(1)

    const promise = client.masternode.getMasternodeBlocks({ id, ownerAddress, operatorAddress: ownerAddress })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Only provide one identifier information')
  })
})
