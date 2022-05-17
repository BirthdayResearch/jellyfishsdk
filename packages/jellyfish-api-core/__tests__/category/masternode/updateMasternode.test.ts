import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { Testing } from '@defichain/jellyfish-testing'

describe('Masternode after great world height', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })
})

describe('Masternode before great world height', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  async function expectGreatWorldHeightError (promise: Promise<string>): Promise<void> {
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Test UpdateMasternodeTx execution failed:\ncalled before GreatWorld height')
  }

  it('should not updateMasternode', async () => {
    const txId = await container.call('createmasternode', [await testing.generateAddress()])
    await testing.generate(1)

    const ownerAddress = await testing.generateAddress()
    const operatorAddress = await testing.generateAddress()
    const rewardAddress = await testing.generateAddress()

    // Block count = 102
    {
      const blockCount = await testing.rpc.blockchain.getBlockCount()
      expect(blockCount < 110).toStrictEqual(true) // Less than greatworldheight

      const promise1 = testing.rpc.masternode.updateMasternode(txId, { ownerAddress })
      await expectGreatWorldHeightError(promise1)

      const promise2 = testing.rpc.masternode.updateMasternode(txId, { operatorAddress })
      await expectGreatWorldHeightError(promise2)

      const promise3 = testing.rpc.masternode.updateMasternode(txId, { rewardAddress })
      await expectGreatWorldHeightError(promise3)

      const promise4 = testing.rpc.masternode.updateMasternode(txId, {
        ownerAddress,
        operatorAddress
      })
      await expectGreatWorldHeightError(promise4)

      const promise5 = testing.rpc.masternode.updateMasternode(txId, {
        operatorAddress,
        rewardAddress
      })
      await expectGreatWorldHeightError(promise5)

      const promise6 = testing.rpc.masternode.updateMasternode(txId, {
        ownerAddress,
        operatorAddress,
        rewardAddress
      })
      await expectGreatWorldHeightError(promise6)
    }
  })
})
