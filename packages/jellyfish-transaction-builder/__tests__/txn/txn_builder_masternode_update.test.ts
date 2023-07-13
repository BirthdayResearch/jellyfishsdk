import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTest, RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { OP_CODES, Script, TransactionSegWit, UpdateMasternode } from '@defichain/jellyfish-transaction'
import { fromAddress, P2PKH, P2SH, P2WPKH } from '@defichain/jellyfish-address'
import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { Bech32, Elliptic, WIF } from '@defichain/jellyfish-crypto'
import { Testing, TestingGroup } from '@defichain/jellyfish-testing'

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
    await fundEllipticPair(container, providers.ellipticPair, 10)
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
  })

  it('should update owner address with P2WPKH address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const script1 = await providers.elliptic.script()

    const initialAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const masternodeId = await jsonRpc.masternode.createMasternode(initialAddress)
    await container.generate(20)

    const newAddress = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, newAddress, P2WPKH)
    const addressDestKeyHash = addressDest.pubKeyHash
    const script2 = await fromAddress(newAddress, 'regtest')?.script as Script

    const updateMasternode: UpdateMasternode = {
      nodeId: masternodeId,
      updates: [
        {
          updateType: 0x01,
          address: { addressType: 0x04, addressPubKeyHash: addressDestKeyHash }
        }
      ]
    }

    const rawCollateralTx = await jsonRpc.rawtx.getRawTransaction(masternodeId, true)
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script1, {
      txid: rawCollateralTx.txid,
      value: rawCollateralTx.vout[1].value,
      newOwnerScript: script2
    })
    const outs = await sendTransaction(container, txn)

    const encoded: string = OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    expect(outs.length).toStrictEqual(3)
    expect(outs[0]).toStrictEqual({
      n: 0,
      tokenId: 0,
      value: 0,
      scriptPubKey: {
        asm: expect.stringContaining('OP_RETURN 446654786d'),
        hex: expectedRedeemScript,
        type: 'nulldata'
      }
    })
    expect(outs[1]).toStrictEqual({
      n: 1,
      tokenId: 0,
      value: 2,
      scriptPubKey: {
        addresses: [newAddress],
        asm: expect.any(String),
        hex: expect.any(String),
        reqSigs: 1,
        type: 'witness_v0_keyhash'
      }
    })
    expect(outs[2]).toStrictEqual({
      n: 2,
      tokenId: 0,
      value: expect.any(Number),
      scriptPubKey: {
        addresses: [await providers.getAddress()],
        asm: expect.any(String),
        hex: expect.any(String),
        reqSigs: 1,
        type: 'witness_v0_keyhash'
      }
    })
    expect(outs[2].value).toBeGreaterThan(6.99)
    expect(outs[2].value).toBeLessThan(7)

    await container.generate(60)

    const masternodes = await jsonRpc.masternode.listMasternodes()
    expect(masternodes[masternodeId]).toStrictEqual(expect.objectContaining({
      state: 'ENABLED',
      ownerAuthAddress: newAddress
    }))
  })

  it('should update operator address with P2WPKH address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const masternodeId = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const address = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, address, P2WPKH)
    const addressDestKeyHash = addressDest.pubKeyHash

    const updateMasternode: UpdateMasternode = {
      nodeId: masternodeId,
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
    expect(outs[0]).toStrictEqual({
      n: 0,
      tokenId: 0,
      value: 0,
      scriptPubKey: {
        asm: expect.stringContaining('OP_RETURN 446654786d'),
        hex: expectedRedeemScript,
        type: 'nulldata'
      }
    })
    expect(outs[1]).toStrictEqual({
      n: 1,
      tokenId: 0,
      value: expect.any(Number),
      scriptPubKey: {
        addresses: [await providers.getAddress()],
        asm: expect.any(String),
        hex: expect.any(String),
        reqSigs: 1,
        type: 'witness_v0_keyhash'
      }
    })
    expect(outs[1].value).toBeGreaterThan(6.99)
    expect(outs[1].value).toBeLessThan(7)

    await container.generate(40)

    const masternodes = await jsonRpc.masternode.listMasternodes()
    expect(masternodes[masternodeId]).toStrictEqual(expect.objectContaining({
      state: 'ENABLED',
      operatorAuthAddress: address
    }))
  })

  it('should update reward address with P2WPKH address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const masternodeId = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const address = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, address, P2WPKH)
    const addressDestKeyHash = addressDest.pubKeyHash

    const updateMasternode: UpdateMasternode = {
      nodeId: masternodeId,
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
    expect(outs[0]).toStrictEqual({
      n: 0,
      tokenId: 0,
      value: 0,
      scriptPubKey: {
        asm: expect.stringContaining('OP_RETURN 446654786d'),
        hex: expectedRedeemScript,
        type: 'nulldata'
      }
    })
    expect(outs[1]).toStrictEqual({
      n: 1,
      tokenId: 0,
      value: expect.any(Number),
      scriptPubKey: {
        addresses: [await providers.getAddress()],
        asm: expect.any(String),
        hex: expect.any(String),
        reqSigs: 1,
        type: 'witness_v0_keyhash'
      }
    })
    expect(outs[1].value).toBeGreaterThan(6.99)
    expect(outs[1].value).toBeLessThan(7)

    await container.generate(40)

    const masternodes = await jsonRpc.masternode.listMasternodes()
    expect(masternodes[masternodeId]).toStrictEqual(expect.objectContaining({
      state: 'ENABLED',
      rewardAddress: address
    }))
  })

  it('should update multiple addresses simultaneously with P2WPKH address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const script1 = await providers.elliptic.script()

    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const masternodeId = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const ownerAddress = await container.getNewAddress('', 'bech32')
    const ownerAddressDest: P2WPKH = P2WPKH.fromAddress(RegTest, ownerAddress, P2WPKH)
    const ownerAddressDestKeyHash = ownerAddressDest.pubKeyHash
    const script2 = await fromAddress(ownerAddress, 'regtest')?.script as Script

    const operatorAddress = await container.getNewAddress('', 'bech32')
    const operatorAddressDest: P2WPKH = P2WPKH.fromAddress(RegTest, operatorAddress, P2WPKH)
    const operatorAddressDestKeyHash = operatorAddressDest.pubKeyHash

    const rewardAddress = await container.getNewAddress('', 'bech32')
    const rewardAddressDest: P2WPKH = P2WPKH.fromAddress(RegTest, rewardAddress, P2WPKH)
    const rewardAddressDestKeyHash = rewardAddressDest.pubKeyHash

    const updateMasternode: UpdateMasternode = {
      nodeId: masternodeId,
      updates: [
        {
          updateType: 0x01,
          address: { addressType: 0x04, addressPubKeyHash: ownerAddressDestKeyHash }
        },
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

    const rawCollateralTx = await jsonRpc.rawtx.getRawTransaction(masternodeId, true)
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script1, {
      txid: rawCollateralTx.txid,
      value: rawCollateralTx.vout[1].value,
      newOwnerScript: script2
    })
    const outs = await sendTransaction(container, txn)

    const encoded: string = OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    expect(outs.length).toStrictEqual(3)
    expect(outs[0]).toStrictEqual({
      n: 0,
      tokenId: 0,
      value: 0,
      scriptPubKey: {
        asm: expect.stringContaining('OP_RETURN 446654786d'),
        hex: expectedRedeemScript,
        type: 'nulldata'
      }
    })
    expect(outs[1]).toStrictEqual({
      n: 1,
      tokenId: 0,
      value: 2,
      scriptPubKey: {
        addresses: [ownerAddress],
        asm: expect.any(String),
        hex: expect.any(String),
        reqSigs: 1,
        type: 'witness_v0_keyhash'
      }
    })
    expect(outs[2]).toStrictEqual({
      n: 2,
      tokenId: 0,
      value: expect.any(Number),
      scriptPubKey: {
        addresses: [await providers.getAddress()],
        asm: expect.any(String),
        hex: expect.any(String),
        reqSigs: 1,
        type: 'witness_v0_keyhash'
      }
    })
    expect(outs[2].value).toBeGreaterThan(6.99)
    expect(outs[2].value).toBeLessThan(7)

    await container.generate(60)

    const masternodes = await jsonRpc.masternode.listMasternodes()
    expect(masternodes[masternodeId]).toStrictEqual(expect.objectContaining({
      state: 'ENABLED',
      ownerAuthAddress: ownerAddress,
      operatorAuthAddress: operatorAddress,
      rewardAddress: rewardAddress
    }))
  })

  it('should update multiple addresses simultaneously with P2PKH address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const script1 = await providers.elliptic.script()

    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const masternodeId = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const ownerAddress = await container.getNewAddress('', 'legacy')
    const ownerAddressDest: P2PKH = P2PKH.fromAddress(RegTest, ownerAddress, P2PKH)
    const ownerAddressDestHex = ownerAddressDest.hex
    const script2 = await fromAddress(ownerAddress, 'regtest')?.script as Script

    const operatorAddress = await container.getNewAddress('', 'legacy')
    const operatorAddressDest: P2PKH = P2PKH.fromAddress(RegTest, operatorAddress, P2PKH)
    const operatorAddressDestHex = operatorAddressDest.hex

    const rewardAddress = await container.getNewAddress('', 'legacy')
    const rewardAddressDest: P2PKH = P2PKH.fromAddress(RegTest, rewardAddress, P2PKH)
    const rewardAddressDestHex = rewardAddressDest.hex

    const updateMasternode: UpdateMasternode = {
      nodeId: masternodeId,
      updates: [
        {
          updateType: 0x01,
          address: { addressType: 0x01, addressPubKeyHash: ownerAddressDestHex }
        },
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

    const rawCollateralTx = await jsonRpc.rawtx.getRawTransaction(masternodeId, true)
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script1, {
      txid: rawCollateralTx.txid,
      value: rawCollateralTx.vout[1].value,
      newOwnerScript: script2
    })
    const outs = await sendTransaction(container, txn)

    const encoded: string = OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    expect(outs.length).toStrictEqual(3)
    expect(outs[0]).toStrictEqual({
      n: 0,
      tokenId: 0,
      value: 0,
      scriptPubKey: {
        asm: expect.stringContaining('OP_RETURN 446654786d'),
        hex: expectedRedeemScript,
        type: 'nulldata'
      }
    })
    expect(outs[1]).toStrictEqual({
      n: 1,
      tokenId: 0,
      value: 2,
      scriptPubKey: {
        addresses: [ownerAddress],
        asm: expect.any(String),
        hex: expect.any(String),
        reqSigs: 1,
        type: 'pubkeyhash'
      }
    })
    expect(outs[2]).toStrictEqual({
      n: 2,
      tokenId: 0,
      value: expect.any(Number),
      scriptPubKey: {
        addresses: [await providers.getAddress()],
        asm: expect.any(String),
        hex: expect.any(String),
        reqSigs: 1,
        type: 'witness_v0_keyhash'
      }
    })
    expect(outs[2].value).toBeGreaterThan(6.99)
    expect(outs[2].value).toBeLessThan(7)

    await container.generate(60)

    const masternodes = await jsonRpc.masternode.listMasternodes()
    expect(masternodes[masternodeId]).toStrictEqual(expect.objectContaining({
      state: 'ENABLED',
      ownerAuthAddress: ownerAddress,
      operatorAuthAddress: operatorAddress,
      rewardAddress: rewardAddress
    }))
  })

  it('should update remove reward address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const masternodeId = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const rewardAddress = await container.getNewAddress('', 'bech32')
    const rewardAddressDest: P2WPKH = P2WPKH.fromAddress(RegTest, rewardAddress, P2WPKH)
    const rewardAddressDestKeyHash = rewardAddressDest.pubKeyHash

    const setRewardAddressUpdate: UpdateMasternode = {
      nodeId: masternodeId,
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

    {
      const masternodes = await jsonRpc.masternode.listMasternodes()
      const mn = masternodes[masternodeId]
      expect(mn.rewardAddress).toStrictEqual(rewardAddress)
    }

    const updateMasternode: UpdateMasternode = {
      nodeId: masternodeId,
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
    expect(outs[0]).toStrictEqual({
      n: 0,
      tokenId: 0,
      value: 0,
      scriptPubKey: {
        asm: expect.stringContaining('OP_RETURN 446654786d'),
        hex: expectedRedeemScript,
        type: 'nulldata'
      }
    })
    expect(outs[1]).toStrictEqual({
      n: 1,
      tokenId: 0,
      value: expect.any(Number),
      scriptPubKey: {
        addresses: [await providers.getAddress()],
        asm: expect.any(String),
        hex: expect.any(String),
        reqSigs: 1,
        type: 'witness_v0_keyhash'
      }
    })
    expect(outs[1].value).toBeGreaterThan(6.99)
    expect(outs[1].value).toBeLessThan(7)

    await container.generate(50)

    {
      const masternodes = await jsonRpc.masternode.listMasternodes()
      const mn = masternodes[masternodeId]
      expect(mn.rewardAddress).toStrictEqual('')
    }
  })

  it('should fail if address is P2SH', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const masternodeId = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const script = await providers.elliptic.script()

    {
      const address = await container.getNewAddress('', 'p2sh-segwit')
      const addressDest: P2SH = P2SH.fromAddress(RegTest, address, P2SH)
      const addressDestHex = addressDest.hex
      const script2 = fromAddress(address, 'regtest')?.script as Script

      const updateMasternode: UpdateMasternode = {
        nodeId: masternodeId,
        updates: [{ updateType: 0x01, address: { addressType: 0x02, addressPubKeyHash: addressDestHex } }]
      }

      const rawCollateralTx = await jsonRpc.rawtx.getRawTransaction(masternodeId, true)
      const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script, {
        txid: rawCollateralTx.txid,
        value: rawCollateralTx.vout[1].value,
        newOwnerScript: script2
      })
      const promise = sendTransaction(container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow("DeFiDRpcError: 'bad-txns-customtx, UpdateMasternodeTx: Owner address must be P2PKH or P2WPKH type (code 16)', code: -26")
    }
    {
      const address = await container.getNewAddress('', 'p2sh-segwit')
      const addressDest: P2SH = P2SH.fromAddress(RegTest, address, P2SH)
      const addressDestHex = addressDest.hex

      const updateMasternode: UpdateMasternode = {
        nodeId: masternodeId,
        updates: [{ updateType: 0x02, address: { addressType: 0x02, addressPubKeyHash: addressDestHex } }]
      }
      const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
      const promise = sendTransaction(container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow("DeFiDRpcError: 'bad-txns-customtx, UpdateMasternodeTx: Operator address must be P2PKH or P2WPKH type (code 16)', code: -26")
    }
    // Updated: P2SH is allowed - https://github.com/DeFiCh/ain/pull/1664
    // {
    //   const address = await container.getNewAddress('', 'p2sh-segwit')
    //   const addressDest: P2SH = P2SH.fromAddress(RegTest, address, P2SH)
    //   const addressDestHex = addressDest.hex

    //   const updateMasternode: UpdateMasternode = {
    //     nodeId: masternodeId,
    //     updates: [{ updateType: 0x03, address: { addressType: 0x02, addressPubKeyHash: addressDestHex } }]
    //   }
    //   const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
    //   const promise = sendTransaction(container, txn)
    //   await expect(promise).rejects.toThrow(DeFiDRpcError)
    //   await expect(promise).rejects.toThrow("DeFiDRpcError: 'bad-txns-customtx, UpdateMasternodeTx: Reward address must be P2PKH or P2WPKH type (code 16)', code: -26")
    // }
  })

  it('should be failed as invalid address is not allowed', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const masternodeId = await jsonRpc.masternode.createMasternode(collateralAddress)

    await container.generate(20)

    const script = await providers.elliptic.script()

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

    // NOTE(canonbrother): panic as raw address is not verified on ain
    // {
    //   const invalidAddress = 'INVALID_ADDRESS'
    //   const updateMasternode: UpdateMasternode = {
    //     nodeId: masternodeId,
    //     updates: [{ updateType: 0x03, address: { addressType: 0x02, addressPubKeyHash: invalidAddress } }]
    //   }
    //   const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
    //   const promise = sendTransaction(container, txn)
    //   await expect(promise).rejects.toThrow(DeFiDRpcError)
    //   await expect(promise).rejects.toThrow('DeFiDRpcError: \'bad-txns-customtx, UpdateMasternodeTx: Reward address must be P2SH, P2PKH or P2WPKH type (code 16)\', code: -26')
    // }
  })

  it('should fail to update owner address without collateral transaction inputs', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const initialAddress = Bech32.fromPubKey(pubKey, 'bcrt')

    const masternodeId = await jsonRpc.masternode.createMasternode(initialAddress)
    await container.generate(20)

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
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
    const promise = sendTransaction(container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'bad-txns-customtx, UpdateMasternodeTx: Missing previous collateral from transaction inputs (code 16)', code: -26")
  })

  it('should fail to update owner address with same address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const initialAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const script1 = await providers.elliptic.script()

    const masternodeId = await jsonRpc.masternode.createMasternode(initialAddress)
    await container.generate(20)

    const newAddress = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, newAddress, P2WPKH)
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

    const rawCollateralTx = await jsonRpc.rawtx.getRawTransaction(masternodeId, true)
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script1, {
      txid: rawCollateralTx.txid,
      value: rawCollateralTx.vout[1].value,
      newOwnerScript: script1
    })
    const promise = sendTransaction(container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'bad-txns-customtx, UpdateMasternodeTx: Masternode with collateral address as operator or owner already exists (code 16)', code: -26")
  })

  it('should fail to update another node with operator address that is already used', async () => {
    const pubKey1 = await providers.ellipticPair.publicKey()
    const collateralAddress1 = Bech32.fromPubKey(pubKey1, 'bcrt')
    const addressDest1: P2WPKH = P2WPKH.fromAddress(RegTest, collateralAddress1, P2WPKH)
    const addressDestKeyHash1 = addressDest1.pubKeyHash

    await jsonRpc.masternode.createMasternode(collateralAddress1)
    await container.generate(20)

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

  it('should not update masternode while in PRE_ENABLED or TRANSFERRING state', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const script = await providers.elliptic.script()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const masternodeId = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(1)

    {
      const masternodes = await jsonRpc.masternode.listMasternodes()
      expect(masternodes[masternodeId]).toStrictEqual(expect.objectContaining({
        state: 'PRE_ENABLED',
        ownerAuthAddress: collateralAddress
      }))
    }

    const address = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, address, P2WPKH)
    const addressDestKeyHash = addressDest.pubKeyHash

    {
      const updateMasternode: UpdateMasternode = {
        nodeId: masternodeId,
        updates: [
          {
            updateType: 0x02,
            address: { addressType: 0x04, addressPubKeyHash: addressDestKeyHash }
          }
        ]
      }

      const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
      const promise = sendTransaction(container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow(`DeFiDRpcError: 'bad-txns-customtx, UpdateMasternodeTx: Masternode ${masternodeId} is not in 'ENABLED' state (code 16)', code: -26`)
    }

    await container.generate(20)

    {
      const masternodes = await jsonRpc.masternode.listMasternodes()
      expect(masternodes[masternodeId]).toStrictEqual(expect.objectContaining({
        state: 'ENABLED',
        ownerAuthAddress: collateralAddress
      }))
    }

    {
      const updateMasternode: UpdateMasternode = {
        nodeId: masternodeId,
        updates: [
          {
            updateType: 0x02,
            address: { addressType: 0x04, addressPubKeyHash: addressDestKeyHash }
          }
        ]
      }

      const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
      const outs = await sendTransaction(container, txn)

      const encoded: string = OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode).asBuffer().toString('hex')
      const expectedRedeemScript = `6a${encoded}`
      expect(outs.length).toStrictEqual(2)
      expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    }

    {
      const masternodes = await jsonRpc.masternode.listMasternodes()
      expect(masternodes[masternodeId]).toStrictEqual(expect.objectContaining({
        state: 'TRANSFERRING',
        ownerAuthAddress: collateralAddress
      }))
    }

    await container.generate(45)

    {
      const masternodes = await jsonRpc.masternode.listMasternodes()
      expect(masternodes[masternodeId]).toStrictEqual(expect.objectContaining({
        state: 'ENABLED',
        ownerAuthAddress: collateralAddress
      }))
    }
  })

  it('should update owner address twice', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const script1 = await providers.elliptic.script()

    const address1 = Bech32.fromPubKey(pubKey, 'bcrt')
    const masternodeId = await jsonRpc.masternode.createMasternode(address1)

    await container.generate(20)

    // create new elliptic pair for address, script and for updating provider's pair for signing later
    const ellipticPair2 = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
    const address2 = Bech32.fromPubKey(await ellipticPair2.publicKey(), 'bcrt')
    const addressDestKeyHash2 = P2WPKH.fromAddress(RegTest, address2, P2WPKH).pubKeyHash
    const script2 = await fromAddress(address2, 'regtest')?.script as Script

    // add private key to container
    const wif2 = WIF.encode(0xef, await ellipticPair2.privateKey())
    await container.call('importprivkey', [wif2])

    const updateMasternode2: UpdateMasternode = {
      nodeId: masternodeId,
      updates: [{ updateType: 0x01, address: { addressType: 0x04, addressPubKeyHash: addressDestKeyHash2 } }]
    }

    // masternodeId is used as collateral transaction id because collateralTx is empty after creating masternode
    const rawCollateralTx2 = await jsonRpc.rawtx.getRawTransaction(masternodeId, true)
    const txn2: TransactionSegWit = await builder.masternode.update(updateMasternode2, script1, {
      txid: rawCollateralTx2.txid,
      value: rawCollateralTx2.vout[1].value,
      newOwnerScript: script2
    })
    await sendTransaction(container, txn2)

    await container.generate(60)

    {
      const masternodes = await jsonRpc.masternode.listMasternodes()
      expect(masternodes[masternodeId]).toStrictEqual(expect.objectContaining({
        state: 'ENABLED',
        ownerAuthAddress: address2
      }))
    }

    // update provider's elliptic pair for signing next transaction with address2
    await providers.setEllipticPair(ellipticPair2)
    await fundEllipticPair(container, providers.ellipticPair, 10)

    await container.generate(1)

    const address3 = await container.getNewAddress('', 'bech32')
    const addressDestKeyHash3 = P2WPKH.fromAddress(RegTest, address3, P2WPKH).pubKeyHash
    const script3 = await fromAddress(address3, 'regtest')?.script as Script

    const updateMasternode: UpdateMasternode = {
      nodeId: masternodeId,
      updates: [{ updateType: 0x01, address: { addressType: 0x04, addressPubKeyHash: addressDestKeyHash3 } }]
    }

    // collateral transaction has id, search in listMasternodes
    const masternodes = await jsonRpc.masternode.listMasternodes()
    const mn = masternodes[masternodeId]
    const rawCollateralTx3 = await jsonRpc.rawtx.getRawTransaction(mn.collateralTx, true)

    const txn3: TransactionSegWit = await builder.masternode.update(updateMasternode, script2, {
      txid: rawCollateralTx3.txid,
      value: rawCollateralTx3.vout[1].value,
      newOwnerScript: script3
    })
    const outs3 = await sendTransaction(container, txn3)

    const encoded: string = OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    expect(outs3.length).toStrictEqual(3)
    expect(outs3[0]).toStrictEqual({
      n: 0,
      tokenId: 0,
      value: 0,
      scriptPubKey: {
        asm: expect.stringContaining('OP_RETURN 446654786d'),
        hex: expectedRedeemScript,
        type: 'nulldata'
      }
    })
    expect(outs3[1]).toStrictEqual({
      n: 1,
      tokenId: 0,
      value: 2,
      scriptPubKey: {
        addresses: [address3],
        asm: expect.any(String),
        hex: expect.any(String),
        reqSigs: 1,
        type: 'witness_v0_keyhash'
      }
    })
    expect(outs3[2]).toStrictEqual({
      n: 2,
      tokenId: 0,
      value: expect.any(Number),
      scriptPubKey: {
        addresses: [await providers.getAddress()],
        asm: expect.any(String),
        hex: expect.any(String),
        reqSigs: 1,
        type: 'witness_v0_keyhash'
      }
    })
    expect(outs3[2].value).toBeGreaterThan(9.99)
    expect(outs3[2].value).toBeLessThan(10)

    await container.generate(60)

    {
      const masternodes = await jsonRpc.masternode.listMasternodes()
      expect(masternodes[masternodeId]).toStrictEqual(expect.objectContaining({
        state: 'ENABLED',
        ownerAuthAddress: address3
      }))
    }
  })
})

