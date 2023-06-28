import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ICXGenericResult,
  ICXOffer,
  ICXOfferInfo,
  ICXOrder,
  ICXOrderInfo,
  ICXOrderStatus
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { accountBTC, accountDFI, ICXSetup, idDFI, symbolDFI } from './icx_setup'
import { RpcApiError } from '../../../src'

describe('ICXOrderBook.closeOffer', () => {
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

  it('should close an offer', async () => {
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

    // list ICX orders and check status
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

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
    expect((ordersAfterMakeOffer as Record<string, ICXOfferInfo>)[makeOfferTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    // close offer makeOfferTxId - taker
    await client.icxorderbook.closeOffer(makeOfferTxId)
    await container.generate(1)

    // List the ICX offers for orderTx = createOrderTxId and check no more offers
    const ordersAfterCloseOffer: Record<string, ICXOrderInfo | ICXOfferInfo> = await await container.call('icx_listorders', [{ orderTx: createOrderTxId }])
    expect(Object.keys(ordersAfterCloseOffer).length).toStrictEqual(1) // extra entry for the warning text returned by the RPC atm.

    // check accountBTC balance, should be the same as accountBTCBeforeOffer
    const accountBTCAfterOfferClose: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    expect(accountBTCAfterOfferClose).toStrictEqual(accountBTCBeforeOffer)
  })

  it('should close an offer for sell BTC order from chain:BTC to chain:DFI', async () => {
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

    // list ICX orders and check status
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // make offer to partial amount 10 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(10), //
      ownerAddress: accountBTC,
      receivePubkey: '0348790cb93b203a8ea5ce07279cb209d807b535b2ca8b0988a6f7a6578e41f7a5'
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
    expect((ordersAfterMakeOffer as Record<string, ICXOfferInfo>)[makeOfferTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    // close offer makeOfferTxId - taker
    await client.icxorderbook.closeOffer(makeOfferTxId)
    await container.generate(1)

    // List the ICX offers for orderTx = createOrderTxId and check no more offers
    const ordersAfterCloseOffer: Record<string, ICXOrderInfo | ICXOfferInfo> = await await container.call('icx_listorders', [{ orderTx: createOrderTxId }])
    expect(Object.keys(ordersAfterCloseOffer).length).toStrictEqual(1) // extra entry for the warning text returned by the RPC atm.

    // check accountBTC balance, should be the same as accountBTCBeforeOffer
    const accountBTCAfterOfferClose: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    expect(accountBTCAfterOfferClose).toStrictEqual(accountBTCBeforeOffer)
  })

  it('should close an offer with input utxos', async () => {
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
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

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
    expect((ordersAfterMakeOffer as Record<string, ICXOfferInfo>)[makeOfferTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    // input utxos
    const inputUTXOs = await container.fundAddress(accountBTC, 10)

    // close offer makeOfferTxId - taker
    await client.icxorderbook.closeOffer(makeOfferTxId, [inputUTXOs])
    await container.generate(1)

    // List the ICX offers for orderTx = createOrderTxId and check no more offers
    const ordersAfterCloseOffer: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [{ orderTx: createOrderTxId }], 'bignumber')
    expect(Object.keys(ordersAfterCloseOffer).length).toStrictEqual(1) // extra entry for the warning text returned by the RPC atm.

    // check accountBTC balance, should be the same as accountBTCBeforeOffer
    const accountBTCAfterOfferClose: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    expect(accountBTCAfterOfferClose).toStrictEqual(accountBTCBeforeOffer)
  })

  it('should return an error when incorrect offer transaction is passed', async () => {
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
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

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
    expect((ordersAfterMakeOffer as Record<string, ICXOfferInfo>)[makeOfferTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    // close offer "INVALID_OFFER_TX_ID" - taker
    const promise = client.icxorderbook.closeOffer('INVALID_OFFER_TX_ID')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'OfferTx (0000000000000000000000000000000000000000000000000000000000000000) does not exist\', code: -8, method: icx_closeoffer')

    // List the ICX offers for orderTx = createOrderTxId and check
    const ordersAfterCloseOffer: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [{ orderTx: createOrderTxId }], 'bignumber')
    expect(Object.keys(ordersAfterCloseOffer).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
  })
})
