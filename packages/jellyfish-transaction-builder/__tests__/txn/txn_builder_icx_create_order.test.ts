import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import BigNumber from 'bignumber.js'
import { OP_CODES, ICXCreateOrder, ICXOrderType } from '@defichain/jellyfish-transaction'

describe('create ICX order', () => {
  const container = new MasterNodeRegTestContainer()
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(container)
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)
  })

  afterAll(async () => {
    await container.stop()
  })

  beforeEach(async () => {
    await providers.randomizeEllipticPair()
    await container.waitForWalletBalanceGTE(11)
    await fundEllipticPair(container, providers.ellipticPair, 10)
    await providers.setupMocks()
    await fundEllipticPair(container, providers.ellipticPair, 20)
  })

  it('should create ICX order', async () => {
    const script = await providers.elliptic.script()
    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.EXTERNAL,
      tokenId: 0,
      ownerAddress: script,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01),
      expiry: 2880
    }

    const txn = await builder.icx.createOrder(icxOrder, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_CREATE_ORDER(icxOrder).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(container, txn)
    expect(outs.length).toEqual(2)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547831')).toBeTruthy()
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const listOrders = await container.call('icx_listorders')
    const txid = calculateTxid(txn)
    const order = listOrders[txid]

    expect(order.status).toStrictEqual('OPEN')
    expect(order.type).toStrictEqual('EXTERNAL')
    expect(order.chainFrom).toStrictEqual('BTC')
    expect(order.tokenTo).toStrictEqual('DFI')
    expect(order.amountFrom).toStrictEqual(icxOrder.amountFrom.toNumber())
    expect(order.amountToFill).toStrictEqual(icxOrder.amountFrom.toNumber())
    expect(order.orderPrice).toStrictEqual(icxOrder.orderPrice.toNumber())
    expect(order.amountToFillInToAsset).toStrictEqual(icxOrder.amountFrom.multipliedBy(icxOrder.orderPrice).toNumber())
    expect(order.ownerAddress).toStrictEqual(await providers.getAddress())
    expect(typeof order.height).toStrictEqual('number')
    expect(typeof order.expireHeight).toStrictEqual('number')
  })

  it('should create ICX order without receivePubkey', async () => {
    const script = await providers.elliptic.script()
    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.EXTERNAL,
      tokenId: 0,
      ownerAddress: script,
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01),
      expiry: 2880
    }

    const txn = await builder.icx.createOrder(icxOrder, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_CREATE_ORDER(icxOrder).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(container, txn)
    expect(outs.length).toEqual(2)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547831')).toBeTruthy()
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const listOrders = await container.call('icx_listorders')
    const txid = calculateTxid(txn)
    const order = listOrders[txid]

    expect(order.status).toStrictEqual('OPEN')
    expect(order.type).toStrictEqual('EXTERNAL')
    expect(order.chainFrom).toStrictEqual('BTC')
    expect(order.tokenTo).toStrictEqual('DFI')
    expect(order.amountFrom).toStrictEqual(icxOrder.amountFrom.toNumber())
    expect(order.amountToFill).toStrictEqual(icxOrder.amountFrom.toNumber())
    expect(order.orderPrice).toStrictEqual(icxOrder.orderPrice.toNumber())
    expect(order.amountToFillInToAsset).toStrictEqual(icxOrder.amountFrom.multipliedBy(icxOrder.orderPrice).toNumber())
    expect(order.ownerAddress).toStrictEqual(await providers.getAddress())
    expect(typeof order.height).toStrictEqual('number')
    expect(typeof order.expireHeight).toStrictEqual('number')
  })

  it('should reject invalid negative orderPrice', async () => {
    const script = await providers.elliptic.script()
    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.EXTERNAL,
      tokenId: 0,
      ownerAddress: script,
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(-0.01),
      expiry: 2880
    }

    await expect(builder.icx.createOrder(icxOrder, script)).rejects.toThrow('The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received -1000000')
  })
})
