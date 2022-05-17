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

    await testing.generate(9) // Generate 9 blocks to move to block 110

    const blockCount = await testing.rpc.blockchain.getBlockCount()
    expect(blockCount).toStrictEqual(110) // At greatworldheight
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
    // Several updateMasternode calls within different blocks
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
        const txId = await testing.rpc.masternode.updateMasternode(masternodeId1, {
          ownerAddress: await testing.generateAddress()
        })
        await testing.generate(1)

        // Check length for first txId only
        expect(typeof txId).toStrictEqual('string')
        expect(txId.length).toStrictEqual(64)

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

    // Several updateMasternode calls within same block
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
        const txId = await testing.rpc.masternode.updateMasternode(masternodeId1, {
          ownerAddress: await testing.generateAddress()
        })

        // Check length for first txId only
        expect(typeof txId).toStrictEqual('string')
        expect(txId.length).toStrictEqual(64)

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

  it('should updateMasternode if operatorAddress or rewardAddress do not belong to the owner', async () => {
    const masternodeId = await container.call('createmasternode', [await testing.generateAddress()])
    await testing.generate(1)

    await waitUntilMasternodeEnabled(masternodeId)

    {
      const txId = await testing.rpc.masternode.updateMasternode(masternodeId, {
        operatorAddress: 'bcrt1qcnfukr6c78wlz2tqpv8vxe0zu339c06pmm3l30'
      })

      expect(typeof txId).toStrictEqual('string')
      expect(txId.length).toStrictEqual(64)
    }

    {
      const txId = await testing.rpc.masternode.updateMasternode(masternodeId, {
        rewardAddress: 'bcrt1qcnfukr6c78wlz2tqpv8vxe0zu339c06pmm3l30'
      })

      expect(typeof txId).toStrictEqual('string')
      expect(txId.length).toStrictEqual(64)
    }
  })

  it('should updateMasternode if rewardAddress is pending to be updated in another masternode', async () => {
    {
      const masternodeId1 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId2 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId1)
      await waitUntilMasternodeEnabled(masternodeId2)

      const rewardAddress = await testing.generateAddress()
      await testing.rpc.masternode.updateMasternode(masternodeId1, {
        rewardAddress
      })

      const txId = await testing.rpc.masternode.updateMasternode(masternodeId2, {
        rewardAddress
      })

      expect(typeof txId).toStrictEqual('string')
      expect(txId.length).toStrictEqual(64)
    }
  })

  it('should not updateMasternode with ownerAddress, operatorAddress or rewardAddress if masternode id does not exists', async () => {
    {
      const promise = testing.rpc.masternode.updateMasternode('0'.repeat(64), {
        ownerAddress: await testing.generateAddress()
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`The masternode ${'0'.repeat(64)} does not exist`)
    }

    {
      const promise = testing.rpc.masternode.updateMasternode('0'.repeat(64), {
        operatorAddress: await testing.generateAddress()
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`The masternode ${'0'.repeat(64)} does not exist`)
    }

    {
      const promise = testing.rpc.masternode.updateMasternode('0'.repeat(64), {
        rewardAddress: await testing.generateAddress()
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`The masternode ${'0'.repeat(64)} does not exist`)
    }
  })

  it('should not updateMasternode with ownerAddress, operatorAddress or rewardAddress if masternode is not enabled', async () => {
    const masternodeId = await container.call('createmasternode', [await testing.generateAddress()])
    await testing.generate(1)

    {
      const promise = testing.rpc.masternode.updateMasternode(masternodeId, {
        ownerAddress: await testing.generateAddress()
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`RpcApiError: 'Test UpdateMasternodeTx execution failed:\nMasternode ${masternodeId as string} is not in 'ENABLED' state', code: -32600, method: updatemasternode`)
    }

    {
      const promise = testing.rpc.masternode.updateMasternode(masternodeId, {
        operatorAddress: await testing.generateAddress()
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`RpcApiError: 'Test UpdateMasternodeTx execution failed:\nMasternode ${masternodeId as string} is not in 'ENABLED' state', code: -32600, method: updatemasternode`)
    }

    {
      const promise = testing.rpc.masternode.updateMasternode(masternodeId, {
        rewardAddress: await testing.generateAddress()
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`RpcApiError: 'Test UpdateMasternodeTx execution failed:\nMasternode ${masternodeId as string} is not in 'ENABLED' state', code: -32600, method: updatemasternode`)
    }
  })

  it('should not updateMasternode if ownerAddress, operatorAddress or rewardAddress already exists', async () => {
    {
      const ownerAddress = await testing.generateAddress()

      const masternodeId = await container.call('createmasternode', [ownerAddress])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId)

      const promise = testing.rpc.masternode.updateMasternode(masternodeId, {
        ownerAddress
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Test UpdateMasternodeTx execution failed:\nMasternode with that owner address already exists')
    }

    {
      const masternodeId = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId)

      const operatorAddress = await testing.generateAddress()

      await testing.rpc.masternode.updateMasternode(masternodeId, {
        operatorAddress
      })
      await testing.generate(1)

      const promise = testing.rpc.masternode.updateMasternode(masternodeId, {
        operatorAddress
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Test UpdateMasternodeTx execution failed:\nMasternode with that operator address already exists')
    }
  })

  it('should not updateMasternode if ownerAddress, operatorAddress or rewardAddress do not refer to a P2PKH or P2WPKH address', async () => {
    {
      const masternodeId = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId)

      const ownerAddress = await container.getNewAddress('', 'p2sh-segwit')
      const promise = testing.rpc.masternode.updateMasternode(masternodeId, {
        ownerAddress
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`ownerAddress (${ownerAddress}) does not refer to a P2PKH or P2WPKH address`)
    }

    {
      const masternodeId = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId)

      const operatorAddress = await container.getNewAddress('', 'p2sh-segwit')
      const promise = testing.rpc.masternode.updateMasternode(masternodeId, {
        operatorAddress
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`operatorAddress (${operatorAddress}) does not refer to a P2PKH or P2WPKH address`)
    }

    {
      const masternodeId = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId)

      const rewardAddress = await container.getNewAddress('', 'p2sh-segwit')
      const promise = testing.rpc.masternode.updateMasternode(masternodeId, {
        rewardAddress
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`rewardAddress (${rewardAddress}) does not refer to a P2PKH or P2WPKH address`)
    }
  })

  it('should not updateMasternode if ownerAddress does not belong to the owner', async () => {
    const ownerAddress = await testing.generateAddress()

    const masternodeId = await container.call('createmasternode', [ownerAddress])
    await testing.generate(1)

    await waitUntilMasternodeEnabled(masternodeId)

    {
      const promise = testing.rpc.masternode.updateMasternode(masternodeId, {
        ownerAddress: 'bcrt1qcnfukr6c78wlz2tqpv8vxe0zu339c06pmm3l30'
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Incorrect authorization for bcrt1qcnfukr6c78wlz2tqpv8vxe0zu339c06pmm3l30')
    }
  })

  it('should not updateMasternode if ownerAddress or operatorAddress is pending to be updated in another masternode', async () => {
    {
      const masternodeId1 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId2 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId1)
      await waitUntilMasternodeEnabled(masternodeId2)

      const ownerAddress = await testing.generateAddress()
      await testing.rpc.masternode.updateMasternode(masternodeId1, {
        ownerAddress
      })

      const promise = testing.rpc.masternode.updateMasternode(masternodeId2, {
        ownerAddress
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('UpdateMasternodeTx: Masternode exist with that owner address pending already')
    }

    {
      const masternodeId1 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId2 = await container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId1)
      await waitUntilMasternodeEnabled(masternodeId2)

      const operatorAddress = await testing.generateAddress()
      await testing.rpc.masternode.updateMasternode(masternodeId1, {
        operatorAddress
      })

      const promise = testing.rpc.masternode.updateMasternode(masternodeId2, {
        operatorAddress
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('UpdateMasternodeTx: Masternode with that operator address already exists')
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
