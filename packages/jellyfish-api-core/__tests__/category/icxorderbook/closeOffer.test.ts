import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ICXGenericResult, ICXOfferInfo, ICXOrderInfo, ICXOffer, ICXOrder } from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { setup, accountDFI, idDFI, checkDFISellOrderDetails, accountBTC, checkDFIBuyOfferDetails, closeAllOrders } from './common.test'

describe('Should test ICXOrderBook.closeOffer', () => {
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

  beforeEach(async () => {
    // close any existing orders
    await closeAllOrders(container)
  })

  it('Should close an offer', async () => {
    // accountDFI start balance
    const accountDFIStartBalance = await container.call('getaccount', [accountDFI, {}, true])
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

    // list ICX orders
    let orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.icxorderbook.listOrders()
    // check details
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    // we know that only ICXOrderInfo will be returned, so cast and pass to check order details
    await checkDFISellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)

    // make ICXMakeOffer to partial amout 10 DFI
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.1), // 10 DFI = 0.1 BTC
      ownerAddress: accountBTC
    }
    // accountBTC before partial make offer
    const accountBTCBeforeOffer = await container.call('getaccount', [accountBTC, {}, true])

    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    // accountBTC after partial make offer
    const accountBTCAfterOffer = await container.call('getaccount', [accountBTC, {}, true])

    // check fee of 0.01 DFI has been reduced from the accountBTCBefore[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI] - Number('0.01000000'))

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    // we know that only ICXOfferInfo will be returned, so cast and pass to check offer details
    await checkDFIBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)

    // close offer makeOfferTxId
    await client.icxorderbook.closeOffer(makeOfferTxId)

    await container.generate(1)

    // List the ICX offers for orderTx = createOrderTxId and check no more offers
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check accountBTC balance
    const accountBTCAfterOfferClose = await container.call('getaccount', [accountBTC, {}, true])
    expect(accountBTCAfterOfferClose).toStrictEqual(accountBTCBeforeOffer)

    // close all orders
    await closeAllOrders(container)

    // check no more ICX orders
    orders = await client.icxorderbook.listOrders()
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check accountDFI[idDFI] balance
    const accountDFIBalance = await container.call('getaccount', [accountDFI, {}, true])
    expect(accountDFIBalance).toStrictEqual(accountDFIStartBalance)
  })
})
