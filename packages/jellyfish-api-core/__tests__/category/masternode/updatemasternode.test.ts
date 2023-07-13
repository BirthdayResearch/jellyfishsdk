import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { AddressType } from '../../../src/category/wallet'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('Update Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    // enable updating
    await client.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/mn-setowneraddress': 'true',
        'v0/params/feature/mn-setoperatoraddress': 'true',
        'v0/params/feature/mn-setrewardaddress': 'true'
      }
    })
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should updateMasternode ownerAddress with bech32 address', async () => {
    const initialAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(initialAddress)

    await container.generate(20) // wait for masternode to be enabled

    const masternodesBefore = await client.masternode.listMasternodes()
    const masternodesLengthBefore = Object.keys(masternodesBefore).length

    const newAddress = await client.wallet.getNewAddress()
    await client.masternode.updateMasternode(masternodeId, {
      ownerAddress: newAddress
    })

    // wait for masternode to be enabled
    await container.generate(20)

    // Test update masternode again during TRANSFERRING
    const expectTransferringMN = await client.masternode.getMasternode(masternodeId)
    expect(expectTransferringMN[masternodeId].state).toStrictEqual('TRANSFERRING')

    const anotherNewAddress = await client.wallet.getNewAddress()
    const promise = client.masternode.updateMasternode(masternodeId, {
      ownerAddress: anotherNewAddress
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Masternode ${masternodeId} is not in 'ENABLED' state`)

    await container.generate(45)

    const masternodesAfter = await client.masternode.listMasternodes()
    const masternodesLengthAfter = Object.keys(masternodesAfter).length

    expect(masternodesLengthAfter).toStrictEqual(masternodesLengthBefore)
    expect(masternodesAfter[masternodeId]).toBeTruthy()
    expect(masternodesAfter[masternodeId]).toStrictEqual({
      ownerAuthAddress: newAddress,
      operatorAuthAddress: initialAddress,
      rewardAddress: '',
      creationHeight: expect.any(Number),
      resignHeight: expect.any(Number),
      resignTx: expect.any(String),
      collateralTx: expect.any(String),
      state: 'ENABLED',
      mintedBlocks: expect.any(Number),
      ownerIsMine: expect.any(Boolean),
      localMasternode: expect.any(Boolean),
      operatorIsMine: expect.any(Boolean),
      targetMultipliers: expect.any(Object)
    })
  })

  it('should updateMasternode operatorAddress with bech32 address', async () => {
    const initialAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(initialAddress)

    await container.generate(20) // wait for masternode to be enabled

    const masternodesBefore = await client.masternode.listMasternodes()
    const masternodesLengthBefore = Object.keys(masternodesBefore).length

    const newAddress = await client.wallet.getNewAddress()
    await client.masternode.updateMasternode(masternodeId, {
      operatorAddress: newAddress
    })

    await container.generate(65) // wait for masternode to be enabled

    const masternodesAfter = await client.masternode.listMasternodes()
    const masternodesLengthAfter = Object.keys(masternodesAfter).length

    expect(masternodesLengthAfter).toStrictEqual(masternodesLengthBefore)
    expect(masternodesAfter[masternodeId]).toBeTruthy()
    expect(masternodesAfter[masternodeId]).toStrictEqual({
      ownerAuthAddress: initialAddress,
      operatorAuthAddress: newAddress,
      rewardAddress: '',
      creationHeight: expect.any(Number),
      resignHeight: expect.any(Number),
      resignTx: expect.any(String),
      collateralTx: expect.any(String),
      state: 'ENABLED',
      mintedBlocks: expect.any(Number),
      ownerIsMine: expect.any(Boolean),
      localMasternode: expect.any(Boolean),
      operatorIsMine: expect.any(Boolean),
      targetMultipliers: expect.any(Object)
    })
  })

  it('should updateMasternode rewardAddress with bech32 address', async () => {
    const initialAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(initialAddress)

    await container.generate(20) // wait for masternode to be enabled

    const masternodesBefore = await client.masternode.listMasternodes()
    const masternodesLengthBefore = Object.keys(masternodesBefore).length

    const newAddress = await client.wallet.getNewAddress()
    await client.masternode.updateMasternode(masternodeId, {
      rewardAddress: newAddress
    })

    await container.generate(65) // wait for masternode to be enabled

    const masternodesAfter = await client.masternode.listMasternodes()
    const masternodesLengthAfter = Object.keys(masternodesAfter).length

    expect(masternodesLengthAfter).toStrictEqual(masternodesLengthBefore)
    expect(masternodesAfter[masternodeId]).toBeTruthy()
    expect(masternodesAfter[masternodeId]).toStrictEqual({
      ownerAuthAddress: initialAddress,
      operatorAuthAddress: initialAddress,
      rewardAddress: newAddress,
      creationHeight: expect.any(Number),
      resignHeight: expect.any(Number),
      resignTx: expect.any(String),
      collateralTx: expect.any(String),
      state: 'ENABLED',
      mintedBlocks: expect.any(Number),
      ownerIsMine: expect.any(Boolean),
      localMasternode: expect.any(Boolean),
      operatorIsMine: expect.any(Boolean),
      targetMultipliers: expect.any(Object)
    })
  })

  it('should update multiple address simultaneously with bech32 address', async () => {
    const initialAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(initialAddress)

    await container.generate(20)

    const ownerAddress = await client.wallet.getNewAddress()
    const operatorAddress = await client.wallet.getNewAddress()
    const rewardAddress = await client.wallet.getNewAddress()
    await client.masternode.updateMasternode(masternodeId, {
      ownerAddress,
      operatorAddress,
      rewardAddress
    })

    await container.generate(65)

    const masternodes = await client.masternode.listMasternodes()

    expect(masternodes[masternodeId]).toBeTruthy()
    expect(masternodes[masternodeId]).toStrictEqual({
      operatorAuthAddress: operatorAddress,
      ownerAuthAddress: ownerAddress,
      rewardAddress: rewardAddress,
      creationHeight: expect.any(Number),
      resignHeight: expect.any(Number),
      resignTx: expect.any(String),
      collateralTx: expect.any(String),
      state: 'ENABLED',
      mintedBlocks: expect.any(Number),
      ownerIsMine: expect.any(Boolean),
      localMasternode: expect.any(Boolean),
      operatorIsMine: expect.any(Boolean),
      targetMultipliers: expect.any(Object)
    })
  })

  it('should update multiple address simultaneously with legacy address', async () => {
    const initialAddress = await client.wallet.getNewAddress('', AddressType.LEGACY)
    const masternodeId = await client.masternode.createMasternode(initialAddress)

    await container.generate(20)

    const ownerAddress = await client.wallet.getNewAddress('', AddressType.LEGACY)
    const operatorAddress = await client.wallet.getNewAddress('', AddressType.LEGACY)
    const rewardAddress = await client.wallet.getNewAddress('', AddressType.LEGACY)
    await client.masternode.updateMasternode(masternodeId, {
      ownerAddress,
      operatorAddress,
      rewardAddress
    })

    await container.generate(65)

    const masternodes = await client.masternode.listMasternodes()

    expect(masternodes[masternodeId]).toBeTruthy()
    expect(masternodes[masternodeId]).toStrictEqual({
      operatorAuthAddress: operatorAddress,
      ownerAuthAddress: ownerAddress,
      rewardAddress: rewardAddress,
      creationHeight: expect.any(Number),
      resignHeight: expect.any(Number),
      resignTx: expect.any(String),
      collateralTx: expect.any(String),
      state: 'ENABLED',
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

  it('should remove reward address', async () => {
    const initialAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(initialAddress)

    await container.generate(20)

    const rewardAddress = await client.wallet.getNewAddress()
    await client.masternode.updateMasternode(masternodeId, {
      rewardAddress
    })
    await container.generate(50)

    const masternodesBefore = await client.masternode.listMasternodes()
    expect(masternodesBefore[masternodeId]).toBeTruthy()
    expect(masternodesBefore[masternodeId].rewardAddress).toStrictEqual(rewardAddress)

    await client.masternode.updateMasternode(masternodeId, {
      rewardAddress: ''
    })
    await container.generate(50)

    const masternodesAfter = await client.masternode.listMasternodes()
    expect(masternodesAfter[masternodeId]).toBeTruthy()
    expect(masternodesAfter[masternodeId].rewardAddress).toStrictEqual('')
  })

  it('should be failed as p2sh address is not allowed', async () => {
    const ownerAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress)

    await container.generate(20)

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

    // Updated: P2SH is allowed for rewardAddress - https://github.com/DeFiCh/ain/pull/1664
    // {
    //   const rewardAddress = await client.wallet.getNewAddress('', AddressType.P2SH_SEGWIT)
    //   const promise = client.masternode.updateMasternode(masternodeId, {
    //     rewardAddress
    //   })
    //   await expect(promise).rejects.toThrow(RpcApiError)
    //   await expect(promise).rejects.toThrow('Reward address must be P2PKH or P2WPKH type\', code: -32600, method: updatemasternode')
    // }
  })

  it('should be failed as invalid address is not allowed', async () => {
    const ownerAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress)

    await container.generate(20)

    {
      const invalidAddress = 'INVALID_ADDRESS'
      const promise = client.masternode.updateMasternode(masternodeId, {
        ownerAddress: invalidAddress
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`ownerAddress (${invalidAddress}) does not refer to a P2PKH or P2WPKH address`)
    }

    {
      const invalidAddress = 'INVALID_ADDRESS'
      const promise = client.masternode.updateMasternode(masternodeId, {
        operatorAddress: invalidAddress
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`RpcApiError: 'operatorAddress (${invalidAddress}) does not refer to a P2PKH or P2WPKH address', code: -8, method: updatemasternode`)
    }

    {
      const invalidAddress = 'INVALID_ADDRESS'
      const promise = client.masternode.updateMasternode(masternodeId, {
        rewardAddress: invalidAddress
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`rewardAddress (${invalidAddress}) does not refer to a P2SH, P2PKH or P2WPKH address`)
    }
  })

  it('should not update masternode while in PRE_ENABLED or TRANSFERRING state', async () => {
    const initialAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(initialAddress)

    await container.generate(1)

    // test call before masternode active
    const ownerAddress = await client.wallet.getNewAddress()
    {
      const promise = client.masternode.updateMasternode(masternodeId, { ownerAddress: ownerAddress })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`RpcApiError: 'Test UpdateMasternodeTx execution failed:\nMasternode ${masternodeId} is not in 'ENABLED' state', code: -32600, method: updatemasternode`)
    }
    {
      const promise = client.masternode.updateMasternode(masternodeId, { operatorAddress: ownerAddress })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`RpcApiError: 'Test UpdateMasternodeTx execution failed:\nMasternode ${masternodeId} is not in 'ENABLED' state', code: -32600, method: updatemasternode`)
    }
    {
      const promise = client.masternode.updateMasternode(masternodeId, { rewardAddress: ownerAddress })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`RpcApiError: 'Test UpdateMasternodeTx execution failed:\nMasternode ${masternodeId} is not in 'ENABLED' state', code: -32600, method: updatemasternode`)
    }

    {
      const masternodes = await client.masternode.listMasternodes()
      expect(masternodes[masternodeId]).toBeTruthy()
      expect(masternodes[masternodeId].state).toStrictEqual('PRE_ENABLED')
      expect(masternodes[masternodeId].ownerAuthAddress).toStrictEqual(initialAddress)
    }

    await container.generate(20)

    // Check new state is TRANSFERRING and owner is still the same
    await client.masternode.updateMasternode(masternodeId, {
      ownerAddress: ownerAddress
    })

    await container.generate(20)

    {
      const masternodes = await client.masternode.listMasternodes()
      expect(masternodes[masternodeId]).toBeTruthy()
      expect(masternodes[masternodeId].state).toStrictEqual('TRANSFERRING')
      expect(masternodes[masternodeId].ownerAuthAddress).toStrictEqual(initialAddress)
    }

    await container.generate(45)

    {
      const masternodes = await client.masternode.listMasternodes()
      expect(masternodes[masternodeId]).toBeTruthy()
      expect(masternodes[masternodeId].state).toStrictEqual('ENABLED')
      expect(masternodes[masternodeId].ownerAuthAddress).toStrictEqual(ownerAddress)
    }
  })

  it('should fail with empty argument', async () => {
    const initialAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(initialAddress)

    await container.generate(20)

    const promise = client.masternode.updateMasternode(masternodeId, {})
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test UpdateMasternodeTx execution failed:\nNo update arguments provided', code: -32600, method: updatemasternode")
  })

  it('should fail to update owner address with same address', async () => {
    const initialAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(initialAddress)

    await container.generate(20)

    const promise = client.masternode.updateMasternode(masternodeId, {
      ownerAddress: initialAddress
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test UpdateMasternodeTx execution failed:\nMasternode with collateral address as operator or owner already exists', code: -32600, method: updatemasternode")
  })

  it('should fail to update another node with operator address that already exists', async () => {
    const address1 = await client.wallet.getNewAddress()
    await client.masternode.createMasternode(address1)
    const address2 = await client.wallet.getNewAddress()
    const masternode2Id = await client.masternode.createMasternode(address2)

    await container.generate(20)

    const promise = client.masternode.updateMasternode(masternode2Id, {
      operatorAddress: address1
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test UpdateMasternodeTx execution failed:\nMasternode with that operator address already exists', code: -32600, method: updatemasternode")
  })

  it('Test updating several MNs owners in the same block', async () => {
    const oldOwnerAddressA = await client.wallet.getNewAddress()
    const masternodeIdA = await client.masternode.createMasternode(oldOwnerAddressA)

    const oldOwnerAddressB = await client.wallet.getNewAddress()
    const masternodeIdB = await client.masternode.createMasternode(oldOwnerAddressB)

    const oldOwnerAddressC = await client.wallet.getNewAddress()
    const masternodeIdC = await client.masternode.createMasternode(oldOwnerAddressC)

    await container.generate(40)

    const masternodesBefore = await client.masternode.listMasternodes()
    expect(masternodesBefore[masternodeIdA].state).toStrictEqual('ENABLED')
    expect(masternodesBefore[masternodeIdA].ownerAuthAddress).toStrictEqual(oldOwnerAddressA)
    expect(masternodesBefore[masternodeIdB].state).toStrictEqual('ENABLED')
    expect(masternodesBefore[masternodeIdB].ownerAuthAddress).toStrictEqual(oldOwnerAddressB)
    expect(masternodesBefore[masternodeIdC].state).toStrictEqual('ENABLED')
    expect(masternodesBefore[masternodeIdC].ownerAuthAddress).toStrictEqual(oldOwnerAddressC)

    const newOwnerAddressA = await client.wallet.getNewAddress()
    const newOwnerAddressB = await client.wallet.getNewAddress()
    const newOwnerAddressC = await client.wallet.getNewAddress()

    await client.masternode.updateMasternode(masternodeIdA, { ownerAddress: newOwnerAddressA })
    await client.masternode.updateMasternode(masternodeIdB, { ownerAddress: newOwnerAddressB })
    await client.masternode.updateMasternode(masternodeIdC, { ownerAddress: newOwnerAddressC })

    await container.generate(1)

    const masternodesAfter = await client.masternode.listMasternodes()
    expect(masternodesAfter[masternodeIdA].state).toStrictEqual('TRANSFERRING')
    expect(masternodesAfter[masternodeIdA].ownerAuthAddress).toStrictEqual(oldOwnerAddressA)
    expect(masternodesAfter[masternodeIdB].state).toStrictEqual('TRANSFERRING')
    expect(masternodesAfter[masternodeIdB].ownerAuthAddress).toStrictEqual(oldOwnerAddressB)
    expect(masternodesAfter[masternodeIdC].state).toStrictEqual('TRANSFERRING')
    expect(masternodesAfter[masternodeIdC].ownerAuthAddress).toStrictEqual(oldOwnerAddressC)
  })

  it('Test incorrect new collateral amount', async () => {
    const masternodeOwnerAddress = await client.wallet.getNewAddress()
    const ownerAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(masternodeOwnerAddress)

    await container.generate(20)

    const { txid: missingAuthTx, vout: missingInputVout } = await container.fundAddress(masternodeOwnerAddress, 0.1)
    const { txid: ownerAuthTx, vout: ownerAuthVout } = await container.fundAddress(ownerAddress, 0.1)

    const missingTx = await client.masternode.updateMasternode(masternodeId, { ownerAddress: ownerAddress })
    const missingRawTx = await container.call('getrawtransaction', [missingTx, true])

    await client.masternode.clearMempool()

    const keyedTx: { [key: string]: number } = {}
    keyedTx[ownerAddress] = 10.1

    const rawTx = await container.call('createrawtransaction', [
      [
        { txid: masternodeId, vout: 1 },
        { txid: missingAuthTx, vout: missingInputVout },
        { txid: ownerAuthTx, vout: ownerAuthVout }
      ],
      [
        {
          data: missingRawTx.vout[0].scriptPubKey.hex
        },
        keyedTx
      ]
    ])

    const signedTx = await container.call('signrawtransactionwithwallet', [rawTx])
    expect(signedTx.complete).toBeTruthy()

    const promise = container.call('sendrawtransaction', [signedTx.hex])
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'bad-txns-collateral-locked, tried to spend locked collateral for ${masternodeId} (code 16)', code: -26`)
  })
})

