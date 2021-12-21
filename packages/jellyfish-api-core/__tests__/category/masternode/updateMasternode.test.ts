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

  it('should update masternode', async () => {
    const oldAddress = await testing.container.getNewAddress('', 'legacy')
    const masternodeId = await testing.rpc.masternode.createMasternode(oldAddress)
    await testing.container.generate(1)

    await testing.container.setDeFiConf([`masternode_operator=${oldAddress}`])
    await testing.container.restart()

    await testing.container.generate(20)

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
    const masternodeId = await testing.rpc.masternode.createMasternode(oldAddress)
    await testing.container.generate(1)

    await testing.container.setDeFiConf([`masternode_operator=${oldAddress}`])
    await testing.container.restart()

    await testing.container.generate(20)

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

    const newOwnerAddress = await testing.generateAddress()
    const newOwnerAddress2 = await testing.generateAddress()
    await container.fundAddress(newOwnerAddress, 10)
    console.log(newOwnerAddress)
    const utxos = await testing.rpc.wallet.listUnspent(undefined, undefined, { addresses: [newOwnerAddress] })
    console.log(utxos)

    const updateOption: UpdateMasternodeOptions = {
      ownerAddress: newOwnerAddress2
      // operatorAddress: newAddressOperator,
      // rewardAddress: newRewardAddress
    }

    // const hash = await testing.rpc.masternode.updateMasternode(masternodeId, updateOption)
    const hash = await testing.rpc.masternode.updateMasternode(masternodeId, updateOption, utxos)
    console.log(hash)
    await testing.container.generate(1)

    // operator address and reward address will be updated during state: transferring.
    // owner address will be updated only when state is Enabled
    // localMasternode is false when owner address is not the same as operator address
    const masterNodeInfoTransferring = await testing.rpc.masternode.getMasternode(masternodeId)
    console.log(masterNodeInfoTransferring)

    await testing.container.generate(40)
    const masterNodeInfoPreEnabled = await testing.rpc.masternode.getMasternode(masternodeId)
    console.log(masterNodeInfoPreEnabled)

    await testing.container.generate(20)
    const masterNodeInfoEnabled = await testing.rpc.masternode.getMasternode(masternodeId)
    console.log(masterNodeInfoEnabled)
  })

  it('should not update masternode with UTXO when address does not have auth', async () => {
    const oldAddress = await testing.container.getNewAddress('', 'legacy')
    const masternodeId = await testing.rpc.masternode.createMasternode(oldAddress)
    await testing.container.generate(1)

    await testing.container.setDeFiConf([`masternode_operator=${oldAddress}`])
    await testing.container.restart()

    await testing.container.generate(20)

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

    const newOwnerAddress = await testing.generateAddress()
    const unauthOwnerAddress = await testing.generateAddress()
    await container.fundAddress(newOwnerAddress, 10)
    console.log(newOwnerAddress)
    const utxos = await testing.rpc.wallet.listUnspent(undefined, undefined, { addresses: [newOwnerAddress] })
    console.log(utxos)

    const updateOption: UpdateMasternodeOptions = {
      ownerAddress: unauthOwnerAddress
      // operatorAddress: newAddressOperator,
      // rewardAddress: newRewardAddress
    }

    // const hash = await testing.rpc.masternode.updateMasternode(masternodeId, updateOption)
    const hash = await testing.rpc.masternode.updateMasternode(masternodeId, updateOption, utxos)
    console.log(hash)
    await testing.container.generate(1)

    // operator address and reward address will be updated during state: transferring.
    // owner address will be updated only when state is Enabled
    // localMasternode is false when owner address is not the same as operator address
    const masterNodeInfoTransferring = await testing.rpc.masternode.getMasternode(masternodeId)
    console.log(masterNodeInfoTransferring)

    await testing.container.generate(40)
    const masterNodeInfoPreEnabled = await testing.rpc.masternode.getMasternode(masternodeId)
    console.log(masterNodeInfoPreEnabled)

    await testing.container.generate(20)
    const masterNodeInfoEnabled = await testing.rpc.masternode.getMasternode(masternodeId)
    console.log(masterNodeInfoEnabled)
  })
})
