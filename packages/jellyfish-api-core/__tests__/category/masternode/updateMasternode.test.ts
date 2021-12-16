import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { UpdateMasternodeOptions } from 'packages/jellyfish-api-core/src/category/masternode'

describe('Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    // await testing.generate(10000000)
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
    console.log(oldMasterNodeInfo)

    const newAddress = await testing.container.getNewAddress('', 'legacy')
    const newAddressOperator = await testing.container.getNewAddress('', 'legacy')
    const newRewardAddress = await testing.container.getNewAddress('', 'legacy')
    // const testAddr = await testing.generateAddress()
    const updateOption: UpdateMasternodeOptions = {
      ownerAddress: newAddress,
      operatorAddress: newAddressOperator,
      rewardAddress: newRewardAddress
    }

    const hash = await testing.rpc.masternode.updateMasternode(masternodeId, updateOption)
    console.log(hash)
    await testing.container.generate(1)

    const masterNodeInfoTransferring = await testing.rpc.masternode.getMasternode(masternodeId)
    console.log(masterNodeInfoTransferring)
    // expect(masterNodeInfoTransferring).toStrictEqual({
    //   [masternodeId]: {
    //     ownerAuthAddress: oldAddress,
    //     operatorAuthAddress: oldAddress,
    //     rewardAddress: '',
    //     creationHeight: 102,
    //     resignHeight: -1,
    //     resignTx: '0000000000000000000000000000000000000000000000000000000000000000',
    //     collateralTx: hash,
    //     state: 'TRANSFERRING',
    //     mintedBlocks: 0,
    //     ownerIsMine: true,
    //     operatorIsMine: true,
    //     localMasternode: true
    //   }
    // })

    await testing.container.generate(40)
    const masterNodeInfoPreEnabled = await testing.rpc.masternode.getMasternode(masternodeId)
    console.log(masterNodeInfoPreEnabled)
    // expect(masterNodeInfoPreEnabled).toStrictEqual({
    //   [masternodeId]: {
    //     ownerAuthAddress: newAddress,
    //     operatorAuthAddress: oldAddress,
    //     rewardAddress: '',
    //     creationHeight: 102,
    //     resignHeight: -1,
    //     resignTx: '0000000000000000000000000000000000000000000000000000000000000000',
    //     collateralTx: hash,
    //     state: 'PRE_ENABLED',
    //     mintedBlocks: 0,
    //     ownerIsMine: true,
    //     operatorIsMine: true,
    //     localMasternode: true
    //   }
    // })

    await testing.container.generate(20)
    const masterNodeInfoEnabled = await testing.rpc.masternode.getMasternode(masternodeId)
    console.log(masterNodeInfoEnabled)
    // expect(masterNodeInfoEnabled).toStrictEqual({
    //   [masternodeId]: {
    //     ownerAuthAddress: newAddress,
    //     operatorAuthAddress: oldAddress,
    //     rewardAddress: '',
    //     creationHeight: 102,
    //     resignHeight: -1,
    //     resignTx: '0000000000000000000000000000000000000000000000000000000000000000',
    //     collateralTx: hash,
    //     state: 'ENABLED',
    //     mintedBlocks: 0,
    //     ownerIsMine: true,
    //     operatorIsMine: true,
    //     localMasternode: true,
    //     targetMultipliers: [1, 1]
    //   }
    // })
  })
})
