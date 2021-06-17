import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ICXGenericResult, ICXOfferInfo, ICXOrderInfo, ICXOrder, ICXOffer, ICXOrderStatus
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { accountBTC, accountDFI, checkBTCBuyOfferDetails, checkBTCSellOrderDetails, checkDFIBuyOfferDetails, checkDFISellOrderDetails, idDFI, setup } from './common.test'

describe('Should test ICXOrderBook.listOrders', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await setup(container)
  })

  afterAll(async () => {
    await container.stop()
  })

  afterEach(async () => {
    // cleanup code here
  })

  it('Should list all the orders', async () => {
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
    await checkDFISellOrderDetails(container, order, createOrderTxId, retrivedOrder as Record<string, ICXOrderInfo>)

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
    await checkBTCSellOrderDetails(container, order2, createOrder2TxId, retrivedOrder as Record<string, ICXOrderInfo>)
    // check details for createOrderTxId
    await checkDFISellOrderDetails(container, order, createOrderTxId, retrivedOrder as Record<string, ICXOrderInfo>)
  })

  it('Should list correct offers for an order', async () => {
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
    await checkBTCBuyOfferDetails(container, offer2, makeOffer2TxId, orders as Record<string, ICXOfferInfo>)

    // list offers for createOrder2TxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    await checkDFIBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)
  })

  it('Should test ICXListOrderOptions.limit parameter', async () => {
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
    await checkDFISellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)
    await checkDFISellOrderDetails(container, order2, createOrder2TxId, orders as Record<string, ICXOrderInfo>)

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
    await checkDFIBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)
    await checkDFIBuyOfferDetails(container, offer2, makeOffer2TxId, orders as Record<string, ICXOfferInfo>)

    // now list orders with ICXListOrderOptions.limit=1
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId, limit: 1 })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
  })

  it('Should test ICXListOrderOptions.closed parameter', async () => {
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
    await checkDFISellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)
    await checkDFISellOrderDetails(container, order2, createOrder2TxId, orders as Record<string, ICXOrderInfo>)

    // now close createOrder2TxId
    await client.icxorderbook.closeOrder(createOrder2TxId)
    await container.generate(1)

    // list ICX orders and check
    orders = await client.icxorderbook.listOrders()
    await checkDFISellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)

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

    // check fee of 0.02 DFI has been reduced from the accountBTCBeforeOffer[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    // expect(Number(accountBTCAfterOffer[idDFI])).toStrictEqual(Number(accountBTCBeforeOffer[idDFI]) - Number(0.02)) // NOTE(surangap): check this

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(3) // extra entry for the warning text returned by the RPC atm.
    await checkDFIBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)
    await checkDFIBuyOfferDetails(container, offer2, makeOffer2TxId, orders as Record<string, ICXOfferInfo>)

    // now close makeOffer2TxId
    await client.icxorderbook.closeOffer(makeOffer2TxId)
    await container.generate(1)

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    await checkDFIBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)

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

  it('Should return an empty set when ICXListOrderOptions.orderTx is invalid', async () => {
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
