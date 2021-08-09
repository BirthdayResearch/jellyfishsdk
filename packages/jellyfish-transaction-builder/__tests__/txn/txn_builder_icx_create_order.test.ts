import { MasterNodeRegTestContainer, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { OP_CODES, ICXCreateOrder, ICXOrderType } from '@defichain/jellyfish-transaction'
import { idDFI, accountBTC, accountDFI, ICXSetup, symbolDFI } from '../../../jellyfish-api-core/__tests__/category/icxorderbook/icx_setup'
import { WIF } from '@defichain/jellyfish-crypto'
import { ContainerAdapterClient } from '../../../jellyfish-api-core/__tests__/container_adapter_client'
import BigNumber from 'bignumber.js'

describe('create ICX order', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const icxSetup = new ICXSetup(container, client)
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey)) // set it to container default
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

    await providers.randomizeEllipticPair()
    await container.waitForWalletBalanceGTE(11)
    await providers.setupMocks()
    await fundEllipticPair(container, providers.ellipticPair, 50)

    // steps required for ICX setup
    await icxSetup.setAccounts(await providers.getAddress(), await providers.getAddress())
    await icxSetup.createBTCToken()
    await icxSetup.initializeTokensIds()
    await icxSetup.mintBTCtoken(100)
    await icxSetup.fundAccount(accountDFI, symbolDFI, 500)
    await icxSetup.fundAccount(accountBTC, symbolDFI, 10) // for fee
    await icxSetup.createBTCDFIPool()
    await icxSetup.addLiquidityToBTCDFIPool(1, 100)
    await icxSetup.setTakerFee(0.001)
  })

  afterAll(async () => {
    await container.stop()
  })

  afterEach(async () => {
    await icxSetup.closeAllOpenOffers()
  })

  it('should create internal ICX order', async () => {
    const script = await providers.elliptic.script()
    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.INTERNAL,
      tokenId: parseInt(idDFI),
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

    const currentHeight: number = await container.call('getblockcount') // Get current block count to calculate expiry
    const expectedExpireHeight = currentHeight + icxOrder.expiry

    expect(order).toStrictEqual({
      status: 'OPEN',
      type: 'INTERNAL',
      tokenFrom: 'DFI',
      chainTo: 'BTC',
      receivePubkey: icxOrder.receivePubkey,
      amountFrom: icxOrder.amountFrom.toNumber(),
      amountToFill: icxOrder.amountFrom.toNumber(),
      orderPrice: icxOrder.orderPrice.toNumber(),
      amountToFillInToAsset: icxOrder.amountFrom.multipliedBy(icxOrder.orderPrice).toNumber(),
      ownerAddress: await providers.getAddress(),
      height: currentHeight,
      expireHeight: expectedExpireHeight
    })
  })

  it('should create external ICX order', async () => {
    const script = await providers.elliptic.script()
    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.EXTERNAL,
      tokenId: parseInt(idDFI),
      ownerAddress: script,
      amountFrom: new BigNumber(2),
      orderPrice: new BigNumber(1000),
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

    const currentHeight: number = await container.call('getblockcount') // Get current block count to calculate expiry
    const expectedExpireHeight = currentHeight + icxOrder.expiry

    expect(order).toStrictEqual({
      status: 'OPEN',
      type: 'EXTERNAL',
      chainFrom: 'BTC',
      tokenTo: 'DFI',
      amountFrom: icxOrder.amountFrom.toNumber(),
      amountToFill: icxOrder.amountFrom.toNumber(),
      orderPrice: icxOrder.orderPrice.toNumber(),
      amountToFillInToAsset: icxOrder.amountFrom.multipliedBy(icxOrder.orderPrice).toNumber(),
      ownerAddress: await providers.getAddress(),
      height: currentHeight,
      expireHeight: expectedExpireHeight
    })
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
