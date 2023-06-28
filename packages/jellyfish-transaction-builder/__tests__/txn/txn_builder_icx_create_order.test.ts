import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction, TxOut } from '../test.utils'
import { ICXCreateOrder, ICXOrderType, OP_CODES } from '@defichain/jellyfish-transaction'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'

describe('create ICX order', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/icx': 'true'
      }
    })

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey)) // set it to testing.container default
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    await testing.icxorderbook.setAccounts(await providers.getAddress(), await providers.getAddress())
    await testing.rpc.account.utxosToAccount({ [testing.icxorderbook.accountDFI]: `${500}@${testing.icxorderbook.symbolDFI}` })
    await testing.rpc.account.utxosToAccount({ [testing.icxorderbook.accountBTC]: `${10}@${testing.icxorderbook.symbolDFI}` }) // for fee
    await testing.generate(1)
    await testing.fixture.createPoolPair({
      a: { amount: '1', symbol: testing.icxorderbook.symbolBTC },
      b: { amount: '100', symbol: testing.icxorderbook.symbolDFI }
    })
    testing.icxorderbook.DEX_DFI_PER_BTC_RATE = new BigNumber(100 / 1)
    await testing.icxorderbook.setTakerFee(new BigNumber(0.001))
    await testing.icxorderbook.initializeTokensIds()

    await testing.container.waitForWalletBalanceGTE(10)
    await fundEllipticPair(testing.container, providers.elliptic.ellipticPair, 10)
    await providers.setupMocks()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  afterEach(async () => {
    await testing.icxorderbook.closeAllOpenOffers()
  })

  async function assertTxOuts (outs: TxOut[], expectedRedeemScript: string): Promise<void> {
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547831')).toStrictEqual(true)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toStrictEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())
  }

  it('should create internal ICX order with uncompressed public key', async () => {
    const script = await providers.elliptic.script()
    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.INTERNAL,
      tokenId: parseInt(testing.icxorderbook.idDFI),
      ownerAddress: script,
      receivePubkey: '0479013ea14516aa8a06d5f457f5bb340b69cf83c4ab423f899aa2f299fd05fa0afe7d29635fb0225995debcbce1d92675c84dfd13ed794effede594aee62debe2',
      amountFrom: new BigNumber(15),
      amountToFill: new BigNumber(15),
      orderPrice: new BigNumber(0.01),
      expiry: 2880
    }

    const txn = await builder.icxorderbook.createOrder(icxOrder, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_CREATE_ORDER(icxOrder).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    await assertTxOuts(outs, expectedRedeemScript)

    const listOrders = await testing.rpc.icxorderbook.listOrders()
    const txid = calculateTxid(txn)
    const order = listOrders[txid]

    const currentHeight = await testing.container.getBlockCount() // Get current block count to calculate expiry
    const expectedExpireHeight = currentHeight + icxOrder.expiry

    expect(order).toStrictEqual({
      status: 'OPEN',
      type: 'INTERNAL',
      tokenFrom: 'DFI',
      chainTo: 'BTC',
      receivePubkey: icxOrder.receivePubkey,
      amountFrom: icxOrder.amountFrom,
      amountToFill: icxOrder.amountFrom,
      orderPrice: icxOrder.orderPrice,
      amountToFillInToAsset: icxOrder.amountFrom.multipliedBy(icxOrder.orderPrice),
      ownerAddress: await providers.getAddress(),
      height: new BigNumber(currentHeight),
      expireHeight: new BigNumber(expectedExpireHeight)
    })
  })

  it('should create internal ICX order with compressed public key', async () => {
    const script = await providers.elliptic.script()
    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.INTERNAL,
      tokenId: parseInt(testing.icxorderbook.idDFI),
      ownerAddress: script,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      amountToFill: new BigNumber(15),
      orderPrice: new BigNumber(0.01),
      expiry: 2880
    }

    const txn = await builder.icxorderbook.createOrder(icxOrder, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_CREATE_ORDER(icxOrder).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    await assertTxOuts(outs, expectedRedeemScript)

    const listOrders = await testing.rpc.icxorderbook.listOrders()
    const txid = calculateTxid(txn)
    const order = listOrders[txid]

    const currentHeight = await testing.container.getBlockCount() // Get current block count to calculate expiry
    const expectedExpireHeight = currentHeight + icxOrder.expiry

    expect(order).toStrictEqual({
      status: 'OPEN',
      type: 'INTERNAL',
      tokenFrom: 'DFI',
      chainTo: 'BTC',
      receivePubkey: icxOrder.receivePubkey,
      amountFrom: icxOrder.amountFrom,
      amountToFill: icxOrder.amountFrom,
      orderPrice: icxOrder.orderPrice,
      amountToFillInToAsset: icxOrder.amountFrom.multipliedBy(icxOrder.orderPrice),
      ownerAddress: await providers.getAddress(),
      height: new BigNumber(currentHeight),
      expireHeight: new BigNumber(expectedExpireHeight)
    })
  })

  it('should create external ICX order', async () => {
    const script = await providers.elliptic.script()
    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.EXTERNAL,
      tokenId: parseInt(testing.icxorderbook.idDFI),
      ownerAddress: script,
      amountFrom: new BigNumber(2),
      amountToFill: new BigNumber(2),
      orderPrice: new BigNumber(1000),
      expiry: 2880
    }

    const txn = await builder.icxorderbook.createOrder(icxOrder, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_CREATE_ORDER(icxOrder).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    await assertTxOuts(outs, expectedRedeemScript)

    const listOrders = await testing.rpc.icxorderbook.listOrders()
    const txid = calculateTxid(txn)
    const order = listOrders[txid]

    const currentHeight = await testing.container.getBlockCount() // Get current block count to calculate expiry
    const expectedExpireHeight = currentHeight + icxOrder.expiry

    expect(order).toStrictEqual({
      status: 'OPEN',
      type: 'EXTERNAL',
      chainFrom: 'BTC',
      tokenTo: 'DFI',
      amountFrom: icxOrder.amountFrom,
      amountToFill: icxOrder.amountFrom,
      orderPrice: icxOrder.orderPrice,
      amountToFillInToAsset: icxOrder.amountFrom.multipliedBy(icxOrder.orderPrice),
      ownerAddress: await providers.getAddress(),
      height: new BigNumber(currentHeight),
      expireHeight: new BigNumber(expectedExpireHeight)
    })
  })

  it('should reject invalid negative orderPrice', async () => {
    const script = await providers.elliptic.script()
    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.EXTERNAL,
      tokenId: 0,
      ownerAddress: script,
      amountFrom: new BigNumber(15),
      amountToFill: new BigNumber(15),
      orderPrice: new BigNumber(-0.01),
      expiry: 2880
    }

    await expect(builder.icxorderbook.createOrder(icxOrder, script)).rejects.toThrow('The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received -1000000')
  })

  it('should reject invalid negative amountFrom', async () => {
    const script = await providers.elliptic.script()
    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.EXTERNAL,
      tokenId: 0,
      ownerAddress: script,
      amountFrom: new BigNumber(-15),
      amountToFill: new BigNumber(-15),
      orderPrice: new BigNumber(0.01),
      expiry: 2880
    }

    await expect(builder.icxorderbook.createOrder(icxOrder, script)).rejects.toThrow('The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received -1500000000')
  })

  it('should reject invalid negative expiry', async () => {
    const script = await providers.elliptic.script()
    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.EXTERNAL,
      tokenId: 0,
      ownerAddress: script,
      amountFrom: new BigNumber(15),
      amountToFill: new BigNumber(15),
      orderPrice: new BigNumber(0.01),
      expiry: -2880
    }

    await expect(builder.icxorderbook.createOrder(icxOrder, script)).rejects.toThrow('The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received -2880')
  })

  it('should reject with wrong receivePubkey length', async () => {
    const script = await providers.elliptic.script()
    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.INTERNAL,
      tokenId: parseInt(testing.icxorderbook.idDFI),
      ownerAddress: script,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941' + '1234', // compressed public key + 2 extra bytes
      amountFrom: new BigNumber(15),
      amountToFill: new BigNumber(15),
      orderPrice: new BigNumber(0.01),
      expiry: 2880
    }

    await expect(builder.icxorderbook.createOrder(icxOrder, script)).rejects.toThrow('Create order receivePubkey buffer length should be 33 (COMPRESSED_PUBLIC_KEY_SIZE) or 65 (PUBLIC_KEY_SIZE)')
  })

  it('should reject with amountToFIll !== amountFrom', async () => {
    const script = await providers.elliptic.script()
    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.INTERNAL,
      tokenId: parseInt(testing.icxorderbook.idDFI),
      ownerAddress: script,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      amountToFill: new BigNumber(14),
      orderPrice: new BigNumber(0.01),
      expiry: 2880
    }

    await expect(builder.icxorderbook.createOrder(icxOrder, script)).rejects.toThrow('Create order amountToFill should always equal amountFrom')
  })
})
