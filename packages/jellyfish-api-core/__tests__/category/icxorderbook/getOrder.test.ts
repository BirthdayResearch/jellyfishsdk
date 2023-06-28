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
import { RpcApiError } from '../../../src'

describe('ICXOrderBook.getOrder', () => {
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

  it('should get the correct order', async () => {
    // create first order - maker
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

    // get order createOrderTxId and check
    const retrievedOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.getOrder(createOrderTxId)
    expect((retrievedOrder as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
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

    // get order createOrder2TxId and check
    const retrievedOrder2: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.getOrder(createOrder2TxId)
    // check details for createOrder2TxId
    expect((retrievedOrder2 as Record<string, ICXOrderInfo>)[createOrder2TxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.EXTERNAL,
        tokenTo: symbolDFI,
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
  })

  it('should get the correct offer', async () => {
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
      chainFrom: 'BTC',
      tokenTo: idDFI,
      ownerAddress: accountDFI,
      amountFrom: new BigNumber(2),
      orderPrice: new BigNumber(100)
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

    // create offer to order createOrderTxId
    const offer2: ICXOffer = {
      orderTx: createOrder2TxId,
      amount: new BigNumber(1), //
      ownerAddress: accountBTC,
      receivePubkey: '0348790cb93b203a8ea5ce07279cb209d807b535b2ca8b0988a6f7a6578e41f7a5'
    }
    const makeOffer2Result = await client.icxorderbook.makeOffer(offer2, [])
    const makeOffer2TxId = makeOffer2Result.txid
    await container.generate(1)

    // retrive makeOffer2TxId
    const retrievedOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.getOrder(makeOffer2TxId)
    expect((retrievedOrder as Record<string, ICXOfferInfo>)[makeOffer2TxId]).toStrictEqual(
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

    // retrive makeOfferTxId
    const retrievedOrder2: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.getOrder(makeOfferTxId)
    expect((retrievedOrder2 as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
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

  it('should return an error when incorect order transaction id is used', async () => {
    // create an order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    await client.icxorderbook.createOrder(order, [])
    await container.generate(1)

    // get order "INVALID_ORDER_TX_ID" and check
    const promise = client.icxorderbook.getOrder('INVALID_ORDER_TX_ID')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'orderTx (0000000000000000000000000000000000000000000000000000000000000000) does not exist\', code: -8, method: icx_getorder')
  })
})
