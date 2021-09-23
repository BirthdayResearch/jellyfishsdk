import { ContainerGroup, DeFiDRpcError, GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
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

  it('should createMasternode with timelock', async () => {
    const balance = await container.call('getbalance')
    expect(balance >= 2).toBeTruthy()

    const masternodesLengthBefore = Object.keys(await client.masternode.listMasternodes()).length

    const ownerAddress = await client.wallet.getNewAddress()
    const hex = await client.masternode.createMasternode(
      ownerAddress, '', { utxos: [], timelock: MasternodeTimeLock.FIVE_YEAR }
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
    expect(mn.timelock).toStrictEqual('5 years')
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

  it('should be failed as collateral locked in mempool', async () => {
    const ownerAddress = await client.wallet.getNewAddress('', AddressType.LEGACY)
    const nodeId = await client.masternode.createMasternode(ownerAddress)

    const rawTx = await client.rawtx.getRawTransaction(nodeId, true)

    const spendTx = await container.call('createrawtransaction', [
      [{ txid: nodeId, vout: 1 }],
      [{ [ownerAddress]: 1 }]
    ])

    const signedTx = await container.call('signrawtransactionwithwallet', [spendTx])
    expect(signedTx.complete).toBeTruthy()

    const promise = container.call('sendrawtransaction', [signedTx.hex])
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`collateral-locked-in-mempool, tried to spend collateral of non-created mn or token ${rawTx.txid}, cheater?`)
  })

  it('should be failed as collateral locked', async () => {
    const ownerAddress = await client.wallet.getNewAddress('', AddressType.LEGACY)
    const nodeId = await client.masternode.createMasternode(ownerAddress)
    await container.generate(1)

    const rawTx = await client.rawtx.getRawTransaction(nodeId, true)

    const spendTx = await container.call('createrawtransaction', [
      [{ txid: nodeId, vout: 1 }],
      [{ [ownerAddress]: 1 }]
    ])

    const signedTx = await container.call('signrawtransactionwithwallet', [spendTx])
    expect(signedTx.complete).toBeTruthy()

    const promise = container.call('sendrawtransaction', [signedTx.hex])
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`bad-txns-collateral-locked, tried to spend locked collateral for ${rawTx.txid}`)
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
    const balanceBefore = await container.call('getbalance')

    await client.wallet.sendToAddress('bcrt1ql0ys2ahu4e9uhjn2l0mehhh4e0mmh7npyhx0re', balanceBefore - 1)

    const balanceAfter = await container.call('getbalance')
    expect(balanceAfter < 2).toBeTruthy()

    const ownerAddress = await client.wallet.getNewAddress('', AddressType.LEGACY)

    const promise = client.masternode.createMasternode(ownerAddress)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: createmasternode')
  })
})

