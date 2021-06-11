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

  it('should create a masternode transaction', async () => {
    const masternodesBefore = await client.masternode.listMasternodes()
    const masternodesLengthBefore = Object.keys(masternodesBefore).length

    const address = await client.wallet.getNewAddress()
    const masternode = await client.masternode.createMasternode(address)

    await container.generate(1)

    const masternodesAfter = await client.masternode.listMasternodes()
    const masternodesLengthAfter = Object.keys(masternodesAfter).length

    expect(masternodesLengthAfter).toStrictEqual(masternodesLengthBefore + 1)
    expect(typeof masternode).toStrictEqual('string')

    for (const masternode in masternodesAfter) {
      const createdMasternode = masternodesAfter[masternode]
      if (createdMasternode.ownerAuthAddress === address) {
        expect(typeof createdMasternode.ownerAuthAddress).toStrictEqual('string')
        expect(typeof createdMasternode.operatorAuthAddress).toStrictEqual('string')
        expect(typeof createdMasternode.creationHeight).toStrictEqual('number')
        expect(typeof createdMasternode.resignHeight).toStrictEqual('number')
        expect(typeof createdMasternode.resignTx).toStrictEqual('string')
        expect(typeof createdMasternode.banHeight).toStrictEqual('number')
        expect(typeof createdMasternode.banTx).toStrictEqual('string')
        expect(createdMasternode.state).toStrictEqual(MasternodeState.PRE_ENABLED)
        expect(typeof createdMasternode.state).toStrictEqual('string')
        expect(typeof createdMasternode.mintedBlocks).toStrictEqual('number')
        expect(typeof createdMasternode.targetMultiplier).toStrictEqual('number')
      }
    }
  })

  it('should create masternode transaction with specified UTXOS to spend', async () => {
    const utxos = await client.wallet.listUnspent()
    const inputs = utxos.map((utxo: { txid: string, vout: number }) => ({ txid: utxo.txid, vout: utxo.vout }))
    const masternodeTransaction = await client.masternode.createMasternode(await client.wallet.getNewAddress(), undefined, { inputs })

    expect(typeof masternodeTransaction).toStrictEqual('string')
  })

  it('should throw an error with invalid owner address', async () => {
    const invalidAddress = 'invalidAddress'
    await expect(client.masternode.createMasternode(invalidAddress)).rejects.toThrow('operatorAddress (invalidAddress) does not refer to a P2PKH or P2WPKH address')
  })
})
