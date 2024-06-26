import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTest } from '@defichain/jellyfish-network'
import { CreateMasternode, OP_CODES, TransactionSegWit } from '@defichain/jellyfish-transaction'
import { P2PKH, P2SH, P2WPKH } from '@defichain/jellyfish-address'
import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'

describe('CreateMasternode', () => {
  const container = new MasterNodeRegTestContainer()
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder
  let jsonRpc: JsonRpcClient

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(1001)

    jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())
    providers = await getProviders(container)
  })

  afterAll(async () => {
    await container.stop()
  })

  beforeEach(async () => {
    await providers.randomizeEllipticPair()
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    // Note(canonbrother): in regtest, collateral amount must be equal to 2 and creation fee must be greater than 1
    // https://github.com/DeFiCh/ain/blob/85360ad432ae8c5ecbfbfc7d63dd5bc6fe41e875/src/masternodes/mn_checks.cpp#L439-L446
    // 0.00000755 is added for calculateFeeP2WPKH deduction, 3(total) - 1(creationFee) = 2(collateralAmount)
    await fundEllipticPair(container, providers.ellipticPair, 3 + 0.00000755)
    await providers.setupMocks()
  })

  it('should create with P2PKH address', async () => {
    const balance = await container.call('getbalance')
    expect(balance >= 2).toBeTruthy()

    const masternodesBefore = await jsonRpc.masternode.listMasternodes()
    const masternodesBeforeLength = Object.keys(masternodesBefore).length

    const address = await container.getNewAddress('', 'legacy')
    const addressDest: P2PKH = P2PKH.fromAddress(RegTest, address, P2PKH)
    const addressDestHex = addressDest.hex

    const createMasternode: CreateMasternode = {
      operatorType: 0x01,
      operatorPubKeyHash: addressDestHex
    }

    const script = await providers.elliptic.script()

    const txn: TransactionSegWit = await builder.masternode.create(createMasternode, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_CREATE_MASTER_NODE(createMasternode).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(container, txn)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(1)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547843')).toBeTruthy()
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toStrictEqual(2)
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.reqSigs).toStrictEqual(1)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    await container.generate(1)

    const masternodesAfter = await jsonRpc.masternode.listMasternodes()
    const masternodesAfterLength = Object.keys(masternodesAfter).length
    expect(masternodesAfterLength).toStrictEqual(masternodesBeforeLength + 1)
  })

  it('should create with PKWPKH', async () => {
    const balance = await container.call('getbalance')
    expect(balance >= 2).toBeTruthy()

    const masternodesBefore = await jsonRpc.masternode.listMasternodes()
    const masternodesBeforeLength = Object.keys(masternodesBefore).length

    const address = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, address, P2WPKH)
    const addressDestKeyHash = addressDest.pubKeyHash

    const createMasternode: CreateMasternode = {
      operatorType: 0x04,
      operatorPubKeyHash: addressDestKeyHash
    }

    const script = await providers.elliptic.script()

    const txn: TransactionSegWit = await builder.masternode.create(createMasternode, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_CREATE_MASTER_NODE(createMasternode).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(container, txn)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(1)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547843')).toBeTruthy()
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toStrictEqual(2)
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.reqSigs).toStrictEqual(1)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const masternodesAfter = await jsonRpc.masternode.listMasternodes()
    const masternodesAfterLength = Object.keys(masternodesAfter).length
    expect(masternodesAfterLength).toStrictEqual(masternodesBeforeLength + 1)
  })

  it('should be failed if address is P2SH, other than P2PKH AND P2WPKH', async () => {
    const address = await container.getNewAddress('', 'p2sh-segwit')
    const addressDest: P2SH = P2SH.fromAddress(RegTest, address, P2SH)
    const addressDestKeyHash = addressDest.hex

    const createMasternode: CreateMasternode = {
      operatorType: 0x02,
      operatorPubKeyHash: addressDestKeyHash
    }

    const script = await providers.elliptic.script()

    const txn: TransactionSegWit = await builder.masternode.create(createMasternode, script)

    const promise = sendTransaction(container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('CreateMasternodeTx: bad owner and|or operator address (should be P2PKH or P2WPKH only) or node with those addresses exists')
  })

  it('should be failed while collateral is not 2', async () => {
    expect.assertions(2)

    const balanceBefore = await container.call('getbalance')

    await container.call('sendtoaddress', ['bcrt1ql0ys2ahu4e9uhjn2l0mehhh4e0mmh7npyhx0re', balanceBefore - 2])

    const balanceAfter = await container.call('getbalance')
    expect(balanceAfter < 2).toBeTruthy()

    const address = await container.getNewAddress('', 'legacy')
    const addressDest: P2PKH = P2PKH.fromAddress(RegTest, address, P2PKH)
    const addressDestHex = addressDest.hex

    const createMasternode: CreateMasternode = {
      operatorType: 0x01,
      operatorPubKeyHash: addressDestHex
    }

    await fundEllipticPair(container, providers.ellipticPair, 1.1)

    const script = await providers.elliptic.script()

    const txn: TransactionSegWit = await builder.masternode.create(createMasternode, script)

    try {
      await sendTransaction(container, txn)
    } catch (err) {
      expect(err.message).toStrictEqual('DeFiDRpcError: \'CreateMasternodeTx: malformed tx vouts (wrong creation fee or collateral amount)\', code: -26')
    }
  })
})

describe('CreateMasternode with timelock', () => {
  const container = new MasterNodeRegTestContainer()
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder
  let jsonRpc: JsonRpcClient

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(1001)

    jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())
    providers = await getProviders(container)
  })

  afterAll(async () => {
    await container.stop()
  })

  beforeEach(async () => {
    await providers.randomizeEllipticPair()
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    // 0.00000755 is added for calculateFeeP2WPKH deduction
    // with timelock fee increases 0.000001
    await fundEllipticPair(container, providers.ellipticPair, 3 + 0.00000755)
    await providers.setupMocks()
  })

  it('should create with timelock', async () => {
    const balance = await container.call('getbalance')
    expect(balance >= 2).toBeTruthy()

    const masternodesBefore = await jsonRpc.masternode.listMasternodes()
    const masternodesBeforeLength = Object.keys(masternodesBefore).length

    const address = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, address, P2WPKH)
    const addressDestKeyHash = addressDest.pubKeyHash

    const createMasternode: CreateMasternode = {
      operatorType: 0x04,
      operatorPubKeyHash: addressDestKeyHash,
      timelock: 0x0104
    }

    const script = await providers.elliptic.script()

    const txn: TransactionSegWit = await builder.masternode.create(createMasternode, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_CREATE_MASTER_NODE(createMasternode).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(container, txn)

    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(1)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547843')).toBeTruthy()
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toStrictEqual(2)
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.reqSigs).toStrictEqual(1)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const masternodesAfter = await jsonRpc.masternode.listMasternodes()
    const masternodesAfterLength = Object.keys(masternodesAfter).length
    expect(masternodesAfterLength).toStrictEqual(masternodesBeforeLength + 1)
  })

  it('should be failed as timelock should be only specified in 5 or 10 years', async () => {
    const address = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, address, P2WPKH)
    const addressDestKeyHash = addressDest.pubKeyHash

    const createMasternode: CreateMasternode = {
      operatorType: 0x04,
      operatorPubKeyHash: addressDestKeyHash,
      timelock: 0x0410 // 20 years
    }

    const script = await providers.elliptic.script()

    const txn: TransactionSegWit = await builder.masternode.create(createMasternode, script)

    const promise = sendTransaction(container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('CreateMasternodeTx: Timelock must be set to either 0, 5 or 10 years')
  })
})
