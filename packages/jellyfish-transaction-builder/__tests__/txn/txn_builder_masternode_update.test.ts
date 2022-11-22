import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTest } from '@defichain/jellyfish-network'
import { OP_CODES, TransactionSegWit, UpdateMasternode } from '@defichain/jellyfish-transaction'
import { P2PKH, P2SH, P2WPKH } from '@defichain/jellyfish-address'
import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { Bech32 } from '@defichain/jellyfish-crypto'

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

    const balance = await container.call('getbalance')
    expect(balance >= 2).toBeTruthy()
  })

  // todo: unskip after https://github.com/DeFiCh/ain/pull/1584 is in prerelease to use image
  it.skip('should update owner address with P2WPKH address', async () => {
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
          updateType: 0x01,
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

  it('should update multiple addresses with P2WPKH address', async () => {
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

  it('should update multiple address with P2PKH address', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const operatorAddress = await container.getNewAddress('', 'legacy')
    const operatorAddressDest: P2PKH = P2PKH.fromAddress(RegTest, operatorAddress, P2PKH)
    const operatorAddressDestHex = operatorAddressDest.hex

    const rewardAddress = await container.getNewAddress('', 'bech32')
    const rewardAddressDest: P2WPKH = P2WPKH.fromAddress(RegTest, rewardAddress, P2WPKH)
    const rewardAddressDestHex = rewardAddressDest.pubKeyHash

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
          updateType: 0x04
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

  // todo: unskip after https://github.com/DeFiCh/ain/pull/1584 is in prerelease to use image
  it.skip('should be failed if owner address is P2SH', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const address = await container.getNewAddress('', 'p2sh-segwit')
    const addressDest: P2SH = P2SH.fromAddress(RegTest, address, P2SH)
    const addressDestHex = addressDest.hex

    const updateMasternode: UpdateMasternode = {
      nodeId: txid,
      updates: [
        {
          updateType: 0x01,
          address: { addressType: 0x02, addressPubKeyHash: addressDestHex }
        }
      ]
    }

    const script = await providers.elliptic.script()
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)

    const promise = sendTransaction(container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'bad-txns-customtx, UpdateMasternodeTx: Owner address must be P2PKH or P2WPKH type (code 16)', code: -26")
  })

  it('should be failed if operator address is P2SH', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const address = await container.getNewAddress('', 'p2sh-segwit')
    const addressDest: P2SH = P2SH.fromAddress(RegTest, address, P2SH)
    const addressDestHex = addressDest.hex

    const updateMasternode: UpdateMasternode = {
      nodeId: txid,
      updates: [
        {
          updateType: 0x02,
          address: { addressType: 0x02, addressPubKeyHash: addressDestHex }
        }
      ]
    }

    const script = await providers.elliptic.script()
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)

    const promise = sendTransaction(container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'bad-txns-customtx, UpdateMasternodeTx: Operator address must be P2PKH or P2WPKH type (code 16)', code: -26")
  })

  it('should be failed if reward address is P2SH', async () => {
    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const address = await container.getNewAddress('', 'p2sh-segwit')
    const addressDest: P2SH = P2SH.fromAddress(RegTest, address, P2SH)
    const addressDestHex = addressDest.hex

    const updateMasternode: UpdateMasternode = {
      nodeId: txid,
      updates: [
        {
          updateType: 0x03,
          address: { addressType: 0x02, addressPubKeyHash: addressDestHex }
        }
      ]
    }

    const script = await providers.elliptic.script()
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)

    const promise = sendTransaction(container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'bad-txns-customtx, UpdateMasternodeTx: Reward address must be P2PKH or P2WPKH type (code 16)', code: -26")
  })
})
