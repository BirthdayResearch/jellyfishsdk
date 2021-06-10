import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ExtHTLC, HTLC, ICXClaimDFCHTLCInfo, ICXDFCHTLCInfo, ICXEXTHTLCInfo, ICXGenericResult, ICXHTLCStatus,
  ICXHTLCType, ICXListHTLCOptions, ICXOfferInfo, ICXOrderInfo, ICXOffer, ICXOrder
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { setup, accountDFI, idDFI, checkDFISellOrderDetails, accountBTC, checkDFIBuyOfferDetails, symbolDFI, checkDFCHTLCDetails, checkEXTHTLCDetails, checkBTCSellOrderDetails, closeAllOrders } from './common.test'

describe('Should test ICXOrderBook.closeOrder', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForBlock(1)
    await setup(container)
  })

  afterAll(async () => {
    await container.stop()
  })

  beforeEach(async () => {
    // close any existing orders
    await closeAllOrders(container)
  })

  it('Should close the correct order', async () => {
    // accountDFI start balance
    const accountDFIStartBalance = await container.call('getaccount', [accountDFI, {}, true])

    // create first order
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

    // create second order
    // accountDFI start balance
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

    // list ICX orders
    orders = await client.icxorderbook.listOrders()
    // check details for createOrder2TxId
    expect(Object.keys(orders).length).toBe(3) // extra entry for the warning text returned by the RPC atm.
    // we know that only ICXOrderInfo will be returned, so cast and pass to check order details
    await checkBTCSellOrderDetails(container, order2, createOrder2TxId, orders as Record<string, ICXOrderInfo>)

    // close order createOrderTxId
    await client.icxorderbook.closeOrder(createOrderTxId)
    await container.generate(1)

    // check createOrder2TxId order still exists
    orders = await client.icxorderbook.listOrders()
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    // we know that only ICXOrderInfo will be returned, so cast and pass to check order details
    await checkBTCSellOrderDetails(container, order2, createOrder2TxId, orders as Record<string, ICXOrderInfo>)

    // close createOrder2TxId order also
    await client.icxorderbook.closeOrder(createOrder2TxId)
    await container.generate(1)

    // check no more ICX orders
    orders = await client.icxorderbook.listOrders()
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check accountDFI[idDFI] balance
    const accountDFIBalance = await container.call('getaccount', [accountDFI, {}, true])
    expect(accountDFIBalance).toStrictEqual(accountDFIStartBalance)
  })

  it('Should close a partially settled order', async () => {
    // accountDFI start balance
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
    expect(Object.keys(orders).length).toBe(2)
    await checkDFISellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)

    // make ICXMakeOffer to partial amout 10 DFI
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10), // 0.10 BTC = 10 DFI
      ownerAddress: accountBTC
    }
    // accountBTC before partial make offer
    const accountBTCBefore = await container.call('getaccount', [accountBTC, {}, true])

    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    // accountBTC balance after partial make offer
    const accountBTCAfter = await container.call('getaccount', [accountBTC, {}, true])

    // check fee of 0.01 DFI has been reduced from the accountBTCBefore[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfter[idDFI]).toStrictEqual(accountBTCBefore[idDFI] - 0.01)

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    // we know that only ICXOfferInfo will be returned, so cast and pass to check offer details
    await checkDFIBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)

    // accountDFI balance before DFCHTLC
    const accountDFIBeforeDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])

    // create DFCHTLC
    const DFCHTLC: HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(10), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 500
    }
    const DFCHTLCTxId = (await client.icxorderbook.submitDFCHTLC(DFCHTLC)).txid
    await container.generate(1)

    // accountDFI balance after DFCHTLC
    const accountDFIAfterDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])
    expect(accountDFIAfterDFCHTLC[idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[idDFI] - 0.01)

    // List htlc
    let listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    let HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptions)

    // check htlc
    expect(Object.keys(HTLCs).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    // check DFCHTLC details
    await checkDFCHTLCDetails(container, DFCHTLC, DFCHTLCTxId, HTLCs)

    // submit EXT HTLC
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 15
    }
    const ExtHTLCTxId = (await client.icxorderbook.submitExtHTLC(ExtHTLC)).txid
    await container.generate(1)

    // List htlc
    listHTLCOptions = {
      offerTx: makeOfferTxId
    }
    HTLCs = await client.icxorderbook.listHTLCs(listHTLCOptions)

    // check  EXT htlc
    expect(Object.keys(HTLCs).length).toBe(3) // extra entry for the warning text returned by the RPC atm.
    // check EXTHTLC details
    await checkEXTHTLCDetails(container, ExtHTLC, ExtHTLCTxId, HTLCs)

    // accountBTC balance after EXTHTLC
    const accountBTCAfterEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // should have the same balance as accountBTCAfter
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCAfter)

    const accountDFIBeforeClaim = await container.call('getaccount', [accountDFI, {}, true])
    const accountBTCBeforeClaim = await container.call('getaccount', [accountBTC, {}, true])

    // claim
    const claimTxId = (await client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')).txid
    await container.generate(1)

    // List htlc
    listHTLCOptions = {
      offerTx: makeOfferTxId,
      closed: true
    }
    HTLCs = await client.icxorderbook.listHTLCs(listHTLCOptions)

    // check  EXT htlc
    expect(Object.keys(HTLCs).length).toBe(4) // extra entry for the warning text returned by the RPC atm.
    // we have a common field "type", use that to narrow down the record
    if (HTLCs[claimTxId].type === ICXHTLCType.CLAIM_DFC) {
      // ICXClaimDFCHTLCInfo cast
      const ClaimHTLCInfo: ICXClaimDFCHTLCInfo = HTLCs[claimTxId] as ICXClaimDFCHTLCInfo
      expect(ClaimHTLCInfo.dfchtlcTx).toStrictEqual(DFCHTLCTxId)
      expect(ClaimHTLCInfo.seed).toStrictEqual('f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')
    }

    // check HTLC DFCHTLCTxId is in claimed status
    if (HTLCs[DFCHTLCTxId].type === ICXHTLCType.DFC) {
      // ICXDFCHTLCInfo cast
      const DFCHTLCInfo: ICXDFCHTLCInfo = HTLCs[DFCHTLCTxId] as ICXDFCHTLCInfo
      expect(DFCHTLCInfo.status).toStrictEqual(ICXHTLCStatus.CLAIMED)
    }

    const accountDFIAfterClaim = await container.call('getaccount', [accountDFI, {}, true])
    const accountBTCAfterClaim = await container.call('getaccount', [accountBTC, {}, true])

    // maker should get incentive + maker deposit and taker should get amount in DFCHTLCTxId HTLC - takerfee
    expect(accountDFIAfterClaim[idDFI]).toStrictEqual(Number(accountDFIBeforeClaim[idDFI]) + Number('0.0125'))
    expect(accountBTCAfterClaim[idDFI]).toStrictEqual(Number(accountBTCBeforeClaim[idDFI]) + Number('10'))

    // offer should be close by now
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check partial order remaining
    orders = await client.icxorderbook.listOrders()
    // check details
    expect(Object.keys(orders).length).toBe(2)
    // we know that only ICXOrderInfo will be returned, so cast
    const orderInfo: Record<string, ICXOrderInfo> = orders as Record<string, ICXOrderInfo>
    expect(orderInfo[createOrderTxId].tokenFrom).toStrictEqual(symbolDFI)
    expect(orderInfo[createOrderTxId].chainTo).toStrictEqual('BTC')
    expect(orderInfo[createOrderTxId].ownerAddress).toStrictEqual(accountDFI)
    expect(orderInfo[createOrderTxId].receivePubkey).toStrictEqual('037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941')
    expect(orderInfo[createOrderTxId].amountFrom).toStrictEqual(new BigNumber(15))
    expect(orderInfo[createOrderTxId].amountToFill).toStrictEqual(new BigNumber(5))
    expect(orderInfo[createOrderTxId].orderPrice).toStrictEqual(new BigNumber(0.01))
    expect(orderInfo[createOrderTxId].amountToFillInToAsset).toStrictEqual(new BigNumber(0.0500000))

    // try to close the createOrderTxId order
    await client.icxorderbook.closeOrder(createOrderTxId)
    await container.generate(1)

    // check no more ICX orders
    orders = await client.icxorderbook.listOrders()
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check accountDFI[idDFI] balance, remaining 5 DFI should be returned
    const accountDFIFinalBalance = await container.call('getaccount', [accountDFI, {}, true])
    expect(accountDFIFinalBalance[idDFI]).toStrictEqual(Number(accountDFIAfterClaim[idDFI]) + Number('5'))
  })
})
