import { MasterNodeRegTestContainer, waitForCondition } from '@defichain/testcontainers'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { Testing } from '@defichain/jellyfish-testing'
import {
  MasternodeInfo,
  MasternodeResult,
  MasternodeState
} from '@defichain/jellyfish-api-core/dist/category/masternode'

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

  async function waitUntilMasternodePreEnabled (masternodeId: string, timeout = 100000): Promise<void> {
    return await waitForCondition(async () => {
      const data: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId])

      // eslint-disable-next-line
      if (Object.values(data)[0].state !== MasternodeState.PRE_ENABLED) {
        await testing.generate(1)
        return false
      }
      return true
    }, timeout, 100, 'waitUntilMasternodePreEnabled')
  }

  async function waitUntilMasternodeEnabled (masternodeId: string, timeout = 100000): Promise<void> {
    return await waitForCondition(async () => {
      const data: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId])

      // eslint-disable-next-line
      if (Object.values(data)[0].state !== MasternodeState.ENABLED) {
        await testing.generate(1)
        return false
      }
      return true
    }, timeout, 100, 'waitUntilMasternodeEnabled')
  }

  it('should updateMasternode', async () => {
    // Several updateMasternode calls within different blocks
    {
      const masternodeId1 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId2 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId3 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId4 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId5 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId6 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId7 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId1)
      await waitUntilMasternodeEnabled(masternodeId2)
      await waitUntilMasternodeEnabled(masternodeId3)
      await waitUntilMasternodeEnabled(masternodeId4)
      await waitUntilMasternodeEnabled(masternodeId5)
      await waitUntilMasternodeEnabled(masternodeId6)
      await waitUntilMasternodeEnabled(masternodeId7)

      const ownerAddress1 = await testing.generateAddress()
      const txId1 = await testing.rpc.masternode.updateMasternode(masternodeId1, {
        ownerAddress: ownerAddress1
      })
      await testing.generate(1)

      // Only check length for txId of first updateMasternode
      expect(typeof txId1).toStrictEqual('string')
      expect(txId1.length).toStrictEqual(64)

      {
        const data1: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId1])
        expect(Object.values(data1)[0].ownerAuthAddress).not.toStrictEqual(ownerAddress1)
        expect(Object.values(data1)[0].state).toStrictEqual(MasternodeState.TRANSFERRING)
        expect(Object.values(data1)[0].collateralTx).toStrictEqual(txId1)
      }

      await waitUntilMasternodePreEnabled(masternodeId1)

      {
        const data1: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId1])
        expect(Object.values(data1)[0].ownerAuthAddress).toStrictEqual(ownerAddress1)
        expect(Object.values(data1)[0].state).toStrictEqual(MasternodeState.PRE_ENABLED)
        expect(Object.values(data1)[0].collateralTx).toStrictEqual(txId1)
      }

      await waitUntilMasternodeEnabled(masternodeId1)

      {
        const data1: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId1])
        expect(Object.values(data1)[0].ownerAuthAddress).toStrictEqual(ownerAddress1)
        expect(Object.values(data1)[0].state).toStrictEqual(MasternodeState.ENABLED)
        expect(Object.values(data1)[0].collateralTx).toStrictEqual(txId1)
      }

      const operatorAddress2 = await testing.generateAddress()

      const txId2 = await testing.rpc.masternode.updateMasternode(masternodeId2, {
        operatorAddress: operatorAddress2
      })
      await testing.generate(1)

      const data2: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId2])
      expect(Object.values(data2)[0].operatorAuthAddress).toStrictEqual(operatorAddress2)
      expect(Object.values(data2)[0].state).toStrictEqual(MasternodeState.ENABLED)
      expect(Object.values(data2)[0].collateralTx).not.toStrictEqual(txId2)

      const rewardAddress3 = await testing.generateAddress()

      const txId3 = await testing.rpc.masternode.updateMasternode(masternodeId3, {
        rewardAddress: rewardAddress3
      })
      await testing.generate(1)

      const data3: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId3])
      expect(Object.values(data3)[0].state).toStrictEqual(MasternodeState.ENABLED)
      expect(Object.values(data3)[0].rewardAddress).toStrictEqual(rewardAddress3)
      expect(Object.values(data3)[0].collateralTx).not.toStrictEqual(txId3)

      const ownerAddress4 = await testing.generateAddress()
      const operatorAddress4 = await testing.generateAddress()

      const txId4 = await testing.rpc.masternode.updateMasternode(masternodeId4, {
        ownerAddress: ownerAddress4,
        operatorAddress: operatorAddress4
      })
      await testing.generate(1)

      {
        const data4: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId4])
        expect(Object.values(data4)[0].state).toStrictEqual(MasternodeState.TRANSFERRING)
        expect(Object.values(data4)[0].ownerAuthAddress).not.toStrictEqual(ownerAddress4)
        expect(Object.values(data4)[0].operatorAuthAddress).toStrictEqual(operatorAddress4)
        expect(Object.values(data4)[0].collateralTx).toStrictEqual(txId4)
      }

      await waitUntilMasternodePreEnabled(masternodeId4)

      {
        const data4: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId4])
        expect(Object.values(data4)[0].state).toStrictEqual(MasternodeState.PRE_ENABLED)
        expect(Object.values(data4)[0].ownerAuthAddress).toStrictEqual(ownerAddress4)
        expect(Object.values(data4)[0].operatorAuthAddress).toStrictEqual(operatorAddress4)
        expect(Object.values(data4)[0].collateralTx).not.toStrictEqual(txId4)
      }

      await waitUntilMasternodeEnabled(masternodeId4)

      {
        const data4: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId4])
        expect(Object.values(data4)[0].ownerAuthAddress).toStrictEqual(ownerAddress4)
        expect(Object.values(data4)[0].operatorAuthAddress).toStrictEqual(operatorAddress4)
        expect(Object.values(data4)[0].state).toStrictEqual(MasternodeState.ENABLED)
        expect(Object.values(data4)[0].collateralTx).not.toStrictEqual(txId4)
      }

      const operatorAddress5 = await testing.generateAddress()
      const rewardAddress5 = await testing.generateAddress()

      const txId5 = await testing.rpc.masternode.updateMasternode(masternodeId5, {
        operatorAddress: operatorAddress5,
        rewardAddress: rewardAddress5
      })
      await testing.generate(1)

      const data5: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId5])
      expect(Object.values(data5)[0].operatorAuthAddress).toStrictEqual(operatorAddress5)
      expect(Object.values(data5)[0].rewardAddress).toStrictEqual(rewardAddress5)
      expect(Object.values(data5)[0].state).toStrictEqual(MasternodeState.ENABLED)
      expect(Object.values(data5)[0].collateralTx).not.toStrictEqual(txId5)

      const ownerAddress6 = await testing.generateAddress()
      const rewardAddress6 = await testing.generateAddress()

      const txId6 = await testing.rpc.masternode.updateMasternode(masternodeId6, {
        ownerAddress: ownerAddress6,
        rewardAddress: rewardAddress6
      })
      await testing.generate(1)

      {
        const data6: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId6])
        expect(Object.values(data6)[0].state).toStrictEqual(MasternodeState.TRANSFERRING)
        expect(Object.values(data6)[0].ownerAuthAddress).not.toStrictEqual(ownerAddress6)
        expect(Object.values(data6)[0].rewardAddress).toStrictEqual(rewardAddress6)
        expect(Object.values(data6)[0].collateralTx).toStrictEqual(txId6)
      }

      await waitUntilMasternodePreEnabled(masternodeId6)

      {
        const data6: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId6])
        expect(Object.values(data6)[0].state).toStrictEqual(MasternodeState.PRE_ENABLED)
        expect(Object.values(data6)[0].ownerAuthAddress).toStrictEqual(ownerAddress6)
        expect(Object.values(data6)[0].rewardAddress).toStrictEqual(rewardAddress6)
        expect(Object.values(data6)[0].collateralTx).not.toStrictEqual(txId6)
      }

      await waitUntilMasternodeEnabled(masternodeId6)

      {
        const data6: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId6])
        expect(Object.values(data6)[0].ownerAuthAddress).toStrictEqual(ownerAddress6)
        expect(Object.values(data6)[0].rewardAddress).toStrictEqual(rewardAddress6)
        expect(Object.values(data6)[0].state).toStrictEqual(MasternodeState.ENABLED)
        expect(Object.values(data6)[0].collateralTx).not.toStrictEqual(txId6)
      }

      const ownerAddress7 = await testing.generateAddress()
      const operatorAddress7 = await testing.generateAddress()
      const rewardAddress7 = await testing.generateAddress()

      const txId7 = await testing.rpc.masternode.updateMasternode(masternodeId7, {
        ownerAddress: ownerAddress7,
        operatorAddress: operatorAddress7,
        rewardAddress: rewardAddress7
      })
      await testing.generate(1)

      {
        const data7: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId7])
        expect(Object.values(data7)[0].state).toStrictEqual(MasternodeState.TRANSFERRING)
        expect(Object.values(data7)[0].ownerAuthAddress).not.toStrictEqual(ownerAddress7)
        expect(Object.values(data7)[0].operatorAuthAddress).toStrictEqual(operatorAddress7)
        expect(Object.values(data7)[0].rewardAddress).toStrictEqual(rewardAddress7)
        expect(Object.values(data7)[0].collateralTx).toStrictEqual(txId7)
      }

      await waitUntilMasternodePreEnabled(masternodeId7)

      {
        const data7: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId7])
        expect(Object.values(data7)[0].state).toStrictEqual(MasternodeState.PRE_ENABLED)
        expect(Object.values(data7)[0].ownerAuthAddress).toStrictEqual(ownerAddress7)
        expect(Object.values(data7)[0].operatorAuthAddress).toStrictEqual(operatorAddress7)
        expect(Object.values(data7)[0].rewardAddress).toStrictEqual(rewardAddress7)
        expect(Object.values(data7)[0].collateralTx).not.toStrictEqual(txId7)
      }

      await waitUntilMasternodeEnabled(masternodeId7)

      {
        const data7: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId7])
        expect(Object.values(data7)[0].ownerAuthAddress).toStrictEqual(ownerAddress7)
        expect(Object.values(data7)[0].operatorAuthAddress).toStrictEqual(operatorAddress7)
        expect(Object.values(data7)[0].rewardAddress).toStrictEqual(rewardAddress7)
        expect(Object.values(data7)[0].state).toStrictEqual(MasternodeState.ENABLED)
        expect(Object.values(data7)[0].collateralTx).not.toStrictEqual(txId7)
      }
    }

    // Several updateMasternode calls within same block
    {
      const masternodeId1 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId2 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId3 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId4 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId5 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId6 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId7 = await testing.container.call('createmasternode', [await testing.generateAddress()])
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

      const data: MasternodeResult<MasternodeInfo> = await testing.container.call('listmasternodes', [true])
      expect(Object.values(data).length).toStrictEqual(7) // Make sure 7 of the masternodes registered even though executed in the same block
    }
  })

  it('should updateMasternode with operatorAddress and rewardAddress if operatorAddress or rewardAddress do not belong to the owner', async () => {
    const masternodeId1 = await testing.container.call('createmasternode', [await testing.generateAddress()])
    await testing.generate(1)

    const masternodeId2 = await testing.container.call('createmasternode', [await testing.generateAddress()])
    await testing.generate(1)

    await waitUntilMasternodeEnabled(masternodeId1)
    await waitUntilMasternodeEnabled(masternodeId2)

    const txId1 = await testing.rpc.masternode.updateMasternode(masternodeId1, {
      operatorAddress: 'bcrt1qcnfukr6c78wlz2tqpv8vxe0zu339c06pmm3l30'
    })

    expect(typeof txId1).toStrictEqual('string')
    expect(txId1.length).toStrictEqual(64)

    const txId2 = await testing.rpc.masternode.updateMasternode(masternodeId2, {
      rewardAddress: 'bcrt1qcnfukr6c78wlz2tqpv8vxe0zu339c06pmm3l30'
    })

    expect(typeof txId2).toStrictEqual('string')
    expect(txId2.length).toStrictEqual(64)
  })

  it('should updateMasternode with rewardAddress if rewardAddress is pending to be updated in another masternode', async () => {
    {
      const masternodeId1 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId2 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId1)
      await waitUntilMasternodeEnabled(masternodeId2)

      const rewardAddress = await testing.generateAddress()
      await testing.rpc.masternode.updateMasternode(masternodeId1, {
        rewardAddress
      })
      await testing.generate(1)

      const txId = await testing.rpc.masternode.updateMasternode(masternodeId2, {
        rewardAddress
      })

      expect(typeof txId).toStrictEqual('string')
      expect(txId.length).toStrictEqual(64)
    }
  })

  it('should updateMasternode with rewardAddress if rewardAddress already exists', async () => {
    const masternodeId = await testing.container.call('createmasternode', [await testing.generateAddress()])
    await testing.generate(1)

    await waitUntilMasternodeEnabled(masternodeId)

    const data: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId])
    expect(Object.values(data)[0].rewardAddress).toStrictEqual('') // By default rewardAddress = empty string

    const txId = await testing.rpc.masternode.updateMasternode(masternodeId, {
      rewardAddress: '' // Update empty string to rewardAddress again
    })
    await testing.generate(1)

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)
  })

  it('should updateMasternode with rewardAddress if rewardAddress is set to empty string', async () => {
    {
      const masternodeId = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId)

      {
        const data: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId])
        expect(Object.values(data)[0].rewardAddress).toStrictEqual('') // By default, rewardAddress is an empty string
      }

      const rewardAddress = await testing.generateAddress()

      await testing.rpc.masternode.updateMasternode(masternodeId, {
        rewardAddress
      })
      await testing.generate(1)

      {
        const data: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId])
        expect(Object.values(data)[0].rewardAddress).toStrictEqual(rewardAddress) // Change rewardAddress to a valid address
      }

      await testing.rpc.masternode.updateMasternode(masternodeId, {
        rewardAddress: '' // Update reward address to empty string
      })
      await testing.generate(1)

      {
        const data: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId])
        expect(Object.values(data)[0].rewardAddress).toStrictEqual('') // Reward address is set to empty string again
      }
    }
  })

  it('should updateMasternode with ownerAddress, operatorAddress or rewardAddress with utxos', async () => {
    const ownerAddress1 = await testing.generateAddress()
    const ownerAddress2 = await testing.generateAddress()
    const ownerAddress3 = await testing.generateAddress()

    const masternodeId1 = await testing.container.call('createmasternode', [ownerAddress1])
    await testing.generate(1)

    const masternodeId2 = await testing.container.call('createmasternode', [ownerAddress2])
    await testing.generate(1)

    const masternodeId3 = await testing.container.call('createmasternode', [ownerAddress3])
    await testing.generate(1)

    await waitUntilMasternodeEnabled(masternodeId1)
    await waitUntilMasternodeEnabled(masternodeId2)
    await waitUntilMasternodeEnabled(masternodeId3)

    const newOwnerAddress1 = await testing.generateAddress()
    const utxo1 = await testing.container.fundAddress(newOwnerAddress1, 10)

    const txId1 = await testing.rpc.masternode.updateMasternode(masternodeId1, { ownerAddress: newOwnerAddress1 }, [utxo1])
    expect(typeof txId1).toStrictEqual('string')
    expect(txId1.length).toStrictEqual(64)

    const rawtx1 = await testing.container.call('getrawtransaction', [txId1, true])
    expect(rawtx1.vin[0].txid).toStrictEqual(utxo1.txid)
    expect(rawtx1.vin[0].vout).toStrictEqual(utxo1.vout)

    const utxo2 = await testing.container.fundAddress(ownerAddress2, 10)

    const txId2 = await testing.rpc.masternode.updateMasternode(masternodeId2, { operatorAddress: await testing.generateAddress() }, [utxo2])
    expect(typeof txId2).toStrictEqual('string')
    expect(txId2.length).toStrictEqual(64)

    const rawtx2 = await testing.container.call('getrawtransaction', [txId2, true])
    expect(rawtx2.vin[0].txid).toStrictEqual(utxo2.txid)
    expect(rawtx2.vin[0].vout).toStrictEqual(utxo2.vout)

    const utxo3 = await testing.container.fundAddress(ownerAddress3, 10)

    const txId3 = await testing.rpc.masternode.updateMasternode(masternodeId3, { rewardAddress: await testing.generateAddress() }, [utxo3])
    expect(typeof txId3).toStrictEqual('string')
    expect(txId3.length).toStrictEqual(64)

    const rawtx3 = await testing.container.call('getrawtransaction', [txId3, true])
    expect(rawtx3.vin[0].txid).toStrictEqual(utxo3.txid)
    expect(rawtx3.vin[0].vout).toStrictEqual(utxo3.vout)
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
    const masternodeId = await testing.container.call('createmasternode', [await testing.generateAddress()])
    await testing.generate(1)

    const data: MasternodeResult<MasternodeInfo> = await testing.container.call('getmasternode', [masternodeId])
    expect(Object.values(data)[0].state).toStrictEqual(MasternodeState.PRE_ENABLED)

    const promise1 = testing.rpc.masternode.updateMasternode(masternodeId, {
      ownerAddress: await testing.generateAddress()
    })
    await expect(promise1).rejects.toThrow(RpcApiError)
    await expect(promise1).rejects.toThrow(`RpcApiError: 'Test UpdateMasternodeTx execution failed:\nMasternode ${masternodeId as string} is not in 'ENABLED' state', code: -32600, method: updatemasternode`)

    const promise2 = testing.rpc.masternode.updateMasternode(masternodeId, {
      operatorAddress: await testing.generateAddress()
    })

    await expect(promise2).rejects.toThrow(RpcApiError)
    await expect(promise2).rejects.toThrow(`RpcApiError: 'Test UpdateMasternodeTx execution failed:\nMasternode ${masternodeId as string} is not in 'ENABLED' state', code: -32600, method: updatemasternode`)

    const promise3 = testing.rpc.masternode.updateMasternode(masternodeId, {
      rewardAddress: await testing.generateAddress()
    })

    await expect(promise3).rejects.toThrow(RpcApiError)
    await expect(promise3).rejects.toThrow(`RpcApiError: 'Test UpdateMasternodeTx execution failed:\nMasternode ${masternodeId as string} is not in 'ENABLED' state', code: -32600, method: updatemasternode`)
  })

  it('should not updateMasternode with ownerAddress or operatorAddress if ownerAddress or operatorAddress already exists', async () => {
    const ownerAddress = await testing.generateAddress()
    const operatorAddress = await testing.generateAddress()
    const rewardAddress = await testing.generateAddress()

    const masternodeId = await testing.container.call('createmasternode', [ownerAddress])
    await testing.generate(1)

    await waitUntilMasternodeEnabled(masternodeId)

    const promise1 = testing.rpc.masternode.updateMasternode(masternodeId, {
      ownerAddress
    })

    await expect(promise1).rejects.toThrow(RpcApiError)
    await expect(promise1).rejects.toThrow('Test UpdateMasternodeTx execution failed:\nMasternode with that owner address already exists')

    await testing.rpc.masternode.updateMasternode(masternodeId, {
      operatorAddress
    })
    await testing.generate(1)

    const promise2 = testing.rpc.masternode.updateMasternode(masternodeId, {
      operatorAddress
    })

    await expect(promise2).rejects.toThrow(RpcApiError)
    await expect(promise2).rejects.toThrow('Test UpdateMasternodeTx execution failed:\nMasternode with that operator address already exists')

    await testing.rpc.masternode.updateMasternode(masternodeId, {
      rewardAddress
    })
    await testing.generate(1)
  })

  it('should not updateMasternode with ownerAddress, operatorAddress or rewardAddress if ownerAddress, operatorAddress or rewardAddress do not refer to a P2PKH or P2WPKH address', async () => {
    {
      const masternodeId = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId)

      const ownerAddress = await testing.container.getNewAddress('', 'p2sh-segwit')
      const promise = testing.rpc.masternode.updateMasternode(masternodeId, {
        ownerAddress
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`ownerAddress (${ownerAddress}) does not refer to a P2PKH or P2WPKH address`)
    }

    {
      const masternodeId = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId)

      const operatorAddress = await testing.container.getNewAddress('', 'p2sh-segwit')
      const promise = testing.rpc.masternode.updateMasternode(masternodeId, {
        operatorAddress
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`operatorAddress (${operatorAddress}) does not refer to a P2PKH or P2WPKH address`)
    }

    {
      const masternodeId = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId)

      const rewardAddress = await testing.container.getNewAddress('', 'p2sh-segwit')
      const promise = testing.rpc.masternode.updateMasternode(masternodeId, {
        rewardAddress
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`rewardAddress (${rewardAddress}) does not refer to a P2PKH or P2WPKH address`)
    }
  })

  it('should not updateMasternode with ownerAddress if ownerAddress does not belong to the owner', async () => {
    const ownerAddress = await testing.generateAddress()

    const masternodeId = await testing.container.call('createmasternode', [ownerAddress])
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

  it('should not updateMasternode with ownerAddress or operatorAddress if ownerAddress or operatorAddress is pending to be updated in another masternode', async () => {
    {
      const masternodeId1 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId2 = await testing.container.call('createmasternode', [await testing.generateAddress()])
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
      const masternodeId1 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId2 = await testing.container.call('createmasternode', [await testing.generateAddress()])
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

  it('should not updateMasternode with ownerAddress or operatorAddress if ownerAddress or operatorAddress is set to empty string', async () => {
    {
      const masternodeId1 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      const masternodeId2 = await testing.container.call('createmasternode', [await testing.generateAddress()])
      await testing.generate(1)

      await waitUntilMasternodeEnabled(masternodeId1)
      await waitUntilMasternodeEnabled(masternodeId2)

      const promise1 = testing.rpc.masternode.updateMasternode(masternodeId1, {
        ownerAddress: ''
      })
      await expect(promise1).rejects.toThrow(RpcApiError)
      await expect(promise1).rejects.toThrow('ownerAddress () does not refer to a P2PKH or P2WPKH address\', code: -8, method: updatemasternode')

      const promise2 = testing.rpc.masternode.updateMasternode(masternodeId1, {
        operatorAddress: ''
      })
      await expect(promise2).rejects.toThrow(RpcApiError)
      await expect(promise2).rejects.toThrow('operatorAddress () does not refer to a P2PKH or P2WPKH address\', code: -8, method: updatemasternode')
    }
  })

  it('should not updateMasternode with operatorAddress or rewardAddress for arbitrary utxos', async () => {
    const ownerAddress1 = await testing.generateAddress()
    const ownerAddress2 = await testing.generateAddress()

    const masternodeId1 = await testing.container.call('createmasternode', [ownerAddress1])
    await testing.generate(1)

    const masternodeId2 = await testing.container.call('createmasternode', [ownerAddress2])
    await testing.generate(1)

    await waitUntilMasternodeEnabled(masternodeId1)
    await waitUntilMasternodeEnabled(masternodeId2)

    const operatorAddress = await testing.generateAddress()
    const utxo1 = await testing.container.fundAddress(operatorAddress, 10)
    const promise1 = testing.rpc.masternode.updateMasternode(masternodeId2, { operatorAddress }, [utxo1])
    await expect(promise1).rejects.toThrow(RpcApiError)
    await expect(promise1).rejects.toThrow('Test UpdateMasternodeTx execution failed:\ntx must have at least one input from the owner')

    const rewardAddress = await testing.generateAddress()
    const utxo2 = await testing.container.fundAddress(rewardAddress, 10)
    const promise2 = testing.rpc.masternode.updateMasternode(masternodeId2, { rewardAddress }, [utxo2])
    await expect(promise2).rejects.toThrow(RpcApiError)
    await expect(promise2).rejects.toThrow('Test UpdateMasternodeTx execution failed:\ntx must have at least one input from the owner')
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
    const txId = await testing.container.call('createmasternode', [await testing.generateAddress()])
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
