import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { UpdateMasternodeOptions } from 'packages/jellyfish-api-core/src/category/masternode'

describe('Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  async function createMasternode (testing: Testing, ownerAddress: string): Promise<string> {
    const masternodeId = await testing.rpc.masternode.createMasternode(ownerAddress)
    await testing.container.generate(1)

    await testing.container.setDeFiConf([`masternode_operator=${ownerAddress}`])
    await testing.container.restart()

    await testing.container.generate(20)
    return masternodeId
  }

  it('should update masternode', async () => {
    const oldAddress = await testing.container.getNewAddress('', 'legacy')
    const masternodeId = await createMasternode(testing, oldAddress)

    const oldMasterNodeInfo = await testing.rpc.masternode.getMasternode(masternodeId)
    expect(oldMasterNodeInfo).toStrictEqual({
      [masternodeId]: {
        ownerAuthAddress: oldAddress,
        operatorAuthAddress: oldAddress,
        rewardAddress: '',
        creationHeight: 102,
        resignHeight: -1,
        resignTx: '0000000000000000000000000000000000000000000000000000000000000000',
        collateralTx: '0000000000000000000000000000000000000000000000000000000000000000',
        state: 'ENABLED',
        mintedBlocks: 0,
        ownerIsMine: true,
        operatorIsMine: true,
        localMasternode: true,
        targetMultipliers: [1, 1]
      }
    })

    const newAddress = await testing.container.getNewAddress('', 'legacy')
    const newAddressOperator = await testing.container.getNewAddress('', 'legacy')
    const newRewardAddress = await testing.container.getNewAddress('', 'legacy')
    const updateOption: UpdateMasternodeOptions = {
      ownerAddress: newAddress,
      operatorAddress: newAddressOperator,
      rewardAddress: newRewardAddress
    }

    const hash = await testing.rpc.masternode.updateMasternode(masternodeId, updateOption)
    await testing.container.generate(1)

    // operator address and reward address will be updated during state: transferring.
    // owner address will be updated only when state is PRE_ENABLED
    // localMasternode is false when owner address is not the same as operator address
    const masterNodeInfoTransferring = await testing.rpc.masternode.getMasternode(masternodeId)
    expect(masterNodeInfoTransferring).toStrictEqual({
      [masternodeId]: {
        ownerAuthAddress: oldAddress,
        operatorAuthAddress: newAddressOperator,
        rewardAddress: newRewardAddress,
        creationHeight: 102,
        resignHeight: -1,
        resignTx: '0000000000000000000000000000000000000000000000000000000000000000',
        collateralTx: hash,
        state: 'TRANSFERRING',
        mintedBlocks: 0,
        ownerIsMine: true,
        operatorIsMine: true,
        localMasternode: false
      }
    })

    await testing.container.generate(40)
    const masterNodeInfoPreEnabled = await testing.rpc.masternode.getMasternode(masternodeId)
    expect(masterNodeInfoPreEnabled).toStrictEqual({
      [masternodeId]: {
        ownerAuthAddress: newAddress,
        operatorAuthAddress: newAddressOperator,
        rewardAddress: newRewardAddress,
        creationHeight: 102,
        resignHeight: -1,
        resignTx: '0000000000000000000000000000000000000000000000000000000000000000',
        collateralTx: hash,
        state: 'PRE_ENABLED',
        mintedBlocks: 0,
        ownerIsMine: true,
        operatorIsMine: true,
        localMasternode: false
      }
    })

    await testing.container.generate(20)
    const masterNodeInfoEnabled = await testing.rpc.masternode.getMasternode(masternodeId)
    expect(masterNodeInfoEnabled).toStrictEqual({
      [masternodeId]: {
        ownerAuthAddress: newAddress,
        operatorAuthAddress: newAddressOperator,
        rewardAddress: newRewardAddress,
        creationHeight: 102,
        resignHeight: -1,
        resignTx: '0000000000000000000000000000000000000000000000000000000000000000',
        collateralTx: hash,
        state: 'ENABLED',
        mintedBlocks: 0,
        ownerIsMine: true,
        operatorIsMine: true,
        localMasternode: false,
        targetMultipliers: [1, 1]
      }
    })
  })

  it('should update masternode with UTXO', async () => {
    const oldAddress = await testing.container.getNewAddress('', 'legacy')
    const masternodeId = await createMasternode(testing, oldAddress)

    const oldMasterNodeInfo = await testing.rpc.masternode.getMasternode(masternodeId)
    expect(oldMasterNodeInfo).toStrictEqual({
      [masternodeId]: {
        ownerAuthAddress: oldAddress,
        operatorAuthAddress: oldAddress,
        rewardAddress: '',
        creationHeight: 184,
        resignHeight: -1,
        resignTx: '0000000000000000000000000000000000000000000000000000000000000000',
        collateralTx: '0000000000000000000000000000000000000000000000000000000000000000',
        state: 'ENABLED',
        mintedBlocks: 0,
        ownerIsMine: true,
        operatorIsMine: true,
        localMasternode: true,
        targetMultipliers: [1, 1]
      }
    })

    const newOwnerAddress = await testing.generateAddress()
    await container.fundAddress(newOwnerAddress, 10)
    const utxos = await testing.rpc.wallet.listUnspent(undefined, undefined, { addresses: [newOwnerAddress] })

    const updateOption: UpdateMasternodeOptions = {
      ownerAddress: newOwnerAddress
    }

    const hash = await testing.rpc.masternode.updateMasternode(masternodeId, updateOption, utxos)
    await testing.container.generate(1)

    const masterNodeInfoTransferring = await testing.rpc.masternode.getMasternode(masternodeId)
    expect(masterNodeInfoTransferring).toStrictEqual({
      [masternodeId]: {
        ownerAuthAddress: oldAddress,
        operatorAuthAddress: oldAddress,
        rewardAddress: '',
        creationHeight: 184,
        resignHeight: -1,
        resignTx: '0000000000000000000000000000000000000000000000000000000000000000',
        collateralTx: hash,
        state: 'TRANSFERRING',
        mintedBlocks: 0,
        ownerIsMine: true,
        operatorIsMine: true,
        localMasternode: true
      }
    })

    await testing.container.generate(40)
    const masterNodeInfoPreEnabled = await testing.rpc.masternode.getMasternode(masternodeId)
    expect(masterNodeInfoPreEnabled).toStrictEqual({
      [masternodeId]: {
        ownerAuthAddress: newOwnerAddress,
        operatorAuthAddress: oldAddress,
        rewardAddress: '',
        creationHeight: 184,
        resignHeight: -1,
        resignTx: '0000000000000000000000000000000000000000000000000000000000000000',
        collateralTx: hash,
        state: 'PRE_ENABLED',
        mintedBlocks: 0,
        ownerIsMine: true,
        operatorIsMine: true,
        localMasternode: true
      }
    })

    await testing.container.generate(20)
    const masterNodeInfoEnabled = await testing.rpc.masternode.getMasternode(masternodeId)
    expect(masterNodeInfoEnabled).toStrictEqual({
      [masternodeId]: {
        ownerAuthAddress: newOwnerAddress,
        operatorAuthAddress: oldAddress,
        rewardAddress: '',
        creationHeight: 184,
        resignHeight: -1,
        resignTx: '0000000000000000000000000000000000000000000000000000000000000000',
        collateralTx: hash,
        state: 'ENABLED',
        mintedBlocks: 0,
        ownerIsMine: true,
        operatorIsMine: true,
        localMasternode: true,
        targetMultipliers: [1, 1]
      }
    })
  })

  it('should fail if masternodeid is not valid', async () => {
    const invalidMasterNodeId = 'invalidId'
    const updateOption: UpdateMasternodeOptions = {
      ownerAddress: await testing.container.getNewAddress()
    }
    await expect(testing.rpc.masternode.updateMasternode(invalidMasterNodeId, updateOption)).rejects.toThrow(`RpcApiError: 'The masternode ${invalidMasterNodeId} does not exist', code: -8, method: updatemasternode`)
  })

  it('should fail if update option is empty', async () => {
    const oldAddress = await testing.container.getNewAddress('', 'legacy')
    const masternodeId = await createMasternode(testing, oldAddress)

    await expect(testing.rpc.masternode.updateMasternode(masternodeId, {})).rejects.toThrow('No update arguments provided')
  })

  it('should fail if either owner address, operator address or reward address are invalid P2PKH or P2WPKH address', async () => {
    const oldAddress = await testing.container.getNewAddress('', 'legacy')
    const masternodeId = await createMasternode(testing, oldAddress)

    const invalidAddress = 'invalidAddress'
    const updateOption: UpdateMasternodeOptions = {
      ownerAddress: invalidAddress,
      operatorAddress: await testing.container.getNewAddress(),
      rewardAddress: await testing.container.getNewAddress()
    }
    await expect(testing.rpc.masternode.updateMasternode(masternodeId, updateOption)).rejects.toThrow(`ownerAddress (${invalidAddress}) does not refer to a P2PKH or P2WPKH address`)

    updateOption.ownerAddress = await testing.container.getNewAddress()
    updateOption.operatorAddress = invalidAddress
    await expect(testing.rpc.masternode.updateMasternode(masternodeId, updateOption)).rejects.toThrow(`operatorAddress (${invalidAddress}) does not refer to a P2PKH or P2WPKH address`)

    updateOption.operatorAddress = await testing.container.getNewAddress()
    updateOption.rewardAddress = invalidAddress
    await expect(testing.rpc.masternode.updateMasternode(masternodeId, updateOption)).rejects.toThrow(`rewardAddress (${invalidAddress}) does not refer to a P2PKH or P2WPKH address`)
  })

  it('should fail to update when masternode status is not ENABLED', async () => {
    const oldAddress = await testing.container.getNewAddress('', 'legacy')
    const masternodeId = await createMasternode(testing, oldAddress)

    const newAddress = await testing.container.getNewAddress('', 'legacy')
    const updateOption: UpdateMasternodeOptions = {
      ownerAddress: newAddress
    }

    await testing.rpc.masternode.updateMasternode(masternodeId, updateOption)
    await testing.container.generate(1)

    const masterNodeInfoTransferring = await testing.rpc.masternode.getMasternode(masternodeId)
    expect(masterNodeInfoTransferring[masternodeId].state).toEqual('TRANSFERRING')

    const newAddressTransferring = await testing.container.getNewAddress('', 'legacy')
    const updateOptionTransferring: UpdateMasternodeOptions = {
      ownerAddress: newAddressTransferring
    }

    await expect(testing.rpc.masternode.updateMasternode(masternodeId, updateOptionTransferring)).rejects.toThrow(`Masternode ${masternodeId} is not in 'ENABLED' state`)
  })

  it('should fail to update masternode with UTXO when UTXO does not belong to new owner address', async () => {
    const oldAddress = await testing.container.getNewAddress('', 'legacy')
    const masternodeId = await createMasternode(testing, oldAddress)

    const newOwnerAddress = await testing.generateAddress()
    const unauthOwnerAddress = await testing.generateAddress()
    await container.fundAddress(newOwnerAddress, 10)
    const utxos = await testing.rpc.wallet.listUnspent(undefined, undefined, { addresses: [newOwnerAddress] })

    const updateOption: UpdateMasternodeOptions = {
      ownerAddress: unauthOwnerAddress
    }

    await expect(testing.rpc.masternode.updateMasternode(masternodeId, updateOption, utxos)).rejects.toThrow('Missing auth input for new masternode owner')
    await testing.container.generate(1)
  })

  it('should fail if owner address or operator address already belongs to a masternode', async () => {
    const masternodeOwnerAddress = await testing.container.getNewAddress('', 'legacy')
    const masternodeId = await createMasternode(testing, masternodeOwnerAddress)

    // create a second masternode with another address. this address will be used to try to update the first masternode
    const duplicateAddress = await testing.container.getNewAddress('', 'legacy')
    const masterNodeIdDuplicateAddrId = await createMasternode(testing, duplicateAddress)

    const masterNodeInfo = await testing.rpc.masternode.getMasternode(masternodeId)
    expect(masterNodeInfo[masternodeId].state).toEqual('ENABLED')

    const duplicateAddressNodeInfo = await testing.rpc.masternode.getMasternode(masterNodeIdDuplicateAddrId)
    expect(duplicateAddressNodeInfo[masterNodeIdDuplicateAddrId].state).toEqual('ENABLED')

    // update for duplicate owneraddress
    const duplicateOwnerUpdateOption: UpdateMasternodeOptions = {
      ownerAddress: duplicateAddress
    }
    await expect(testing.rpc.masternode.updateMasternode(masternodeId, duplicateOwnerUpdateOption)).rejects.toThrow('RpcApiError: \'Test UpdateMasternodeTx execution failed:\nMasternode with that owner address already exists\', code: -32600, method: updatemasternode')

    // update for duplicate operator address
    const duplicateOperatorUpdateOption: UpdateMasternodeOptions = {
      operatorAddress: duplicateAddress
    }
    await expect(testing.rpc.masternode.updateMasternode(masternodeId, duplicateOperatorUpdateOption)).rejects.toThrow('RpcApiError: \'Test UpdateMasternodeTx execution failed:\nMasternode with that operator address already exists\', code: -32600, method: updatemasternode')
  })
})
