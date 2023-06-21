import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ICXGenericResult,
  ICXOffer,
  ICXOfferInfo,
  ICXOrder,
  ICXOrderInfo,
  ICXOrderStatus,
  ICXOrderType
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import {
  accountBTC,
  accountDFI,
  DEX_DFI_PER_BTC_RATE,
  ICX_TAKERFEE_PER_BTC,
  ICXSetup,
  idDFI,
  symbolDFI
} from './icx_setup'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('ICXOrderBook.makeOffer', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const icxSetup = new ICXSetup(container, client)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await icxSetup.createAccounts()
    await icxSetup.createBTCToken()
    await icxSetup.initializeTokensIds()
    await icxSetup.mintBTCtoken(100)
    await icxSetup.fundAccount(accountDFI, symbolDFI, 500)
    await icxSetup.fundAccount(accountBTC, symbolDFI, 10) // for fee
    await icxSetup.createBTCDFIPool()
    await icxSetup.addLiquidityToBTCDFIPool(1, 100)
    await icxSetup.setTakerFee(0.001)
    await icxSetup.setupICXFlag()
  })

  afterAll(async () => {
    await container.stop()
  })

  afterEach(async () => {
    await icxSetup.closeAllOpenOffers()
  })

  it('should make an partial offer to an sell DFI order', async () => {
    const accountDFIBeforeOrder: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // create order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const createOrderResults: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = createOrderResults.txid
    await container.generate(1)

    // list ICX orders
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.INTERNAL,
        tokenFrom: symbolDFI,
        chainTo: order.chainTo,
        receivePubkey: order.receivePubkey,
        ownerAddress: order.ownerAddress,
        amountFrom: order.amountFrom,
        amountToFill: order.amountFrom,
        orderPrice: order.orderPrice,
        amountToFillInToAsset: order.amountFrom.multipliedBy(order.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber)
      }
    )

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // make offer to partial amount 10 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.1), // 10 DFI = 0.1 BTC
      ownerAddress: accountBTC
    }

    const makeOfferResult = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = makeOfferResult.txid
    await container.generate(1)
    const accountBTCAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')

    // check fee of 0.01 DFI has been reduced from the accountBTCBefore[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI].minus(0.01))

    // List the ICX offers for orderTx = createOrderTxId and check
    const ordersAfterMakeOffer: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [{ orderTx: createOrderTxId }], 'bignumber')
    expect(Object.keys(ordersAfterMakeOffer).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect((ordersAfterMakeOffer as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
      {
        orderTx: createOrderTxId,
        status: ICXOrderStatus.OPEN,
        amount: offer.amount,
        amountInFromAsset: offer.amount.dividedBy(order.orderPrice),
        ownerAddress: offer.ownerAddress,
        takerFee: offer.amount.multipliedBy(ICX_TAKERFEE_PER_BTC).multipliedBy(DEX_DFI_PER_BTC_RATE),
        expireHeight: expect.any(BigNumber)
      }
    )

    // check accountDFI[idDFI] balance
    const accountDFIAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    expect(accountDFIAfterOffer[idDFI]).toStrictEqual(accountDFIBeforeOrder[idDFI].minus(15))
  })

  it('should make an partial offer to an sell BTC order', async () => {
    const accountDFIBeforeOrder: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // create offer - maker
    const order: ICXOrder = {
      chainFrom: 'BTC',
      tokenTo: idDFI,
      ownerAddress: accountDFI,
      amountFrom: new BigNumber(2),
      orderPrice: new BigNumber(100)
    }
    const createOrderResult: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = createOrderResult.txid
    await container.generate(1)

    // list ICX orders
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.EXTERNAL,
        tokenTo: symbolDFI,
        chainFrom: order.chainFrom,
        ownerAddress: order.ownerAddress,
        amountFrom: order.amountFrom,
        amountToFill: order.amountFrom,
        orderPrice: order.orderPrice,
        amountToFillInToAsset: order.amountFrom.multipliedBy(order.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber)
      }
    )

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // make offer to partial amout 1 BTC - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(100), // 100 DFI = 1 BTC
      ownerAddress: accountBTC,
      receivePubkey: '0348790cb93b203a8ea5ce07279cb209d807b535b2ca8b0988a6f7a6578e41f7a5'
    }
    const makeOfferResult = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = makeOfferResult.txid
    await container.generate(1)

    const accountBTCAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // check fee of 0.1 DFI has been reduced from the accountBTCBeforeOffer[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI].minus(0.1))

    // List the ICX offers for orderTx = createOrderTxId and check
    const ordersAfterMakeOffer: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [{ orderTx: createOrderTxId }], 'bignumber')
    expect(Object.keys(ordersAfterMakeOffer).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect((ordersAfterMakeOffer as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
      {
        orderTx: createOrderTxId,
        status: ICXOrderStatus.OPEN,
        amount: offer.amount,
        amountInFromAsset: offer.amount.dividedBy(order.orderPrice),
        ownerAddress: offer.ownerAddress,
        takerFee: offer.amount.multipliedBy(ICX_TAKERFEE_PER_BTC),
        expireHeight: expect.any(BigNumber),
        receivePubkey: offer.receivePubkey
      }
    )

    // check accountDFI[idDFI] balance
    const accountDFIAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    expect(accountDFIAfterOffer).toStrictEqual(accountDFIBeforeOrder)
  })

  it('make a higher offer to an sell DFI order, should occur equivalent taker fee', async () => {
    // create order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const createOrderResult: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = createOrderResult.txid
    await container.generate(1)

    // list ICX orders
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.INTERNAL,
        tokenFrom: symbolDFI,
        chainTo: order.chainTo,
        receivePubkey: order.receivePubkey,
        ownerAddress: order.ownerAddress,
        amountFrom: order.amountFrom,
        amountToFill: order.amountFrom,
        orderPrice: order.orderPrice,
        amountToFillInToAsset: order.amountFrom.multipliedBy(order.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber)
      }
    )

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // make offer to higher amout 20 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.20), // 0.20 BTC = 20 DFI
      ownerAddress: accountBTC
    }
    const makeOfferResult = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = makeOfferResult.txid
    await container.generate(1)

    const accountBTCAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // check fee of 0.02 DFI has been reduced from the accountBTCBeforeOffer[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI].minus(0.02))

    // List the ICX offers for orderTx = createOrderTxId and check
    const ordersAfterMakeOffer: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [{ orderTx: createOrderTxId }], 'bignumber')
    expect(Object.keys(ordersAfterMakeOffer).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect((ordersAfterMakeOffer as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
      {
        orderTx: createOrderTxId,
        status: ICXOrderStatus.OPEN,
        amount: offer.amount,
        amountInFromAsset: offer.amount.dividedBy(order.orderPrice),
        ownerAddress: offer.ownerAddress,
        takerFee: offer.amount.multipliedBy(ICX_TAKERFEE_PER_BTC).multipliedBy(DEX_DFI_PER_BTC_RATE),
        expireHeight: expect.any(BigNumber)
      }
    )
  })

  it('should make an partial offer to an sell DFI order with input utxos', async () => {
    const accountDFIBeforeOrder: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // create order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const createOrderResult: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = createOrderResult.txid
    await container.generate(1)

    // list ICX orders
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.INTERNAL,
        tokenFrom: symbolDFI,
        chainTo: order.chainTo,
        receivePubkey: order.receivePubkey,
        ownerAddress: order.ownerAddress,
        amountFrom: order.amountFrom,
        amountToFill: order.amountFrom,
        orderPrice: order.orderPrice,
        amountToFillInToAsset: order.amountFrom.multipliedBy(order.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber)
      }
    )

    // make offer to partial amout 10 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.1), // 10 DFI = 0.1 BTC
      ownerAddress: accountBTC
    }

    // input utxos
    const inputUTXOs = await container.fundAddress(accountBTC, 10)

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')

    const makeOfferResult = await client.icxorderbook.makeOffer(offer, [inputUTXOs])
    const makeOfferTxId = makeOfferResult.txid
    await container.generate(1)

    const accountBTCAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')

    // check fee of 0.01 DFI has been reduced from the accountBTCBefore[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI].minus(0.01))

    // List the ICX offers for orderTx = createOrderTxId and check
    const ordersAfterMakeOffer: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [{ orderTx: createOrderTxId }], 'bignumber')
    expect(Object.keys(ordersAfterMakeOffer).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect((ordersAfterMakeOffer as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
      {
        orderTx: createOrderTxId,
        status: ICXOrderStatus.OPEN,
        amount: offer.amount,
        amountInFromAsset: offer.amount.dividedBy(order.orderPrice),
        ownerAddress: offer.ownerAddress,
        takerFee: offer.amount.multipliedBy(ICX_TAKERFEE_PER_BTC).multipliedBy(DEX_DFI_PER_BTC_RATE),
        expireHeight: expect.any(BigNumber)
      }
    )

    // check accountDFI[idDFI] balance
    const accountDFIAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    expect(accountDFIAfterOffer[idDFI]).toStrictEqual(accountDFIBeforeOrder[idDFI].minus(15))
  })

  it('should return an error when making an offer with invalid ICXOffer.orderTx', async () => {
    // create order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const createOrderResult: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = createOrderResult.txid
    await container.generate(1)

    // list ICX orders
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.INTERNAL,
        tokenFrom: symbolDFI,
        chainTo: order.chainTo,
        receivePubkey: order.receivePubkey,
        ownerAddress: order.ownerAddress,
        amountFrom: order.amountFrom,
        amountToFill: order.amountFrom,
        orderPrice: order.orderPrice,
        amountToFillInToAsset: order.amountFrom.multipliedBy(order.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber)
      }
    )

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // make offer to invalid orderTx "123" - taker
    const offer: ICXOffer = {
      orderTx: 'INVALID_ORDER_TX_ID',
      amount: new BigNumber(0.1), // 10 DFI = 0.1 BTC
      ownerAddress: accountBTC
    }

    const promise = client.icxorderbook.makeOffer(offer, [])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'orderTx (0000000000000000000000000000000000000000000000000000000000000000) does not exist\', code: -8, method: icx_makeoffer')

    const accountBTCAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // check same balance
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI])
  })

  it('should return an error with invalid ICXOffer.ownerAddress', async () => {
    // create order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const createOrderResult: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = createOrderResult.txid
    await container.generate(1)

    // list ICX orders
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.INTERNAL,
        tokenFrom: symbolDFI,
        chainTo: order.chainTo,
        receivePubkey: order.receivePubkey,
        ownerAddress: order.ownerAddress,
        amountFrom: order.amountFrom,
        amountToFill: order.amountFrom,
        orderPrice: order.orderPrice,
        amountToFillInToAsset: order.amountFrom.multipliedBy(order.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber)
      }
    )

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // make offer with invalid ownerAddress "123" - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.1), // 10 DFI = 0.1 BTC
      ownerAddress: 'INVALID_OWNER_ADDRESS'
    }

    const promise = client.icxorderbook.makeOffer(offer, [])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'recipient (INVALID_OWNER_ADDRESS) does not refer to any valid address\', code: -5, method: icx_makeoffer')

    const accountBTCAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // check same balance
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI])
  })

  it('should return an error with invalid ICXOffer.receivePubkey', async () => {
    // create order - maker
    const order: ICXOrder = {
      chainFrom: 'BTC',
      tokenTo: idDFI,
      ownerAddress: accountDFI,
      amountFrom: new BigNumber(2),
      orderPrice: new BigNumber(100)
    }
    const createOrderResult: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = createOrderResult.txid
    await container.generate(1)

    // list ICX orders
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.EXTERNAL,
        tokenTo: symbolDFI,
        chainFrom: order.chainFrom,
        ownerAddress: order.ownerAddress,
        amountFrom: order.amountFrom,
        amountToFill: order.amountFrom,
        orderPrice: order.orderPrice,
        amountToFillInToAsset: order.amountFrom.multipliedBy(order.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber)
      }
    )

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // make offer to partial amout 1 BTC - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(100), // 100 DFI = 1 BTC
      ownerAddress: accountBTC,
      receivePubkey: 'INVALID_RECEIVE_PUB_KEY'
    }

    const promise = client.icxorderbook.makeOffer(offer, [])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid public key: INVALID_RECEIVE_PUB_KEY\', code: -5, method: icx_makeoffer')

    const accountBTCAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // expect the same balance
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI])
  })
})
