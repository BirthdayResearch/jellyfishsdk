import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ICXGenericResult, ICXOfferInfo, ICXOrderInfo, ICXOffer, ICXOrder, UTXO, ICXOrderStatus, ICXOrderType } from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { accountDFI, idDFI, accountBTC, ICXSetup, symbolDFI, symbolBTC, ICX_TAKERFEE_PER_BTC, DEX_DFI_PER_BTC_RATE } from './icx_setup'
import { RpcApiError } from '../../../src'

describe('ICXOrderBook.closeOffer', () => {
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
    let result: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = result.txid
    await container.generate(1)

    // list ICX orders
    let orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
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
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI] - 0.01)

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.call('icx_listorders', [{ orderTx: createOrderTxId }], 'bignumber')
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

    // close offer makeOfferTxId - taker
    await client.icxorderbook.closeOffer(makeOfferTxId)
    await container.generate(1)

    // List the ICX offers for orderTx = createOrderTxId and check no more offers
    orders = await await container.call('icx_listorders', [{ orderTx: createOrderTxId }])
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check accountBTC balance, should be the same as accountBTCBeforeOffer
    const accountBTCAfterOfferClose = await container.call('getaccount', [accountBTC, {}, true])
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
    let result: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = result.txid
    await container.generate(1)

    // list ICX orders
    let orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
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
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI] - 0.01)

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.call('icx_listorders', [{ orderTx: createOrderTxId }], 'bignumber')
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

    // input utxos
    const utxos = await container.call('listunspent', [1, 9999999, [accountBTC], true])
    const inputUTXOs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })
    // close offer makeOfferTxId - taker
    await client.icxorderbook.closeOffer(makeOfferTxId, inputUTXOs)
    await container.generate(1)

    // List the ICX offers for orderTx = createOrderTxId and check no more offers
    orders = await client.call('icx_listorders', [{ orderTx: createOrderTxId }], 'bignumber')
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check accountBTC balance, should be the same as accountBTCBeforeOffer
    const accountBTCAfterOfferClose = await container.call('getaccount', [accountBTC, {}, true])
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
    let result: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = result.txid
    await container.generate(1)

    // list ICX orders
    let orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
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
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI] - 0.01)

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.call('icx_listorders', [{ orderTx: createOrderTxId }], 'bignumber')
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

    // close offer "123" - taker
    const promise = client.icxorderbook.closeOffer('123')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'OfferTx (0000000000000000000000000000000000000000000000000000000000000123) does not exist\', code: -8, method: icx_closeoffer')

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.call('icx_listorders', [{ orderTx: createOrderTxId }], 'bignumber')
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
  })
})