describe('Update Masternode (Multi-containers)', () => {
  let tGroup: TestingGroup
  const node: Testing[] = []

  beforeAll(async () => {
    tGroup = TestingGroup.create(2, i => new MasterNodeRegTestContainer(RegTestFoundationKeys[i]))
    await tGroup.start()
    node.push(tGroup.get(0))
    node.push(tGroup.get(1))
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should throw error if incorrect authorization is provided', async () => {
    await node[0].container.waitForWalletCoinbaseMaturity()
    await node[1].container.waitForWalletCoinbaseMaturity()

    // enable updating
    await node[0].rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/mn-setowneraddress': 'true',
        'v0/params/feature/mn-setoperatoraddress': 'true',
        'v0/params/feature/mn-setrewardaddress': 'true'
      }
    })
    await node[0].generate(1)

    const masternodeOwnerAddress = await node[0].rpc.wallet.getNewAddress('', AddressType.LEGACY)
    const masternodeId = await node[0].rpc.masternode.createMasternode(masternodeOwnerAddress)
    await node[0].generate(100) // create masternode and wait for it to be enabled

    const operatorAddress = await node[0].rpc.wallet.getNewAddress('', AddressType.LEGACY)
    await node[0].generate(4)
    await tGroup.waitForSync() // container2 should know about the new masternode

    const promise = node[1].rpc.masternode.updateMasternode(masternodeId, { operatorAddress: operatorAddress })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Incorrect authorization for ${masternodeOwnerAddress}', code: -5, method: updatemasternode`)
  })
})
