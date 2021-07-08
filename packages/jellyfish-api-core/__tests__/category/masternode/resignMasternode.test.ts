import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasternodeState } from '../../../src/category/masternode'
import { WalletFlag } from '../../../src/category/wallet'
import { RpcApiError } from '../../../src'

describe('Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  // enabled masternodes
  const masternodes: Array<{ id: string, address: string }> = []

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await client.wallet.setWalletFlag(WalletFlag.AVOID_REUSE)

    for (let i = 0; i < 2; i++) {
      const address = await container.getNewAddress()
      const id = await client.masternode.createMasternode(address)
      masternodes.push({ id, address })
    }

    await container.waitForGenerate(2017)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should resignMasternode', async () => {
    const { id, address } = masternodes[0]
    await container.generate(1, address)
    console.log(await client.masternode.listMasternodes())

    const hex = await client.masternode.resignMasternode(id)
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)
    const resignedMasternode = Object.values(await client.masternode.listMasternodes()).filter(mn => mn.ownerAuthAddress === address)

    expect(resignedMasternode.length).toStrictEqual(1)
    for (const masternode of resignedMasternode) {
      expect(masternode.state).toStrictEqual(MasternodeState.PRE_RESIGNED)
      expect(masternode.resignTx).toStrictEqual(hex)
    }
  })

  it('should resignMasternode with utxos', async () => {
    const { id, address } = masternodes[1]
    await container.generate(1, address)

    const input = await container.fundAddress(address, 10)
    const hex = await client.masternode.resignMasternode(id, [input])
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)
    const resignedMasternode = Object.values(await client.masternode.listMasternodes()).filter(mn => mn.ownerAuthAddress === address)

    expect(resignedMasternode.length).toStrictEqual(1)
    for (const masternode of resignedMasternode) {
      expect(masternode.state).toStrictEqual(MasternodeState.PRE_RESIGNED)
      expect(masternode.resignTx).toStrictEqual(hex)
    }
  })

  it('should throw an error with invalid masternode id', async () => {
    const invalidMasternodeId = 'b3efcc1bf6cb77c465d7f5686a55f967e73b1a048a3716fdbffa523e22b66frb'
    const promise = client.masternode.resignMasternode(invalidMasternodeId)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`The masternode ${invalidMasternodeId} does not exist`)
  })

  it('should not resignMasternode with arbitrary utxos', async () => {
    const ownerAddress = await container.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress)
    const { txid, vout } = await container.fundAddress(await container.getNewAddress(), 10)

    await container.generate(1)

    const promise = client.masternode.resignMasternode(masternodeId, [{ txid, vout }])

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ResignMasternodeTx execution failed:\n' + 'tx must have at least one input from the owner\', code: -32600, method: resignmasternode')
  })
})
