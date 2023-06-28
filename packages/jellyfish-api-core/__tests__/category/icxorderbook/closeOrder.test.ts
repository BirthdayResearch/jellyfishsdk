import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ExtHTLC,
  HTLC,
  ICXClaimDFCHTLCInfo,
  ICXDFCHTLCInfo,
  ICXEXTHTLCInfo,
  ICXGenericResult,
  ICXHTLCStatus,
  ICXHTLCType,
  ICXListHTLCOptions,
  ICXOffer,
  ICXOfferInfo,
  ICXOrder,
  ICXOrderInfo,
  ICXOrderStatus,
  ICXOrderType
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { accountBTC, accountDFI, ICXSetup, idDFI, symbolBTC, symbolDFI } from './icx_setup'
import { RpcApiError } from '../../../src'

describe('ICXOrderBook.closeOrder', () => {
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

  it('should close the correct order', async () => {
    const accountDFIBeforeOrder: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
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

    // list ICX orders and check
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

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

    // list ICX orders and check
    const ordersAfterCreateOrder2: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    // check details for createOrder2TxId
    expect((ordersAfterCreateOrder2 as Record<string, ICXOrderInfo>)[createOrder2TxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    // close order createOrderTxId - maker
    await client.icxorderbook.closeOrder(createOrderTxId)
    await container.generate(1)

    // check createOrderTxId is no more and createOrder2TxId order still exists
    const ordersAfterCloseOrder1: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((ordersAfterCloseOrder1 as Record<string, ICXOrderInfo>)[createOrderTxId]).toBeUndefined()
    expect((ordersAfterCloseOrder1 as Record<string, ICXOrderInfo>)[createOrder2TxId]).toStrictEqual(
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

    // close createOrder2TxId order also - maker
    await client.icxorderbook.closeOrder(createOrder2TxId)
    await container.generate(1)

    // check both createOrder2TxId and createOrder2TxId is gone
    const ordersAfterCloseOrder2: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((ordersAfterCloseOrder2 as Record<string, ICXOrderInfo>)[createOrderTxId]).toBeUndefined()
    expect((ordersAfterCloseOrder2 as Record<string, ICXOrderInfo>)[createOrder2TxId]).toBeUndefined()

    // check accountDFI[idDFI] balance
    const accountDFIBalance: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    expect(accountDFIBalance).toStrictEqual(accountDFIBeforeOrder)
  })

  it('should close order with input utxos', async () => {
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

    // list ICX orders and check
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    // input utxos
    const inputUTXOs = await container.fundAddress(accountDFI, 10)
    // close order createOrderTxId - maker
    const closeTxId = (await client.icxorderbook.closeOrder(createOrderTxId, [inputUTXOs])).txid
    await container.generate(1)

    const rawtx = await container.call('getrawtransaction', [closeTxId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(inputUTXOs.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(inputUTXOs.vout)

    // list closed orders and check order createOrderTxId
    const ordersAfterCloseOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ closed: true })
    const orderInfoRetrived = ordersAfterCloseOrder as Record<string, ICXOrderInfo>
    expect(orderInfoRetrived[createOrderTxId].status).toStrictEqual(ICXOrderStatus.CLOSED)
    expect(orderInfoRetrived[createOrderTxId].ownerAddress).toStrictEqual(order.ownerAddress)
  })

  it('should close a partially settled DFI sell order', async () => {
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

    // list ICX orders anc check
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

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

    const accountBTCAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')

    // check fee of 0.01 DFI has been reduced from the accountBTCBeforeOffer[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI].minus(0.01))

    // List the ICX offers for orderTx = createOrderTxId and check
    const ordersAfterMakeOffer: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(ordersAfterMakeOffer).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect((ordersAfterMakeOffer as Record<string, ICXOfferInfo>)[makeOfferTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    const accountDFIBeforeDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // create DFCHTLC - maker
    const DFCHTLC: HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(10), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 1440
    }
    const DFCHTLCTxId = (await client.icxorderbook.submitDFCHTLC(DFCHTLC)).txid
    await container.generate(1)

    const accountDFIAfterDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    expect(accountDFIAfterDFCHTLC[idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[idDFI].minus(0.01))

    // List htlc anc check
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptions)
    expect(Object.keys(HTLCs).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect((HTLCs[DFCHTLCTxId] as ICXDFCHTLCInfo).type).toStrictEqual(ICXHTLCType.DFC)
    expect((HTLCs[DFCHTLCTxId] as ICXDFCHTLCInfo).status).toStrictEqual(ICXOrderStatus.OPEN)
    expect((HTLCs[DFCHTLCTxId] as ICXDFCHTLCInfo).offerTx).toStrictEqual(makeOfferTxId)

    // submit EXT HTLC - taker
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 24
    }
    const ExtHTLCTxId = (await client.icxorderbook.submitExtHTLC(ExtHTLC)).txid
    await container.generate(1)

    // List htlc and check
    const listHTLCOptionsAfterExtHTLC = {
      offerTx: makeOfferTxId
    }
    const HTLCsAfterExtHTLC: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptionsAfterExtHTLC)
    expect(Object.keys(HTLCsAfterExtHTLC).length).toStrictEqual(3) // extra entry for the warning text returned by the RPC atm.
    expect((HTLCsAfterExtHTLC[ExtHTLCTxId] as ICXEXTHTLCInfo).type).toStrictEqual(ICXHTLCType.EXTERNAL)
    expect((HTLCsAfterExtHTLC[ExtHTLCTxId] as ICXEXTHTLCInfo).status).toStrictEqual(ICXOrderStatus.OPEN)
    expect((HTLCsAfterExtHTLC[ExtHTLCTxId] as ICXEXTHTLCInfo).offerTx).toStrictEqual(makeOfferTxId)

    const accountBTCAfterEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // should have the same balance as accountBTCAfter
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCAfterEXTHTLC)

    const accountDFIBeforeClaim: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    const accountBTCBeforeClaim: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')

    // claim - taker
    const claimTxId = (await client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')).txid
    await container.generate(1)

    // List htlc and check
    const listHTLCOptionsAfterClaim = {
      offerTx: makeOfferTxId,
      closed: true
    }
    const HTLCsAfterClaim: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptionsAfterClaim)
    expect(Object.keys(HTLCsAfterClaim).length).toStrictEqual(4) // extra entry for the warning text returned by the RPC atm.
    // we have a common field "type", use that to narrow down the record
    if (HTLCsAfterClaim[claimTxId].type === ICXHTLCType.CLAIM_DFC) {
      // ICXClaimDFCHTLCInfo cast
      const ClaimHTLCInfo: ICXClaimDFCHTLCInfo = HTLCsAfterClaim[claimTxId] as ICXClaimDFCHTLCInfo
      expect(ClaimHTLCInfo.dfchtlcTx).toStrictEqual(DFCHTLCTxId)
      expect(ClaimHTLCInfo.seed).toStrictEqual('f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')
    }

    // check HTLC DFCHTLCTxId is in claimed status
    if (HTLCsAfterClaim[DFCHTLCTxId].type === ICXHTLCType.DFC) {
      // ICXDFCHTLCInfo cast
      const DFCHTLCInfo: ICXDFCHTLCInfo = HTLCsAfterClaim[DFCHTLCTxId] as ICXDFCHTLCInfo
      expect(DFCHTLCInfo.status).toStrictEqual(ICXHTLCStatus.CLAIMED)
    }

    const accountDFIAfterClaim: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    const accountBTCAfterClaim: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')

    // maker should get incentive + maker deposit and taker should get amount in DFCHTLCTxId HTLC - takerfee
    expect(accountDFIAfterClaim[idDFI]).toStrictEqual(accountDFIBeforeClaim[idDFI].plus(0.0125))
    expect(accountBTCAfterClaim[idDFI]).toStrictEqual(accountBTCBeforeClaim[idDFI].plus(10))

    // offer should be close by now
    const offersForOrder1: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(offersForOrder1).length).toStrictEqual(1) // extra entry for the warning text returned by the RPC atm.

    // check partial order remaining
    const ordersAfterClaim: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    const orderInfo: Record<string, ICXOrderInfo> = ordersAfterClaim as Record<string, ICXOrderInfo>
    expect(orderInfo[createOrderTxId].tokenFrom).toStrictEqual(symbolDFI)
    expect(orderInfo[createOrderTxId].chainTo).toStrictEqual('BTC')
    expect(orderInfo[createOrderTxId].ownerAddress).toStrictEqual(accountDFI)
    expect(orderInfo[createOrderTxId].receivePubkey).toStrictEqual('037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941')
    expect(orderInfo[createOrderTxId].amountFrom).toStrictEqual(new BigNumber(15))
    expect(orderInfo[createOrderTxId].amountToFill).toStrictEqual(new BigNumber(5))
    expect(orderInfo[createOrderTxId].orderPrice).toStrictEqual(new BigNumber(0.01))
    expect(orderInfo[createOrderTxId].amountToFillInToAsset).toStrictEqual(new BigNumber(0.0500000))

    // try to close the createOrderTxId order - maker
    await client.icxorderbook.closeOrder(createOrderTxId)
    await container.generate(1)

    // check createOrderTxId order is no more
    const ordersAfterCloseOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((ordersAfterCloseOrder as Record<string, ICXOrderInfo>)[createOrderTxId]).toBeUndefined()

    // check accountDFI[idDFI] balance, remaining 5 DFI should be returned
    const accountDFIFinalBalance: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    expect(accountDFIFinalBalance[idDFI]).toStrictEqual(accountDFIAfterClaim[idDFI].plus(5))
  })

  it('should return an error when try to close an order with invalid transaction id', async () => {
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

    // list ICX orders and check
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    // close order "123" - maker
    const promise = client.icxorderbook.closeOrder('123')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'orderTx (0000000000000000000000000000000000000000000000000000000000000123) does not exist\', code: -8, method: icx_closeorder')

    // close order "INVALID_TX_ID" - maker
    const promise2 = client.icxorderbook.closeOrder('INVALID_TX_ID')
    await expect(promise2).rejects.toThrow(RpcApiError)
    await expect(promise2).rejects.toThrow('RpcApiError: \'orderTx (0000000000000000000000000000000000000000000000000000000000000000) does not exist\', code: -8, method: icx_closeorder')

    // check createOrderTxId order still exists
    const ordersAfterCloseOrderAttempts: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((ordersAfterCloseOrderAttempts as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
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
})
