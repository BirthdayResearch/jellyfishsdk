import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ICXGenericResult, ICXOfferInfo, ICXOrderInfo, ICXOffer, ICXOrder, InputUTXO } from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { setup, accountDFI, idDFI, checkDFISellOrderDetails, accountBTC, checkDFIBuyOfferDetails } from './common.test'
import { RpcApiError } from '../../../src'

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

  afterEach(async () => {
    // cleanup code here
  })

  it('Should close an offer', async () => {
    // create order - maker
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
    await checkDFISellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)

    // make offer to partial amout 10 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.1), // 10 DFI = 0.1 BTC
      ownerAddress: accountBTC
    }
    const accountBTCBeforeOffer = await container.call('getaccount', [accountBTC, {}, true])
    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    const accountBTCAfterOffer = await container.call('getaccount', [accountBTC, {}, true])
    // check fee of 0.01 DFI has been reduced from the accountBTCBefore[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(Number(accountBTCAfterOffer[idDFI])).toStrictEqual(Number(accountBTCBeforeOffer[idDFI]) - Number(0.01000000))

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    await checkDFIBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)

    // close offer makeOfferTxId - taker
    await client.icxorderbook.closeOffer(makeOfferTxId)
    await container.generate(1)

    // List the ICX offers for orderTx = createOrderTxId and check no more offers
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check accountBTC balance, should be the same as accountBTCBeforeOffer
    const accountBTCAfterOfferClose = await container.call('getaccount', [accountBTC, {}, true])
    expect(accountBTCAfterOfferClose).toStrictEqual(accountBTCBeforeOffer)
  })

  it('Should close an offer with input utxos', async () => {
    // create order - maker
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
    await checkDFISellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)

    // make offer to partial amout 10 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.1), // 10 DFI = 0.1 BTC
      ownerAddress: accountBTC
    }
    const accountBTCBeforeOffer = await container.call('getaccount', [accountBTC, {}, true])
    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    const accountBTCAfterOffer = await container.call('getaccount', [accountBTC, {}, true])
    // check fee of 0.01 DFI has been reduced from the accountBTCBefore[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(Number(accountBTCAfterOffer[idDFI])).toStrictEqual(Number(accountBTCBeforeOffer[idDFI]) - Number(0.01000000))

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    await checkDFIBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)

    // input utxos
    const utxos = await container.call('listunspent', [1, 9999999, [accountBTC], true])
    const inputUTXOs: InputUTXO[] = utxos.map((utxo: InputUTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })
    // close offer makeOfferTxId - taker
    await client.icxorderbook.closeOffer(makeOfferTxId, inputUTXOs)
    await container.generate(1)

    // List the ICX offers for orderTx = createOrderTxId and check no more offers
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check accountBTC balance, should be the same as accountBTCBeforeOffer
    const accountBTCAfterOfferClose = await container.call('getaccount', [accountBTC, {}, true])
    expect(accountBTCAfterOfferClose).toStrictEqual(accountBTCBeforeOffer)
  })

  it('Should return an error when incorrect offer transaction is passed', async () => {
    // create order - maker
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
    await checkDFISellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)

    // make offer to partial amout 10 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.1), // 10 DFI = 0.1 BTC
      ownerAddress: accountBTC
    }
    const accountBTCBeforeOffer = await container.call('getaccount', [accountBTC, {}, true])
    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    const accountBTCAfterOffer = await container.call('getaccount', [accountBTC, {}, true])
    // check fee of 0.01 DFI has been reduced from the accountBTCBefore[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(Number(accountBTCAfterOffer[idDFI])).toStrictEqual(Number(accountBTCBeforeOffer[idDFI]) - Number(0.01000000))

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    await checkDFIBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)

    // close offer "123" - taker
    const promise = client.icxorderbook.closeOffer('123')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'OfferTx (0000000000000000000000000000000000000000000000000000000000000123) does not exist\', code: -8, method: icx_closeoffer')

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
  })
})
