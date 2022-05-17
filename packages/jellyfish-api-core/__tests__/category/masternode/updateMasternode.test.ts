import { MasterNodeRegTestContainer, waitForCondition } from '@defichain/testcontainers'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { Testing } from '@defichain/jellyfish-testing'
import { MasternodeInfo, MasternodeResult } from '@defichain/jellyfish-api-core/dist/category/masternode'

describe('Masternode at or after greatworldheight', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  async function waitUntilMasternodeEnabled (masternodeId: string, timeout = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const data: MasternodeResult<MasternodeInfo> = await container.call('getmasternode', [masternodeId])
      // eslint-disable-next-line
      if (Object.values(data)[0].state !== 'ENABLED') {
        await testing.generate(1)
        return false
      }
      return true
    }, timeout, 100, 'waitUntilMasternodeEnabled')
  }

  it('should updateMasternode', async () => {
    await testing.generate(9) // Generate 9 blocks to move to block 110

    const blockCount = await testing.rpc.blockchain.getBlockCount()
    expect(blockCount).toStrictEqual(110) // At greatworldheight

    // Several updateMasternode within different blocks
    {
      const masternodeId1 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId2 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId3 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId4 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId5 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId6 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId7 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId1)
      await waitUntilMasternodeEnabled(masternodeId2)
      await waitUntilMasternodeEnabled(masternodeId3)
      await waitUntilMasternodeEnabled(masternodeId4)
      await waitUntilMasternodeEnabled(masternodeId5)
      await waitUntilMasternodeEnabled(masternodeId6)
      await waitUntilMasternodeEnabled(masternodeId7)

      {
        await testing.rpc.masternode.updateMasternode(masternodeId1, {
          ownerAddress: await testing.generateAddress()
        })
        await testing.generate(1)

        await testing.rpc.masternode.updateMasternode(masternodeId2, {
          operatorAddress: await testing.generateAddress()
        })
        await testing.generate(1)

        await testing.rpc.masternode.updateMasternode(masternodeId3, {
          rewardAddress: await testing.generateAddress()
        })
        await testing.generate(1)

        await testing.rpc.masternode.updateMasternode(masternodeId4, {
          ownerAddress: await testing.generateAddress(),
          operatorAddress: await testing.generateAddress()
        })
        await testing.generate(1)

        await testing.rpc.masternode.updateMasternode(masternodeId5, {
          operatorAddress: await testing.generateAddress(),
          rewardAddress: await testing.generateAddress()
        })
        await testing.generate(1)

        await testing.rpc.masternode.updateMasternode(masternodeId6, {
          ownerAddress: await testing.generateAddress(),
          rewardAddress: await testing.generateAddress()
        })
        await testing.generate(1)

        await testing.rpc.masternode.updateMasternode(masternodeId7, {
          ownerAddress: await testing.generateAddress(),
          operatorAddress: await testing.generateAddress(),
          rewardAddress: await testing.generateAddress()
        })
        await testing.generate(1)
      }
    }

    // Several updateMasternode within same blocks
    {
      const masternodeId1 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId2 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId3 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId4 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId5 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId6 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId7 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId1)
      await waitUntilMasternodeEnabled(masternodeId2)
      await waitUntilMasternodeEnabled(masternodeId3)
      await waitUntilMasternodeEnabled(masternodeId4)
      await waitUntilMasternodeEnabled(masternodeId5)
      await waitUntilMasternodeEnabled(masternodeId6)
      await waitUntilMasternodeEnabled(masternodeId7)

      {
        await testing.rpc.masternode.updateMasternode(masternodeId1, {
          ownerAddress: await testing.generateAddress()
        })

        await testing.rpc.masternode.updateMasternode(masternodeId2, {
          operatorAddress: await testing.generateAddress()
        })

        await testing.rpc.masternode.updateMasternode(masternodeId3, {
          rewardAddress: await testing.generateAddress()
        })

        await testing.rpc.masternode.updateMasternode(masternodeId4, {
          ownerAddress: await testing.generateAddress(),
          operatorAddress: await testing.generateAddress()
        })

        await testing.rpc.masternode.updateMasternode(masternodeId5, {
          operatorAddress: await testing.generateAddress(),
          rewardAddress: await testing.generateAddress()
        })

        await testing.rpc.masternode.updateMasternode(masternodeId6, {
          ownerAddress: await testing.generateAddress(),
          rewardAddress: await testing.generateAddress()
        })

        await testing.rpc.masternode.updateMasternode(masternodeId7, {
          ownerAddress: await testing.generateAddress(),
          operatorAddress: await testing.generateAddress(),
          rewardAddress: await testing.generateAddress()
        })
        await testing.generate(1)
      }
    }
  })
})

describe('Masternode before greatworldheight', () => {
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
      expect(blockCount).toBeLessThan(110) // Less than greatworldheight

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
        rewardAddress
      })
      await expectGreatWorldHeightError(promise6)

      const promise7 = testing.rpc.masternode.updateMasternode(txId, {
        ownerAddress,
        operatorAddress,
        rewardAddress
      })
      await expectGreatWorldHeightError(promise7)
    }
  })
})
