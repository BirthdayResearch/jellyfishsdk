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
  symbolBTC,
  symbolDFI
} from './icx_setup'

describe('ICXOrderBook.listOrders', () => {
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

  it('should list all the orders', async () => {
    // create first order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const creatOrderResult: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = creatOrderResult.txid
    await container.generate(1)

    // get order createOrderTxId and check
    const retrivedOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.getOrder(createOrderTxId)
    expect((retrivedOrder as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
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

    // create second order - maker
    const order2: ICXOrder = {
      chainFrom: 'BTC',
      tokenTo: idDFI,
      ownerAddress: accountDFI,
      amountFrom: new BigNumber(2),
      orderPrice: new BigNumber(100)
    }
    const createOrder2Result = await client.icxorderbook.createOrder(order2, [])
    const createOrder2TxId = createOrder2Result.txid
    await container.generate(1)

    // list orders and check
    const ordersAfterCreateOrder2: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    // check details for createOrder2TxId
    expect((ordersAfterCreateOrder2 as Record<string, ICXOrderInfo>)[createOrder2TxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.EXTERNAL,
        tokenTo: order2.tokenTo === '0' ? symbolDFI : symbolBTC,
        chainFrom: order2.chainFrom,
        ownerAddress: order2.ownerAddress,
        amountFrom: order2.amountFrom,
        amountToFill: order2.amountFrom,
        orderPrice: order2.orderPrice,
        amountToFillInToAsset: order2.amountFrom.multipliedBy(order2.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber)
      }
    )
    // check details for createOrderTxId
    expect((ordersAfterCreateOrder2 as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
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
  })

  it('should list correct offers for an order', async () => {
    // create two orders - maker
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

    // create second order - maker
    const order2: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(20),
      orderPrice: new BigNumber(0.01)
    }
    const createOrder2Result = await client.icxorderbook.createOrder(order2, [])
    const createOrder2TxId = createOrder2Result.txid
    await container.generate(1)

    // create offer to order createOrderTxId
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.1), // 10 DFI = 0.1 BTC
      ownerAddress: accountBTC
    }
    const makeOfferResult = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = makeOfferResult.txid
    await container.generate(1)

    // create offer to order createOrder2TxId
    const offer2: ICXOffer = {
      orderTx: createOrder2TxId,
      amount: new BigNumber(0.2), // 20 DFI = 0.2 BTC
      ownerAddress: accountBTC
    }
    const makeOffer2Result = await client.icxorderbook.makeOffer(offer2, [])
    const makeOffer2TxId = makeOffer2Result.txid
    await container.generate(1)

    // list offers for createOrder2TxId and check
    const offersForOrder2: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: createOrder2TxId })
    expect((offersForOrder2 as Record<string, ICXOfferInfo>)[makeOffer2TxId]).toStrictEqual(
      {
        orderTx: createOrder2TxId,
        status: ICXOrderStatus.OPEN,
        amount: offer2.amount,
        amountInFromAsset: offer2.amount.dividedBy(order2.orderPrice),
        ownerAddress: offer2.ownerAddress,
        takerFee: offer2.amount.multipliedBy(ICX_TAKERFEE_PER_BTC).multipliedBy(DEX_DFI_PER_BTC_RATE),
        expireHeight: expect.any(BigNumber)
      }
    )

    // list offers for createOrderTxId and check
    const offersForOrder1: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect((offersForOrder1 as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
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

  it('should test ICXListOrderOptions.limit parameter', async () => {
    // create an order - maker
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

    // create second order - maker
    const order2: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const createOrder2Result = await client.icxorderbook.createOrder(order2, [])
    const createOrder2TxId = createOrder2Result.txid
    await container.generate(1)

    // list ICX orders anc check
    const ordersAfterCreateOrder2: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((ordersAfterCreateOrder2 as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
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
    expect((ordersAfterCreateOrder2 as Record<string, ICXOrderInfo>)[createOrder2TxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.INTERNAL,
        tokenFrom: order2.tokenFrom === '0' ? symbolDFI : symbolBTC,
        chainTo: order2.chainTo,
        receivePubkey: order2.receivePubkey,
        ownerAddress: order2.ownerAddress,
        amountFrom: order2.amountFrom,
        amountToFill: order2.amountFrom,
        orderPrice: order2.orderPrice,
        amountToFillInToAsset: order2.amountFrom.multipliedBy(order2.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber)
      }
    )

    // now list orders with ICXListOrderOptions.limit=1
    const ordersWithLimit1: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ limit: 1 })
    expect(Object.keys(ordersWithLimit1).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // make offer to partial amount 10 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10), // 0.10 BTC = 10 DFI
      ownerAddress: accountBTC
    }
    const makeOfferResult = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = makeOfferResult.txid
    await container.generate(1)

    // make second offer to partial amount 2 DFI - taker
    const offer2: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.02), // 0.02 BTC = 2 DFI
      ownerAddress: accountBTC
    }
    const makeOffer2Result = await client.icxorderbook.makeOffer(offer2, [])
    const makeOffer2TxId = makeOffer2Result.txid
    await container.generate(1)

    const accountBTCAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')

    // check fee of 0.012 DFI has been reduced from the accountBTCBeforeOffer[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI].minus(0.012))

    // List the ICX offers for orderTx = createOrderTxId and check
    const offesForOrder1: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(offesForOrder1).length).toStrictEqual(3) // extra entry for the warning text returned by the RPC atm.
    expect((offesForOrder1 as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
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
    expect((offesForOrder1 as Record<string, ICXOfferInfo>)[makeOffer2TxId]).toStrictEqual(
      {
        orderTx: createOrderTxId,
        status: ICXOrderStatus.OPEN,
        amount: offer2.amount,
        amountInFromAsset: offer2.amount.dividedBy(order.orderPrice),
        ownerAddress: offer2.ownerAddress,
        takerFee: offer2.amount.multipliedBy(ICX_TAKERFEE_PER_BTC).multipliedBy(DEX_DFI_PER_BTC_RATE),
        expireHeight: expect.any(BigNumber)
      }
    )

    // now list offers for orderTx = createOrderTxId with ICXListOrderOptions.limit=1
    const offesForOrder1WithLimit1: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: createOrderTxId, limit: 1 })
    expect(Object.keys(offesForOrder1WithLimit1).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
  })

  it('should test ICXListOrderOptions.closed parameter', async () => {
    // create an order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(20),
      orderPrice: new BigNumber(0.01)
    }
    const createOrderResult: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = createOrderResult.txid
    await container.generate(1)

    // create second order - maker
    const order2: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const createOrder2Result = await client.icxorderbook.createOrder(order2, [])
    const createOrder2TxId = createOrder2Result.txid
    await container.generate(1)

    // list ICX orders anc check
    const ordersAfterCreateOrder2: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((ordersAfterCreateOrder2 as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
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
    expect((ordersAfterCreateOrder2 as Record<string, ICXOrderInfo>)[createOrder2TxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.INTERNAL,
        tokenFrom: order2.tokenFrom === '0' ? symbolDFI : symbolBTC,
        chainTo: order2.chainTo,
        receivePubkey: order2.receivePubkey,
        ownerAddress: order2.ownerAddress,
        amountFrom: order2.amountFrom,
        amountToFill: order2.amountFrom,
        orderPrice: order2.orderPrice,
        amountToFillInToAsset: order2.amountFrom.multipliedBy(order2.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber)
      }
    )

    // now close createOrder2TxId
    const closeOrder2Result = await container.call('icx_closeorder', [createOrder2TxId])
    const closeOrder2TxId = closeOrder2Result.txid
    await container.generate(1)

    // list ICX orders and check
    const ordersAfterCloseOrder = await client.icxorderbook.listOrders()
    expect((ordersAfterCloseOrder as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
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

    // list ICX orders with ICXListOrderOptions.closed=true and check
    const ordersAfterCloseOrderWithClosedTrue = await client.icxorderbook.listOrders({ closed: true })
    expect((ordersAfterCloseOrderWithClosedTrue as Record<string, ICXOrderInfo>)[createOrder2TxId]).toStrictEqual(
      {
        status: ICXOrderStatus.CLOSED,
        type: ICXOrderType.INTERNAL,
        tokenFrom: order2.tokenFrom === '0' ? symbolDFI : symbolBTC,
        chainTo: order2.chainTo,
        receivePubkey: order2.receivePubkey,
        ownerAddress: order2.ownerAddress,
        amountFrom: order2.amountFrom,
        amountToFill: order2.amountFrom,
        orderPrice: order2.orderPrice,
        amountToFillInToAsset: order2.amountFrom.multipliedBy(order2.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber),
        closeHeight: expect.any(BigNumber),
        closeTx: closeOrder2TxId
      }
    )

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // make offer to partial amount 10 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10), // 0.10 BTC = 10 DFI
      ownerAddress: accountBTC
    }
    const makeOfferResult = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = makeOfferResult.txid
    await container.generate(1)

    // make second offer to partial amount 10 DFI - taker
    const offer2: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10), // 0.10 BTC = 10 DFI
      ownerAddress: accountBTC
    }
    const makeOffer2Result = await client.icxorderbook.makeOffer(offer2, [])
    const makeOffer2TxId = makeOffer2Result.txid
    await container.generate(1)

    const accountBTCAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // check fee of 0.02 DFI has been reduced from the accountBTCBeforeOffer[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI].minus(0.02))

    // List the ICX offers for orderTx = createOrderTxId and check
    const offersForOrder1: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(offersForOrder1).length).toStrictEqual(3) // extra entry for the warning text returned by the RPC atm.
    expect((offersForOrder1 as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
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
    expect((offersForOrder1 as Record<string, ICXOfferInfo>)[makeOffer2TxId]).toStrictEqual(
      {
        orderTx: createOrderTxId,
        status: ICXOrderStatus.OPEN,
        amount: offer2.amount,
        amountInFromAsset: offer2.amount.dividedBy(order.orderPrice),
        ownerAddress: offer2.ownerAddress,
        takerFee: offer2.amount.multipliedBy(ICX_TAKERFEE_PER_BTC).multipliedBy(DEX_DFI_PER_BTC_RATE),
        expireHeight: expect.any(BigNumber)
      }
    )

    // now close makeOffer2TxId
    await client.icxorderbook.closeOffer(makeOffer2TxId)
    await container.generate(1)

    // List the ICX offers for orderTx = createOrderTxId and check
    const offersForOrder1AfterCloseOffer: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(offersForOrder1AfterCloseOffer).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect((offersForOrder1AfterCloseOffer as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
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

    // now list the ICX offers for orderTx = createOrderTxId with ICXListOrderOptions.closed=true and check
    const offersForOrder1AfterCloseOfferWithClosedTrue: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: createOrderTxId, closed: true })
    expect(Object.keys(offersForOrder1AfterCloseOfferWithClosedTrue).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    const offerInfoRetrived = offersForOrder1AfterCloseOfferWithClosedTrue as Record<string, ICXOfferInfo>
    expect(offerInfoRetrived[makeOffer2TxId].orderTx).toStrictEqual(offer2.orderTx)
    expect(offerInfoRetrived[makeOffer2TxId].status).toStrictEqual(ICXOrderStatus.CLOSED)
    expect(offerInfoRetrived[makeOffer2TxId].ownerAddress).toStrictEqual(offer2.ownerAddress)
  })

  it('should return an empty set when ICXListOrderOptions.orderTx is invalid', async () => {
    // create an order - maker
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

    // create offer to order createOrderTxId
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.1), // 10 DFI = 0.1 BTC
      ownerAddress: accountBTC
    }
    await client.icxorderbook.makeOffer(offer, [])
    await container.generate(1)

    // list offers for Tx Id "123" and check
    const ordersForInvalidOrderTX123: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: '123' })
    expect(ordersForInvalidOrderTX123).toStrictEqual(
      {
        WARNING: 'ICX and Atomic Swap are experimental features. You might end up losing your funds. USE IT AT YOUR OWN RISK.'
      }
    )

    // list offers for Tx Id "INVALID_ORDER_TX_ID" and check
    const ordersForInvalidOrderTX: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: 'INVALID_ORDER_TX_ID' })
    expect(ordersForInvalidOrderTX).toStrictEqual(
      {
        WARNING: 'ICX and Atomic Swap are experimental features. You might end up losing your funds. USE IT AT YOUR OWN RISK.'
      }
    )
  })
})
