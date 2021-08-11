import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasternodeState, MasternodeTimeLock } from '../../../src/category/masternode'
import { AddressType } from '../../../src/category/wallet'
import { RpcApiError } from '@defichain/jellyfish-api-core'

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

  it('should createMasternode with bech32 address', async () => {
    const balance = await container.call('getbalance')
    expect(balance >= 2).toBeTruthy()

    const masternodesLengthBefore = Object.keys(await client.masternode.listMasternodes()).length

    const ownerAddress = await client.wallet.getNewAddress()
    const hex = await client.masternode.createMasternode(ownerAddress)

    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    const masternodesAfter = await client.masternode.listMasternodes()
    const masternodesLengthAfter = Object.keys(masternodesAfter).length
    expect(masternodesLengthAfter).toStrictEqual(masternodesLengthBefore + 1)

    const mn = Object.values(masternodesAfter).find(mn => mn.ownerAuthAddress === ownerAddress)
    if (mn === undefined) {
      throw new Error('should not reach here')
    }
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
  })

  it('should createMasternode with operator bech32 address', async () => {
    const balance = await container.call('getbalance')
    expect(balance >= 2).toBeTruthy()

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

    const mn = Object.values(masternodesAfter).find(mn => mn.ownerAuthAddress === ownerAddress)
    if (mn === undefined) {
      throw new Error('should not reach here')
    }
    expect(mn.ownerAuthAddress).toStrictEqual(ownerAddress)
    expect(mn.operatorAuthAddress).toStrictEqual(operatorAddress)
  })

  it('should createMasternode with timeLock', async () => {
    const balance = await container.call('getbalance')
    expect(balance >= 2).toBeTruthy()

    const masternodesLengthBefore = Object.keys(await client.masternode.listMasternodes()).length

    const ownerAddress = await client.wallet.getNewAddress()
    const hex = await client.masternode.createMasternode(
      ownerAddress, '', { utxos: [], timeLock: MasternodeTimeLock.FIVE_YEAR }
    )
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    const masternodesAfter = await client.masternode.listMasternodes()
    const masternodesLengthAfter = Object.keys(masternodesAfter).length
    expect(masternodesLengthAfter).toStrictEqual(masternodesLengthBefore + 1)

    const mn = Object.values(masternodesAfter).find(mn => mn.ownerAuthAddress === ownerAddress)
    if (mn === undefined) {
      throw new Error('should not reach here')
    }
    expect(mn.ownerAuthAddress).toStrictEqual(ownerAddress)
    expect(mn.operatorAuthAddress).toStrictEqual(ownerAddress)
    expect(mn.timeLock).toStrictEqual('5 years')
  })

  it('should createMasternode with utxos', async () => {
    const balance = await container.call('getbalance')
    expect(balance >= 2).toBeTruthy()

    const ownerAddress = await client.wallet.getNewAddress()
    await container.fundAddress(ownerAddress, 10)
    const utxos = await container.call('listunspent')
    const utxo = utxos.find((utxo: any) => utxo.address === ownerAddress)

    const txid = await client.masternode.createMasternode(
      ownerAddress, ownerAddress, { utxos: [{ txid: utxo.txid, vout: utxo.vout }] }
    )
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)

    await container.generate(1)

    const rawtx = await container.call('getrawtransaction', [txid, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
  })

  it('should createMasternode with legacy address', async () => {
    const balance = await container.call('getbalance')
    expect(balance >= 2).toBeTruthy()

    const masternodesLengthBefore = Object.keys(await client.masternode.listMasternodes()).length

    const ownerAddress = await client.wallet.getNewAddress('', AddressType.LEGACY)

    const hex = await client.masternode.createMasternode(ownerAddress)
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    const masternodesAfter = await client.masternode.listMasternodes()
    const masternodesLengthAfter = Object.keys(masternodesAfter).length
    expect(masternodesLengthAfter).toStrictEqual(masternodesLengthBefore + 1)

    const mn = Object.values(masternodesAfter).find(mn => mn.ownerAuthAddress === ownerAddress)
    if (mn === undefined) {
      throw new Error('should not reach here')
    }
    expect(mn.ownerAuthAddress).toStrictEqual(ownerAddress)
  })

  it('should be failed as p2sh address is not allowed', async () => {
    const ownerAddress = await client.wallet.getNewAddress('', AddressType.P2SH_SEGWIT)

    const promise = client.masternode.createMasternode(ownerAddress)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`operatorAddress (${ownerAddress}) does not refer to a P2PKH or P2WPKH address`)
  })

  it('should be failed as invalid address is not allowed', async () => {
    const invalidAddress = 'INVALID_ADDRESS'
    const promise = client.masternode.createMasternode(invalidAddress)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`operatorAddress (${invalidAddress}) does not refer to a P2PKH or P2WPKH address`)
  })

  it('should be failed as min 2 DFI (regtest) is needed', async () => {
    expect.assertions(2)

    const balanceBefore = await container.call('getbalance')

    await client.wallet.sendToAddress('bcrt1ql0ys2ahu4e9uhjn2l0mehhh4e0mmh7npyhx0re', balanceBefore - 1)

    const balanceAfter = await container.call('getbalance')
    expect(balanceAfter < 2).toBeTruthy()

    const ownerAddress = await client.wallet.getNewAddress('', AddressType.LEGACY)

    try {
      await client.masternode.createMasternode(ownerAddress)
    } catch (err) {
      expect(err.message).toStrictEqual('RpcApiError: \'Insufficient funds\', code: -4, method: createmasternode')
    }
  })
})