describe('Multinodes masternodes', () => {
  const group = new ContainerGroup([
    new MasterNodeRegTestContainer(GenesisKeys[0]),
    new MasterNodeRegTestContainer(GenesisKeys[1])
  ])

  const clientA = new ContainerAdapterClient(group.get(0))
  const clientB = new ContainerAdapterClient(group.get(1))

  beforeAll(async () => {
    await group.start()
    await group.get(0).waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await group.stop()
  })

  it('should be failed as address is not owned by the wallet', async () => {
    const collateral1 = await group.get(1).getNewAddress()

    const promise = clientA.masternode.createMasternode(collateral1)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Address (${collateral1}) is not owned by the wallet`)
  })

  // timelock 10 -> 4, 5 -> 3, 0 -> 2
  it('should createMasternode targetMultiplier checker', async () => {
    const addrA0 = await clientA.wallet.getNewAddress('mnA0', AddressType.LEGACY)
    const mnIdA0 = await clientA.masternode.createMasternode(addrA0)
    await group.waitForMempoolSync(mnIdA0)

    const addrA5 = await clientA.wallet.getNewAddress('mnA5', AddressType.LEGACY)
    const mnIdA5 = await clientA.masternode.createMasternode(addrA5, '', { utxos: [], timelock: MasternodeTimeLock.FIVE_YEAR })
    await group.waitForMempoolSync(mnIdA5)

    const addrA10 = await clientA.wallet.getNewAddress('mnA10', AddressType.LEGACY)
    const mnIdA10 = await clientA.masternode.createMasternode(addrA10, '', { utxos: [], timelock: MasternodeTimeLock.TEN_YEAR })
    await group.waitForMempoolSync(mnIdA10)

    const addrB0 = await clientB.wallet.getNewAddress('mnB0', AddressType.LEGACY)
    const mnIdB0 = await clientB.masternode.createMasternode(addrB0)
    await group.waitForMempoolSync(mnIdB0)

    {
      await group.get(0).generate(1)
      await group.get(1).generate(1)
      await group.waitForSync()

      const mnA0 = (await clientA.masternode.getMasternode(mnIdA0))[mnIdA0]
      expect(mnA0.targetMultipliers).toStrictEqual(undefined)

      const mnA5 = (await clientA.masternode.getMasternode(mnIdA5))[mnIdA5]
      expect(mnA5.targetMultipliers).toStrictEqual(undefined)

      const mnA10 = (await clientA.masternode.getMasternode(mnIdA10))[mnIdA10]
      expect(mnA10.targetMultipliers).toStrictEqual(undefined)

      const mnB0 = (await clientB.masternode.getMasternode(mnIdB0))[mnIdB0]
      expect(mnB0.targetMultipliers).toStrictEqual(undefined)
    }

    {
      await group.get(0).generate(20)
      await group.get(1).generate(20)
      await group.waitForSync()

      const mnA0 = (await clientA.masternode.getMasternode(mnIdA0))[mnIdA0]
      expect(mnA0.targetMultipliers).toStrictEqual([1, 1])

      const mnA5 = (await clientA.masternode.getMasternode(mnIdA5))[mnIdA5]
      expect(mnA5.targetMultipliers).toStrictEqual([1, 1, 1])

      const mnA10 = (await clientA.masternode.getMasternode(mnIdA10))[mnIdA10]
      expect(mnA10.targetMultipliers).toStrictEqual([1, 1, 1, 1])

      const mnB0 = (await clientB.masternode.getMasternode(mnIdB0))[mnIdB0]
      expect(mnB0.targetMultipliers).toStrictEqual([1, 1])
    }

    {
      // time travel a day
      await clientA.misc.setMockTime(Date.now() + 1e3 * 60 * 60 * 24)
      await clientB.misc.setMockTime(Date.now() + 1e3 * 60 * 60 * 24)
      await group.get(0).generate(1)
      await group.get(1).generate(1)
      await group.waitForSync()

      const mnA0 = (await clientA.masternode.getMasternode(mnIdA0))[mnIdA0]
      expect(mnA0.targetMultipliers).toBeDefined()
      expect(mnA0.targetMultipliers?.length).toStrictEqual(2)
      expect(mnA0.targetMultipliers?.every(tm => tm >= 4)).toBeTruthy() // [4, 4]

      const mnA5 = (await clientA.masternode.getMasternode(mnIdA5))[mnIdA5]
      expect(mnA5.targetMultipliers).toBeDefined()
      expect(mnA5.targetMultipliers?.length).toStrictEqual(3)
      expect(mnA5.targetMultipliers?.every(tm => tm >= 4)).toBeTruthy() // [4, 4, 4]

      const mnA10 = (await clientA.masternode.getMasternode(mnIdA10))[mnIdA10]
      expect(mnA10.targetMultipliers).toBeDefined()
      expect(mnA10.targetMultipliers?.length).toStrictEqual(4)
      expect(mnA10.targetMultipliers?.every(tm => tm >= 4)).toBeTruthy() // [4, 4, 4, 4]

      const mnB0 = (await clientB.masternode.getMasternode(mnIdB0))[mnIdB0]
      expect(mnB0.targetMultipliers).toBeDefined()
      expect(mnB0.targetMultipliers?.length).toStrictEqual(2)
      expect(mnB0.targetMultipliers?.every(tm => tm >= 4)).toBeTruthy() // [4, 4]
    }

    {
      // time travel a week
      await clientA.misc.setMockTime(Date.now() + 1e3 * 60 * 60 * 24 * 7)
      await clientB.misc.setMockTime(Date.now() + 1e3 * 60 * 60 * 24 * 7)
      await group.get(0).generate(1)
      await group.get(1).generate(1)
      await group.waitForSync()

      const mnA0 = (await clientA.masternode.getMasternode(mnIdA0))[mnIdA0]
      expect(mnA0.targetMultipliers).toBeDefined()
      expect(mnA0.targetMultipliers?.length).toStrictEqual(2)
      expect(mnA0.targetMultipliers?.every(tm => tm >= 28)).toBeTruthy() // [28, 28]

      const mnA5 = (await clientA.masternode.getMasternode(mnIdA5))[mnIdA5]
      expect(mnA5.targetMultipliers).toBeDefined()
      expect(mnA5.targetMultipliers?.length).toStrictEqual(3)
      expect(mnA5.targetMultipliers?.every(tm => tm >= 28)).toBeTruthy() // [28, 28, 28]

      const mnA10 = (await clientA.masternode.getMasternode(mnIdA10))[mnIdA10]
      expect(mnA10.targetMultipliers).toBeDefined()
      expect(mnA10.targetMultipliers?.length).toStrictEqual(4)
      expect(mnA10.targetMultipliers?.every(tm => tm >= 28)).toBeTruthy() // [28, 28, 28, 28]

      const mnB0 = (await clientB.masternode.getMasternode(mnIdB0))[mnIdB0]
      expect(mnB0.targetMultipliers).toBeDefined()
      expect(mnB0.targetMultipliers?.length).toStrictEqual(2)
      expect(mnB0.targetMultipliers?.every(tm => tm >= 28)).toBeTruthy() // [28, 28]
    }

    {
      // time travel 30 days, max tm - 57
      await clientA.misc.setMockTime(Date.now() + 1e3 * 60 * 60 * 24 * 30)
      await clientB.misc.setMockTime(Date.now() + 1e3 * 60 * 60 * 24 * 30)
      await group.get(0).generate(1)
      await group.get(1).generate(1)
      await group.waitForSync()

      const mnA0 = (await clientA.masternode.getMasternode(mnIdA0))[mnIdA0]
      expect(mnA0.targetMultipliers).toStrictEqual([57, 57])

      const mnA5 = (await clientA.masternode.getMasternode(mnIdA5))[mnIdA5]
      expect(mnA5.targetMultipliers).toStrictEqual([57, 57, 57])

      const mnA10 = (await clientA.masternode.getMasternode(mnIdA10))[mnIdA10]
      expect(mnA10.targetMultipliers).toStrictEqual([57, 57, 57, 57])

      const mnB0 = (await clientB.masternode.getMasternode(mnIdB0))[mnIdB0]
      expect(mnB0.targetMultipliers).toStrictEqual([57, 57])
    }
  })
})
