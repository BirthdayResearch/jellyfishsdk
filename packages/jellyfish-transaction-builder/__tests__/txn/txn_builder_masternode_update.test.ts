import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTest } from '@defichain/jellyfish-network'
import { OP_CODES, TransactionSegWit, UpdateMasternode, Vin, Vout } from '@defichain/jellyfish-transaction'
import { P2PKH, P2SH, P2WPKH } from '@defichain/jellyfish-address'
import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder, Prevout } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { Bech32 } from '@defichain/jellyfish-crypto'
import { BigNumber } from '@defichain/jellyfish-json'

describe('UpdateMasternode', () => {
  const container = new MasterNodeRegTestContainer()
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder
  let jsonRpc: JsonRpcClient

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(1000)

    jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())
    providers = await getProviders(container)
  })

  afterAll(async () => {
    await container.stop()
  })

  beforeEach(async () => {
    await providers.randomizeEllipticPair()
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
    await fundEllipticPair(container, providers.ellipticPair, 3 + 0.00000755)
    await providers.setupMocks()

    // enable updating
    await jsonRpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/mn-setowneraddress': 'true',
        'v0/params/feature/mn-setoperatoraddress': 'true',
        'v0/params/feature/mn-setrewardaddress': 'true'
      }
    })
    await container.generate(1)

    const balance = await container.call('getbalance')
    expect(balance >= 2).toBeTruthy()
  })

  // todo: need to fix
  it.only('should update owner address with P2WPKH address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const masternodeId = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    // const newAddress = await container.getNewAddress()
    // const firstUpdateTx = await jsonRpc.masternode.updateMasternode(masternodeId, {
    //   ownerAddress: newAddress
    // })

    // await container.generate(65)

    // const newAddress2 = await container.getNewAddress()
    // const secondUpdateTx = await jsonRpc.masternode.updateMasternode(masternodeId, {
    //   ownerAddress: newAddress2
    // })

    // await container.generate(65)

    const address = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, address, P2WPKH)
    const addressDestKeyHash = addressDest.pubKeyHash

    const updateMasternode: UpdateMasternode = {
      nodeId: masternodeId,
      updates: [
        {
          updateType: 0x01,
          address: { addressType: 0x04, addressPubKeyHash: addressDestKeyHash }
        }
      ]
    }

    const script = await providers.elliptic.script()
    const mnInfo = await jsonRpc.masternode.getMasternode(masternodeId)

    // const rawFirstUpdate = await jsonRpc.rawtx.getRawTransaction(firstUpdateTx, true)
    // const rawSecondUpdate = await jsonRpc.rawtx.getRawTransaction(secondUpdateTx, true)
    const rawCollateral = await jsonRpc.rawtx.getRawTransaction(masternodeId, true)

    const collateralTxId = mnInfo[masternodeId].collateralTx as unknown as string;
    // const collateralTxId = rawCollateral.vin[1].txid
    // const collateralTxId = masternodeId

    const collateralPrevout: Prevout = {
      txid: masternodeId,
      vout: 1,
      script: script,
      value: new BigNumber(rawCollateral.vout[1].value),
      tokenId: rawCollateral.vout[1].tokenId
    }

    const collateralVout: Vout = {
      script: script,
      value: new BigNumber(rawCollateral.vout[1].value),
      tokenId: rawCollateral.vout[1].tokenId
    }

    const collateralVin: Vin = {
      txid: masternodeId,
      index: 1,
      script: { stack: [] },
      sequence: 0xffffffff,
    }

    const additionalVinData = {
      prevout: collateralPrevout,
      vin: collateralVin,
      vout: collateralVout
    }

    console.log({
      pubKey,
      collateralAddress,
      masternodeId,
      // newAddress,
      // newAddress2,
      collateralTxId,
    })

    // const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script, [additionalVinData])
    const outs = await sendTransaction(container, txn)

    console.log('debug')

    // const encoded: string = OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode).asBuffer().toString('hex')
    // const expectedRedeemScript = `6a${encoded}`

    // expect(outs.length).toStrictEqual(2)
    // expect(outs[0].value).toStrictEqual(0)
    // expect(outs[0].n).toStrictEqual(0)
    // expect(outs[0].tokenId).toStrictEqual(0)
    // expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 446654786d')).toBeTruthy()
    // expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    // expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    // expect(outs[1].value).toBeGreaterThan(6)
    // expect(outs[1].n).toStrictEqual(1)
    // expect(outs[1].tokenId).toStrictEqual(0)
    // expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    // expect(outs[1].scriptPubKey.reqSigs).toStrictEqual(1)
    // expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())
  })

  it('should update operator address with P2WPKH address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const address = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, address, P2WPKH)
    const addressDestKeyHash = addressDest.pubKeyHash

    const updateMasternode: UpdateMasternode = {
      nodeId: txid,
      updates: [
        {
          updateType: 0x02,
          address: { addressType: 0x04, addressPubKeyHash: addressDestKeyHash }
        }
      ]
    }

    const script = await providers.elliptic.script()
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
    const outs = await sendTransaction(container, txn)

    const encoded: string = OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 446654786d')).toBeTruthy()
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toBeGreaterThan(6)
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.reqSigs).toStrictEqual(1)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())
  })

  it('should update reward address with P2WPKH address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const address = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, address, P2WPKH)
    const addressDestKeyHash = addressDest.pubKeyHash

    const updateMasternode: UpdateMasternode = {
      nodeId: txid,
      updates: [
        {
          updateType: 0x03,
          address: { addressType: 0x04, addressPubKeyHash: addressDestKeyHash }
        }
      ]
    }

    const script = await providers.elliptic.script()
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
    const outs = await sendTransaction(container, txn)

    const encoded: string = OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 446654786d')).toBeTruthy()
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toBeGreaterThan(6)
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.reqSigs).toStrictEqual(1)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())
  })

  it('should update multiple addresses simultaneously with P2WPKH address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const operatorAddress = await container.getNewAddress('', 'bech32')
    const operatorAddressDest: P2WPKH = P2WPKH.fromAddress(RegTest, operatorAddress, P2WPKH)
    const operatorAddressDestKeyHash = operatorAddressDest.pubKeyHash

    const rewardAddress = await container.getNewAddress('', 'bech32')
    const rewardAddressDest: P2WPKH = P2WPKH.fromAddress(RegTest, rewardAddress, P2WPKH)
    const rewardAddressDestKeyHash = rewardAddressDest.pubKeyHash

    const updateMasternode: UpdateMasternode = {
      nodeId: txid,
      updates: [
        {
          updateType: 0x02,
          address: { addressType: 0x04, addressPubKeyHash: operatorAddressDestKeyHash }
        },
        {
          updateType: 0x03,
          address: { addressType: 0x04, addressPubKeyHash: rewardAddressDestKeyHash }
        }
      ]
    }

    const script = await providers.elliptic.script()
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
    const outs = await sendTransaction(container, txn)

    const encoded: string = OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 446654786d')).toBeTruthy()
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toBeGreaterThan(6)
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.reqSigs).toStrictEqual(1)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())
  })

  it('should update multiple addresses simultaneously with P2PKH address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const operatorAddress = await container.getNewAddress('', 'legacy')
    const operatorAddressDest: P2PKH = P2PKH.fromAddress(RegTest, operatorAddress, P2PKH)
    const operatorAddressDestHex = operatorAddressDest.hex

    const rewardAddress = await container.getNewAddress('', 'legacy')
    const rewardAddressDest: P2PKH = P2PKH.fromAddress(RegTest, rewardAddress, P2PKH)
    const rewardAddressDestHex = rewardAddressDest.hex

    const updateMasternode: UpdateMasternode = {
      nodeId: txid,
      updates: [
        {
          updateType: 0x02,
          address: { addressType: 0x01, addressPubKeyHash: operatorAddressDestHex }
        },
        {
          updateType: 0x03,
          address: { addressType: 0x01, addressPubKeyHash: rewardAddressDestHex }
        }
      ]
    }

    const script = await providers.elliptic.script()
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
    const outs = await sendTransaction(container, txn)

    const encoded: string = OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 446654786d')).toBeTruthy()
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toBeGreaterThan(6)
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.reqSigs).toStrictEqual(1)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())
  })

  it('should update remove reward address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const rewardAddress = await container.getNewAddress('', 'bech32')
    const rewardAddressDest: P2WPKH = P2WPKH.fromAddress(RegTest, rewardAddress, P2WPKH)
    const rewardAddressDestKeyHash = rewardAddressDest.pubKeyHash

    const setRewardAddressUpdate: UpdateMasternode = {
      nodeId: txid,
      updates: [
        {
          updateType: 0x03,
          address: { addressType: 0x04, addressPubKeyHash: rewardAddressDestKeyHash }
        }
      ]
    }

    const script = await providers.elliptic.script()
    const setRewardTxn: TransactionSegWit = await builder.masternode.update(setRewardAddressUpdate, script)
    await sendTransaction(container, setRewardTxn)

    await container.generate(50)

    const updateMasternode: UpdateMasternode = {
      nodeId: txid,
      updates: [
        {
          updateType: 0x04,
          address: { addressType: 0x00 }
        }
      ]
    }

    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
    const outs = await sendTransaction(container, txn)

    const encoded: string = OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 446654786d')).toBeTruthy()
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toBeGreaterThan(6)
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.reqSigs).toStrictEqual(1)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())
  })

  it('should fail if address is P2SH', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const address = await container.getNewAddress('', 'p2sh-segwit')
    const addressDest: P2SH = P2SH.fromAddress(RegTest, address, P2SH)
    const addressDestHex = addressDest.hex

    const script = await providers.elliptic.script()

    // todo: need to fix
    {
      const updateMasternode: UpdateMasternode = {
        nodeId: txid,
        updates: [{ updateType: 0x01, address: { addressType: 0x02, addressPubKeyHash: addressDestHex } }]
      }
      const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
      const promise = sendTransaction(container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow("DeFiDRpcError: 'bad-txns-customtx, UpdateMasternodeTx: Owner address must be P2PKH or P2WPKH type (code 16)', code: -26")
    }
    {
      const updateMasternode: UpdateMasternode = {
        nodeId: txid,
        updates: [{ updateType: 0x02, address: { addressType: 0x02, addressPubKeyHash: addressDestHex } }]
      }
      const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
      const promise = sendTransaction(container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow("DeFiDRpcError: 'bad-txns-customtx, UpdateMasternodeTx: Operator address must be P2PKH or P2WPKH type (code 16)', code: -26")
    }
    {
      const updateMasternode: UpdateMasternode = {
        nodeId: txid,
        updates: [{ updateType: 0x03, address: { addressType: 0x02, addressPubKeyHash: addressDestHex } }]
      }
      const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
      const promise = sendTransaction(container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow("DeFiDRpcError: 'bad-txns-customtx, UpdateMasternodeTx: Reward address must be P2PKH or P2WPKH type (code 16)', code: -26")
    }
  })

  it('should be failed as invalid address is not allowed', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const masternodeId = await jsonRpc.masternode.createMasternode(collateralAddress)

    await container.generate(20)

    const script = await providers.elliptic.script()

    // todo: need to fix
    {
      const invalidAddress = 'INVALID_ADDRESS'
      const updateMasternode: UpdateMasternode = {
        nodeId: masternodeId,
        updates: [{ updateType: 0x02, address: { addressType: 0x02, addressPubKeyHash: invalidAddress } }]
      }
      const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
      const promise = sendTransaction(container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'bad-txns-customtx, UpdateMasternodeTx: Owner address must be P2PKH or P2WPKH type (code 16)\', code: -26')
    }

    {
      const invalidAddress = 'INVALID_ADDRESS'
      const updateMasternode: UpdateMasternode = {
        nodeId: masternodeId,
        updates: [{ updateType: 0x02, address: { addressType: 0x02, addressPubKeyHash: invalidAddress } }]
      }
      const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
      const promise = sendTransaction(container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'bad-txns-customtx, UpdateMasternodeTx: Operator address must be P2PKH or P2WPKH type (code 16)\', code: -26')
    }

    {
      const invalidAddress = 'INVALID_ADDRESS'
      const updateMasternode: UpdateMasternode = {
        nodeId: masternodeId,
        updates: [{ updateType: 0x03, address: { addressType: 0x02, addressPubKeyHash: invalidAddress } }]
      }
      const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
      const promise = sendTransaction(container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'bad-txns-customtx, UpdateMasternodeTx: Reward address must be P2PKH or P2WPKH type (code 16)\', code: -26')
    }
  })

  // todo: need to fix
  it('should fail to update owner address with same address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, collateralAddress, P2WPKH)
    const addressDestKeyHash = addressDest.pubKeyHash

    const updateMasternode: UpdateMasternode = {
      nodeId: txid,
      updates: [
        {
          updateType: 0x01,
          address: { addressType: 0x04, addressPubKeyHash: addressDestKeyHash }
        }
      ]
    }

    const script = await providers.elliptic.script()
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
    const promise = sendTransaction(container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'Test UpdateMasternodeTx execution failed:\nMasternode with collateral address as operator or owner already exists', code: -32600, method: updatemasternode")
  })

  it('should fail to update another node with operator address that is already used', async () => {
    const pubKey1 = await providers.ellipticPair.publicKey()
    const collateralAddress1 = Bech32.fromPubKey(pubKey1, 'bcrt')
    await jsonRpc.masternode.createMasternode(collateralAddress1)
    const addressDest1: P2WPKH = P2WPKH.fromAddress(RegTest, collateralAddress1, P2WPKH)
    const addressDestKeyHash1 = addressDest1.pubKeyHash

    await providers.randomizeEllipticPair()
    await providers.setupMocks()
    const pubKey2 = await providers.ellipticPair.publicKey()
    const collateralAddress2 = Bech32.fromPubKey(pubKey2, 'bcrt')
    const masternodeId2 = await jsonRpc.masternode.createMasternode(collateralAddress2)

    await container.generate(20)

    const updateMasternode: UpdateMasternode = {
      nodeId: masternodeId2,
      updates: [
        {
          updateType: 0x02,
          address: { addressType: 0x04, addressPubKeyHash: addressDestKeyHash1 }
        }
      ]
    }

    const script = await providers.elliptic.script()
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
    const promise = sendTransaction(container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'bad-txns-customtx, UpdateMasternodeTx: Masternode with that operator address already exists (code 16)', code: -26")
  })
})
