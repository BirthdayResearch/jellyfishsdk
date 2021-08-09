import { MasterNodeRegTestContainer, GenesisKeys } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../../jellyfish-api-core/__tests__/container_adapter_client'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { WIF } from '@defichain/jellyfish-crypto'
import { calculateTxid, sendTransaction } from '../test.utils'
import BigNumber from 'bignumber.js'
import { OP_CODES, ICXMakeOffer } from '@defichain/jellyfish-transaction'
import { accountBTC, accountDFI, ICXSetup, symbolDFI, idDFI, ICX_TAKERFEE_PER_BTC, DEX_DFI_PER_BTC_RATE } from '../../../jellyfish-api-core/__tests__/category/icxorderbook/icx_setup'
import { ICXOrderInfo, ICXOfferInfo } from '@defichain/jellyfish-api-core/category/icxorderbook'

describe('make ICX offer', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const icxSetup = new ICXSetup(container, client)
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder
  const setTakerFee = 0.001

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey)) // set it to container default
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

    // steps required for ICX setup
    await icxSetup.setAccounts(await providers.getAddress(), await providers.getAddress())
    await icxSetup.createBTCToken()
    await icxSetup.initializeTokensIds()
    await icxSetup.mintBTCtoken(100)
    await icxSetup.fundAccount(accountDFI, symbolDFI, 500)
    await icxSetup.fundAccount(accountBTC, symbolDFI, 10) // for fee
    await icxSetup.createBTCDFIPool()
    await icxSetup.addLiquidityToBTCDFIPool(1, 100)
    await icxSetup.setTakerFee(setTakerFee)
  })

  afterAll(async () => {
    await container.stop()
  })

  afterEach(async () => {
    await icxSetup.closeAllOpenOffers()
  })

  it('should make internal ICX offer', async () => {
    const icxOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const orderResult = await client.icxorderbook.createOrder(icxOrder)
    const createOrderTxId = orderResult.txid
    await container.generate(1)

    const script = await providers.elliptic.script()
    const icxOffer: ICXMakeOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.1),
      ownerAddress: script,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1942',
      expiry: 20,
      takerFee: new BigNumber(0.01)
    }

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')

    const txn = await builder.icx.makeOffer(icxOffer, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_MAKE_OFFER(icxOffer).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(container, txn)
    expect(outs.length).toEqual(2)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547832')).toStrictEqual(true)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const accountBTCAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // check fee of 0.01 DFI has been reduced from the accountBTCBefore[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI].minus(0.01))

    const listOrders: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [{ orderTx: createOrderTxId }], 'bignumber')
    const txid = calculateTxid(txn)
    const order = listOrders[txid] as ICXOfferInfo

    const currentHeight: number = await container.call('getblockcount') // Get current block count to calculate expiry
    const expectedExpireHeight = new BigNumber(currentHeight + icxOffer.expiry)

    expect(order.orderTx).toStrictEqual(icxOffer.orderTx)
    expect(order.status).toStrictEqual('OPEN')
    expect(order.amount).toStrictEqual(icxOffer.amount)
    expect(order.amountInFromAsset).toStrictEqual(icxOffer.amount.dividedBy(icxOrder.orderPrice))
    expect(order.ownerAddress).toStrictEqual(accountDFI)
    expect(order.takerFee).toStrictEqual(icxOffer.amount.multipliedBy(ICX_TAKERFEE_PER_BTC).multipliedBy(DEX_DFI_PER_BTC_RATE))
    expect(order.expireHeight).toStrictEqual(expectedExpireHeight)
  })

  it('should make external ICX offer', async () => {
    const icxOrder = {
      chainFrom: 'BTC',
      tokenTo: idDFI,
      ownerAddress: accountDFI,
      amountFrom: new BigNumber(2),
      orderPrice: new BigNumber(100)
    }
    const orderResult = await client.icxorderbook.createOrder(icxOrder)
    const createOrderTxId = orderResult.txid
    await container.generate(1)

    const script = await providers.elliptic.script()
    const icxOffer: ICXMakeOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(100),
      ownerAddress: script,
      receivePubkey: '0348790cb93b203a8ea5ce07279cb209d807b535b2ca8b0988a6f7a6578e41f7a5',
      expiry: 20,
      takerFee: new BigNumber(0.01)
    }

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')

    const txn = await builder.icx.makeOffer(icxOffer, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_MAKE_OFFER(icxOffer).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(container, txn)
    expect(outs.length).toEqual(2)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547832')).toStrictEqual(true)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const accountBTCAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // check fee of 0.01 DFI has been reduced from the accountBTCBefore[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI].minus(0.1))

    const listOrders: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [{ orderTx: createOrderTxId }], 'bignumber')
    const txid = calculateTxid(txn)
    const order = listOrders[txid] as ICXOfferInfo

    const currentHeight: number = await container.call('getblockcount') // Get current block count to calculate expiry
    const expectedExpireHeight = new BigNumber(currentHeight + icxOffer.expiry)

    expect(order.orderTx).toStrictEqual(icxOffer.orderTx)
    expect(order.status).toStrictEqual('OPEN')
    expect(order.amount).toStrictEqual(icxOffer.amount)
    expect(order.amountInFromAsset).toStrictEqual(icxOffer.amount.dividedBy(icxOrder.orderPrice))
    expect(order.ownerAddress).toStrictEqual(accountDFI)
    expect(order.takerFee).toStrictEqual(icxOffer.amount.multipliedBy(ICX_TAKERFEE_PER_BTC))
    expect(order.expireHeight).toStrictEqual(expectedExpireHeight)
    expect(order.receivePubkey).toStrictEqual(icxOffer.receivePubkey)
  })
})