describe('Update Masternode (Multi-containers)', () => {
  let tGroup: TestingGroup
  const node: Testing[] = []
  let builderNode1: P2WPKHTransactionBuilder
  let providersNode1: MockProviders

  beforeAll(async () => {
    tGroup = TestingGroup.create(2, i => new MasterNodeRegTestContainer(RegTestFoundationKeys[i]))
    await tGroup.start()
    node.push(tGroup.get(0))
    node.push(tGroup.get(1))
    await node[0].container.waitForWalletCoinbaseMaturity()
    await node[0].container.waitForWalletBalanceGTE(1000)
    providersNode1 = await getProviders(node[1].container)

    await providersNode1.randomizeEllipticPair()
    builderNode1 = new P2WPKHTransactionBuilder(providersNode1.fee, providersNode1.prevout, providersNode1.elliptic, RegTest)
    await fundEllipticPair(node[1].container, providersNode1.ellipticPair, 10)
    await providersNode1.setupMocks()

    await node[0].container.generate(1)
    await node[1].container.generate(1)
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

    const masternodeOwnerAddress0 = await node[0].rpc.wallet.getNewAddress()
    const masternodeId0 = await node[0].rpc.masternode.createMasternode(masternodeOwnerAddress0)
    await node[0].generate(100) // create masternode and wait for it to be enabled

    const operatorAddress0 = await node[0].rpc.wallet.getNewAddress()
    const operatorAddressDest0: P2WPKH = P2WPKH.fromAddress(RegTest, operatorAddress0, P2WPKH)
    const operatorAddressDestKeyHash0 = operatorAddressDest0.pubKeyHash
    const operatorScript = await fromAddress(operatorAddress0, 'regtest')?.script as Script
    await node[0].generate(4)
    await tGroup.waitForSync() // container2 should know about the new masternode

    const updateMasternode0: UpdateMasternode = {
      nodeId: masternodeId0,
      updates: [
        {
          updateType: 0x02,
          address: { addressType: 0x04, addressPubKeyHash: operatorAddressDestKeyHash0 }
        }
      ]
    }
    const txn: TransactionSegWit = await builderNode1.masternode.update(updateMasternode0, operatorScript)
    const promise = sendTransaction(node[1].container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'bad-txns-customtx, UpdateMasternodeTx: tx must have at least one input from the owner (code 16)\', code: -26')
  })
})
