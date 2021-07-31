import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasternodeState } from '../../../src/category/masternode'

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

  it('should createMasternode ', async () => {
    const masternodesLengthBefore = Object.keys(await client.masternode.listMasternodes()).length

    const ownerAddress = await client.wallet.getNewAddress()
    const hex = await client.masternode.createMasternode(ownerAddress)

    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    const masternodesAfter = await client.masternode.listMasternodes()
    const masternodesLengthAfter = Object.keys(masternodesAfter).length
    expect(masternodesLengthAfter).toStrictEqual(masternodesLengthBefore + 1)

    const createdMasternode = Object.values(masternodesAfter).filter(mn => mn.ownerAuthAddress === ownerAddress)
    for (const mn of createdMasternode) {
      expect(mn.ownerAuthAddress).toStrictEqual(ownerAddress)
      expect(mn.operatorAuthAddress).toStrictEqual(ownerAddress)
      expect(typeof mn.creationHeight).toStrictEqual('number')
      expect(typeof mn.resignHeight).toStrictEqual('number')
      expect(typeof mn.resignTx).toStrictEqual('string')
      expect(typeof mn.banTx).toStrictEqual('string')
      expect(mn.state).toStrictEqual(MasternodeState.PRE_ENABLED)
      expect(typeof mn.state).toStrictEqual('string')
      expect(typeof mn.mintedBlocks).toStrictEqual('number')
      expect(typeof mn.ownerIsMine).toStrictEqual('boolean')
      expect(mn.ownerIsMine).toStrictEqual(true)
      expect(typeof mn.localMasternode).toStrictEqual('boolean')
      expect(typeof mn.operatorIsMine).toStrictEqual('boolean')
      expect(mn.operatorIsMine).toStrictEqual(true)
    }
  })

  it('should createMasternode /w operator address', async () => {
    const masternodesLengthBefore = Object.keys(await client.masternode.listMasternodes()).length

    const ownerAddress = await client.wallet.getNewAddress()
    const operatorAddress = await client.wallet.getNewAddress()
    const hex = await client.masternode.createMasternode(ownerAddress, operatorAddress)
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    const masternodesAfter = await client.masternode.listMasternodes()
    const masternodesLengthAfter = Object.keys(masternodesAfter).length
    expect(masternodesLengthAfter).toStrictEqual(masternodesLengthBefore + 1)

    const createdMasternode = Object.values(masternodesAfter).filter(mn => mn.ownerAuthAddress === ownerAddress)
    for (const mn of createdMasternode) {
      expect(mn.ownerAuthAddress).toStrictEqual(ownerAddress)
      expect(mn.operatorAuthAddress).toStrictEqual(operatorAddress)
    }
  })

  it('should createMasternode with specified UTXOS', async () => {
    const ownerAddress = await client.wallet.getNewAddress()
    const { txid } = await container.fundAddress(ownerAddress, 10)

    const utxos = await client.wallet.listUnspent()
    const utxosBeforeLength = utxos.length

    const inputs = utxos.filter((utxos) => utxos.txid === txid)
      .map((utxo: { txid: string, vout: number }) => ({ txid: utxo.txid, vout: utxo.vout }))
    const hex = await client.masternode.createMasternode(ownerAddress, ownerAddress, { utxos: inputs })

    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    const utxosAfterLength = (await client.wallet.listUnspent()).length
    expect(utxosAfterLength).toBeLessThan((utxosBeforeLength))
  })

  it('should throw an error with invalid owner address', async () => {
    const invalidAddress = 'invalidAddress'
    await expect(client.masternode.createMasternode(invalidAddress)).rejects.toThrow('operatorAddress (invalidAddress) does not refer to a P2PKH or P2WPKH address')
  })
})
