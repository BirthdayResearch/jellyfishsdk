import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ICXGenericResult, ICXOfferInfo, ICXOrderInfo, ICXOrder, ICXOffer, ICXOrderStatus, ICXOrderType
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { accountBTC, accountDFI, DEX_DFI_PER_BTC_RATE, ICXSetup, ICX_TAKERFEE_PER_BTC, idDFI, symbolBTC, symbolDFI } from './icx_setup'
import { RpcApiError } from '../../../src'

describe('ICXOrderBook.getOrder', () => {
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

    // get order createOrder2TxId and check
    retrivedOrder = await client.icxorderbook.getOrder(createOrder2TxId)
    // check details for createOrder2TxId
    expect((retrivedOrder as Record<string, ICXOrderInfo>)[createOrder2TxId]).toStrictEqual(
      {
        // status: ICXOrderStatus.OPEN, //NOTE(surangap): status is not returned?
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

    // retrive makeOffer2TxId
    let retrivedOrder: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.icxorderbook.getOrder(makeOffer2TxId)
    expect((retrivedOrder as Record<string, ICXOfferInfo>)[makeOffer2TxId]).toStrictEqual(
      {
        orderTx: createOrder2TxId,
        status: ICXOrderStatus.EXPIRED, // NOTE(surangap): why this is EXPIRED ? should be OPEN?
        amount: offer2.amount,
        amountInFromAsset: offer2.amount.dividedBy(order2.orderPrice),
        ownerAddress: offer2.ownerAddress,
        takerFee: offer2.amount.multipliedBy(ICX_TAKERFEE_PER_BTC),
        expireHeight: expect.any(BigNumber),
        receivePubkey: offer2.receivePubkey
      }
    )

    // retrive makeOfferTxId
    retrivedOrder = await client.icxorderbook.getOrder(makeOfferTxId)
    expect((retrivedOrder as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
      {
        orderTx: createOrderTxId,
        status: ICXOrderStatus.EXPIRED, // NOTE(surangap): why this is EXPIRED ? should be OPEN?
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

    // get order "123" and check
    const promise = client.icxorderbook.getOrder('123')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'orderTx (0000000000000000000000000000000000000000000000000000000000000123) does not exist\', code: -8, method: icx_getorder')
  })
})
