import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ICXGenericResult, ICXOfferInfo, ICXOrderInfo, ICXOrder, ICXOffer
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { accountBTC, accountDFI, checkBTCBuyOfferDetails, checkBTCSellOrderDetails, checkDFIBuyOfferDetails, checkDFISellOrderDetails, idDFI, setup } from './common.test'
import { RpcApiError } from '../../../src'

describe('Should test ICXOrderBook.getOrder', () => {
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

  it('Should get the correct order', async () => {
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

    // get order createOrder2TxId and check
    retrivedOrder = await client.icxorderbook.getOrder(createOrder2TxId)
    // check details for createOrder2TxId
    await checkBTCSellOrderDetails(container, order2, createOrder2TxId, retrivedOrder as Record<string, ICXOrderInfo>)
  })

  it('Should get the correct offer', async () => {
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
    await checkBTCBuyOfferDetails(container, offer2, makeOffer2TxId, retrivedOrder as Record<string, ICXOfferInfo>)

    // retrive makeOfferTxId
    retrivedOrder = await client.icxorderbook.getOrder(makeOfferTxId)
    await checkDFIBuyOfferDetails(container, offer, makeOfferTxId, retrivedOrder as Record<string, ICXOfferInfo>)
  })

  it('Should return an error when incorect order transaction Id is used', async () => {
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
