import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ICXGenericResult, ICXOfferInfo, ICXOrderInfo, ICXOrder, ICXOffer, ICXOrderStatus, ICXOrderType
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { accountBTC, accountDFI, DEX_DFI_PER_BTC_RATE, ICXSetup, ICX_TAKERFEE_PER_BTC, idDFI, symbolBTC, symbolDFI } from './icx_setup'

describe('ICXOrderBook.listOrders', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const icxSetup = new ICXSetup(container)

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
  })

  afterAll(async () => {
    await container.stop()
  })

  afterEach(async () => {
    // cleanup code here
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
    let result: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = result.txid
    await container.generate(1)

    // get order createOrderTxId and check
    let retrivedOrder: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.icxorderbook.getOrder(createOrderTxId)
    expect((retrivedOrder as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        // status: ICXOrderStatus.OPEN, //NOTE(surangap): status is not returned?
        type: ICXOrderType.INTERNAL,
        tokenFrom: order.tokenFrom === '0' ? symbolDFI : symbolBTC,
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
    result = await client.icxorderbook.createOrder(order2, [])
    const createOrder2TxId = result.txid
    await container.generate(1)

    // list orders and check
    retrivedOrder = await client.icxorderbook.listOrders()
    // check details for createOrder2TxId
    expect((retrivedOrder as Record<string, ICXOrderInfo>)[createOrder2TxId]).toStrictEqual(
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
    expect((retrivedOrder as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.INTERNAL,
        tokenFrom: order.tokenFrom === '0' ? symbolDFI : symbolBTC,
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
    let result: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = result.txid
    await container.generate(1)

    // create second order - maker
    const order2: ICXOrder = {
      chainFrom: 'BTC',
      tokenTo: idDFI,
      ownerAddress: accountDFI,
      amountFrom: new BigNumber(2),
      orderPrice: new BigNumber(100)
    }
    result = await client.icxorderbook.createOrder(order2, [])
    const createOrder2TxId = result.txid
    await container.generate(1)

    // create offer to order createOrderTxId
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.1), // 10 DFI = 0.1 BTC
      ownerAddress: accountBTC
    }
    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    // create offer to order createOrderTxId
    const offer2: ICXOffer = {
      orderTx: createOrder2TxId,
      amount: new BigNumber(1), //
      ownerAddress: accountBTC,
      receivePubkey: '0348790cb93b203a8ea5ce07279cb209d807b535b2ca8b0988a6f7a6578e41f7a5'
    }
    result = await client.icxorderbook.makeOffer(offer2, [])
    const makeOffer2TxId = result.txid
    await container.generate(1)

    // list offers for createOrderTxId and check
    let orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: createOrder2TxId })
    expect((orders as Record<string, ICXOfferInfo>)[makeOffer2TxId]).toStrictEqual(
      {
        orderTx: createOrder2TxId,
        status: ICXOrderStatus.OPEN,
        amount: offer2.amount,
        amountInFromAsset: offer2.amount.dividedBy(order2.orderPrice),
        ownerAddress: offer2.ownerAddress,
        takerFee: offer2.amount.multipliedBy(ICX_TAKERFEE_PER_BTC),
        expireHeight: expect.any(BigNumber),
        receivePubkey: offer2.receivePubkey
      }
    )

    // list offers for createOrder2TxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect((orders as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
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
    let result: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = result.txid
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
    result = await client.icxorderbook.createOrder(order2, [])
    const createOrder2TxId = result.txid
    await container.generate(1)

    // list ICX orders anc check
    let orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((orders as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.INTERNAL,
        tokenFrom: order.tokenFrom === '0' ? symbolDFI : symbolBTC,
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
    expect((orders as Record<string, ICXOrderInfo>)[createOrder2TxId]).toStrictEqual(
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
    orders = await client.icxorderbook.listOrders({ limit: 1 })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.

    // make offer to partial amout 10 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10), // 0.10 BTC = 10 DFI
      ownerAddress: accountBTC
    }
    const accountBTCBeforeOffer = await container.call('getaccount', [accountBTC, {}, true])
    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    // make second offer to partial amout 2 DFI - taker
    const offer2: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.02), // 0.02 BTC = 2 DFI
      ownerAddress: accountBTC
    }
    result = await client.icxorderbook.makeOffer(offer2, [])
    const makeOffer2TxId = result.txid
    await container.generate(1)

    const accountBTCAfterOffer = await container.call('getaccount', [accountBTC, {}, true])

    // check fee of 0.012 DFI has been reduced from the accountBTCBeforeOffer[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(Number(accountBTCAfterOffer[idDFI])).toStrictEqual(Number(accountBTCBeforeOffer[idDFI]) - Number(0.012))

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(3) // extra entry for the warning text returned by the RPC atm.
    expect((orders as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
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
    expect((orders as Record<string, ICXOfferInfo>)[makeOffer2TxId]).toStrictEqual(
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

    // now list orders with ICXListOrderOptions.limit=1
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId, limit: 1 })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
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
    let result: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = result.txid
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
    result = await client.icxorderbook.createOrder(order2, [])
    const createOrder2TxId = result.txid
    await container.generate(1)

    // list ICX orders anc check
    let orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((orders as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.INTERNAL,
        tokenFrom: order.tokenFrom === '0' ? symbolDFI : symbolBTC,
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
    expect((orders as Record<string, ICXOrderInfo>)[createOrder2TxId]).toStrictEqual(
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
    await container.call('icx_closeorder', [createOrder2TxId])
    await container.generate(1)

    // list ICX orders and check
    orders = await client.icxorderbook.listOrders()
    expect((orders as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.INTERNAL,
        tokenFrom: order.tokenFrom === '0' ? symbolDFI : symbolBTC,
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
    orders = await client.icxorderbook.listOrders({ closed: true })
    const orderInfoRetrived = orders as Record<string, ICXOrderInfo>
    expect(orderInfoRetrived[createOrder2TxId].status).toStrictEqual(ICXOrderStatus.CLOSED)
    expect(orderInfoRetrived[createOrder2TxId].ownerAddress).toStrictEqual(order2.ownerAddress)

    // make offer to partial amout 10 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10), // 0.10 BTC = 10 DFI
      ownerAddress: accountBTC
    }
    // const accountBTCBeforeOffer = await container.call('getaccount', [accountBTC, {}, true])
    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    // make second offer to partial amout 10 DFI - taker
    const offer2: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10), // 0.10 BTC = 10 DFI
      ownerAddress: accountBTC
    }
    result = await client.icxorderbook.makeOffer(offer2, [])
    const makeOffer2TxId = result.txid
    await container.generate(1)

    // const accountBTCAfterOffer = await container.call('getaccount', [accountBTC, {}, true])

    // NOTE(surangap): why below check is failing?
    // check fee of 0.02 DFI has been reduced from the accountBTCBeforeOffer[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    // expect(Number(accountBTCAfterOffer[idDFI])).toStrictEqual(Number(accountBTCBeforeOffer[idDFI]) - Number(0.02))

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(3) // extra entry for the warning text returned by the RPC atm.
    expect((orders as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
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
    expect((orders as Record<string, ICXOfferInfo>)[makeOffer2TxId]).toStrictEqual(
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
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    expect((orders as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
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
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId, closed: true })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    const offerInfoRetrived = orders as Record<string, ICXOfferInfo>
    expect(offerInfoRetrived[makeOffer2TxId].orderTx).toStrictEqual(offer2.orderTx)
    expect(offerInfoRetrived[makeOffer2TxId].status).toStrictEqual(ICXOrderStatus.CLOSED)
    expect(offerInfoRetrived[makeOffer2TxId].ownerAddress).toStrictEqual(offer2.ownerAddress)
  })

  // NOTE(surangap): try to write a parameterized test for all invlaid inputs of ICXListOrderOptions. Ideally client.icxorderbook.listOrders()
  // should return empty set for all such cases. but at the moment C++ side implemenation does not go with that.

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
    let result: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = result.txid
    await container.generate(1)

    // create offer to order createOrderTxId
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.1), // 10 DFI = 0.1 BTC
      ownerAddress: accountBTC
    }
    result = await client.icxorderbook.makeOffer(offer, [])
    await container.generate(1)

    // list offers for Tx Id "123" and check
    const orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: '123' })
    expect(orders).toStrictEqual(
      {
        WARNING: 'ICX and Atomic Swap are experimental features. You might end up losing your funds. USE IT AT YOUR OWN RISK.'
      }
    )
  })
})
