import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { AddressType } from '../../../src/category/wallet'
import { RpcApiError } from '@defichain/jellyfish-api-core'

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

  it('should updateMasternode with bech32 address', async () => {
    const ownerAddress1 = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress1)

    await container.generate(20)

    const masternodesBefore = await client.masternode.listMasternodes()
    const masternodesLengthBefore = Object.keys(masternodesBefore).length

    const ownerAddress2 = await client.wallet.getNewAddress()
    await client.masternode.updateMasternode(masternodeId, {
      ownerAddress: ownerAddress2
    })

    await container.generate(70)

    const masternodesAfter = await client.masternode.listMasternodes()
    const masternodesLengthAfter = Object.keys(masternodesAfter).length
    expect(masternodesLengthAfter).toStrictEqual(masternodesLengthBefore)

    const mn = masternodesAfter[masternodeId]
    if (mn === undefined) {
      throw new Error('should not reach here')
    }

    expect(mn).toStrictEqual({
      operatorAuthAddress: ownerAddress1,
      ownerAuthAddress: ownerAddress2,
      creationHeight: expect.any(Number),
      resignHeight: expect.any(Number),
      resignTx: expect.any(String),
      collateralTx: expect.any(String),
      rewardAddress: expect.any(String),
      state: expect.any(String),
      mintedBlocks: expect.any(Number),
      ownerIsMine: expect.any(Boolean),
      localMasternode: expect.any(Boolean),
      operatorIsMine: expect.any(Boolean),
      targetMultipliers: expect.any(Object)
    })
  })

  it('should updateMasternode with legacy address', async () => {
    const ownerAddress1 = await client.wallet.getNewAddress('', AddressType.LEGACY)
    const masternodeId = await client.masternode.createMasternode(ownerAddress1)

    await container.generate(20)

    const masternodesBefore = await client.masternode.listMasternodes()
    const masternodesLengthBefore = Object.keys(masternodesBefore).length

    const ownerAddress2 = await client.wallet.getNewAddress('', AddressType.LEGACY)
    await client.masternode.updateMasternode(masternodeId, {
      ownerAddress: ownerAddress2
    })

    await container.generate(70)

    const masternodesAfter = await client.masternode.listMasternodes()
    const masternodesLengthAfter = Object.keys(masternodesAfter).length
    expect(masternodesLengthAfter).toStrictEqual(masternodesLengthBefore)

    const mn = masternodesAfter[masternodeId]
    if (mn === undefined) {
      throw new Error('should not reach here')
    }

    expect(mn).toStrictEqual({
      operatorAuthAddress: ownerAddress1,
      ownerAuthAddress: ownerAddress2,
      creationHeight: expect.any(Number),
      resignHeight: expect.any(Number),
      resignTx: expect.any(String),
      collateralTx: expect.any(String),
      rewardAddress: expect.any(String),
      state: expect.any(String),
      mintedBlocks: expect.any(Number),
      ownerIsMine: expect.any(Boolean),
      localMasternode: expect.any(Boolean),
      operatorIsMine: expect.any(Boolean),
      targetMultipliers: expect.any(Object)
    })
  })

  it('should updateMasternode with utxos', async () => {
    const balance = await container.call('getbalance')
    expect(balance >= 2).toBeTruthy()

    const ownerAddress1 = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress1)

    await container.generate(20)

    const ownerAddress2 = await client.wallet.getNewAddress()
    await container.fundAddress(ownerAddress2, 10)

    await container.generate(1)

    const utxos = await container.call('listunspent')
    const utxo = utxos.find((utxo: { address: string }) => utxo.address === ownerAddress2)

    const updateTxId = await client.masternode.updateMasternode(
      masternodeId,
      { ownerAddress: ownerAddress2 },
      [{ txid: utxo.txid, vout: utxo.vout }]
    )

    await container.generate(1)

    const rawtx = await container.call('getrawtransaction', [updateTxId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
  })

  it('should be failed as p2sh address is not allowed', async () => {
    const ownerAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress)

    await container.generate(1)

    {
      const ownerAddressNew = await client.wallet.getNewAddress('', AddressType.P2SH_SEGWIT)
      const promise = client.masternode.updateMasternode(masternodeId, {
        ownerAddress: ownerAddressNew
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`ownerAddress (${ownerAddressNew}) does not refer to a P2PKH or P2WPKH address`)
    }

    {
      const operatorAddress = await client.wallet.getNewAddress('', AddressType.P2SH_SEGWIT)
      const promise = client.masternode.updateMasternode(masternodeId, {
        operatorAddress
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`operatorAddress (${operatorAddress}) does not refer to a P2PKH or P2WPKH address`)
    }

    {
      const rewardAddress = await client.wallet.getNewAddress('', AddressType.P2SH_SEGWIT)
      const promise = client.masternode.updateMasternode(masternodeId, {
        rewardAddress
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`rewardAddress (${rewardAddress}) does not refer to a P2PKH or P2WPKH address`)
    }
  })
})
