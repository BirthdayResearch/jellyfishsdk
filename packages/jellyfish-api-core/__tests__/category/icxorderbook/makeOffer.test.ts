import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ExtHTLC, HTLC, ICXClaimDFCHTLCInfo, ICXDFCHTLCInfo, ICXEXTHTLCInfo, ICXGenericResult, ICXHTLCStatus,
  ICXHTLCType, ICXListHTLCOptions, ICXOfferInfo, ICXOrderInfo, ICXOffer, ICXOrder
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { setup, accountDFI, idDFI, accountBTC, checkBTCBuyOfferDetails, checkBTCSellOrderDetails, checkDFIBuyOfferDetails, checkDFISellOrderDetails, closeAllOrders, checkDFCHTLCDetails, checkEXTHTLCDetails } from './common.test'

describe('Should test ICXOrderBook.makeOffer', () => {
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

  it('Should make an partial offer to an sell DFI order', async () => {
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
    const accountBTCBefore = await container.call('getaccount', [accountBTC, {}, true])

    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    // accountBTC after partial make offer
    const accountBTCAfter = await container.call('getaccount', [accountBTC, {}, true])

    // check fee of 0.01 DFI has been reduced from the accountBTCBefore[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfter[idDFI]).toStrictEqual(accountBTCBefore[idDFI] - Number('0.01000000'))

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    // we know that only ICXOfferInfo will be returned, so cast and pass to check offer details
    await checkDFIBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)

    // close order createOrderTxId
    await client.icxorderbook.closeOrder(createOrderTxId)
    await container.generate(1)

    // check no more ICX orders
    orders = await client.icxorderbook.listOrders()
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check accountDFI[idDFI] balance
    const accountDFIBalance = await container.call('getaccount', [accountDFI, {}, true])
    expect(accountDFIBalance).toStrictEqual(accountDFIStartBalance)
  })

  it('Should make an partial offer to an sell BTC order', async () => {
    // accountDFI start balance
    const accountDFIStartBalance = await container.call('getaccount', [accountDFI, {}, true])
    const order: ICXOrder = {
      chainFrom: 'BTC',
      tokenTo: idDFI,
      ownerAddress: accountDFI,
      amountFrom: new BigNumber(2),
      orderPrice: new BigNumber(100)
    }

    let result: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = result.txid

    await container.generate(1)

    // list ICX orders
    let orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.icxorderbook.listOrders()
    // check details
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    // we know that only ICXOrderInfo will be returned, so cast and pass to check order details
    await checkBTCSellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)

    // make ICXMakeOffer to partial amout 1 BTC
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(100), // 100 DFI = 1 BTC
      ownerAddress: accountBTC,
      receivePubkey: '0348790cb93b203a8ea5ce07279cb209d807b535b2ca8b0988a6f7a6578e41f7a5'
    }
    // accountBTC before partial make offer
    const accountBTCBefore = await container.call('getaccount', [accountBTC, {}, true])

    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    // accountBTC after partial make offer
    const accountBTCAfter = await container.call('getaccount', [accountBTC, {}, true])

    // check fee of 0.1 DFI has been reduced from the accountBTCBefore[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfter[idDFI]).toStrictEqual(accountBTCBefore[idDFI] - Number('0.1000000'))

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    // we know that only ICXOfferInfo will be returned, so cast and pass to check offer details
    await checkBTCBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)

    // close order createOrderTxId
    await client.icxorderbook.closeOrder(createOrderTxId)
    await container.generate(1)

    // check no more ICX orders
    orders = await client.icxorderbook.listOrders()
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check accountDFI[idDFI] balance
    const accountDFIBalance = await container.call('getaccount', [accountDFI, {}, true])
    expect(accountDFIBalance).toStrictEqual(accountDFIStartBalance)
  })
})

describe('Should test ICXOrderBook.makeOffer 2', () => {
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

  it('Make a higher offer to an sell DFI order, then the extra amount should be returned when DFCHTLC is submitted', async () => {
    // accountDFI start balance
    await container.call('getaccount', [accountDFI, {}, true])
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

    // make ICXMakeOffer to higher amout 20 DFI
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.20), // 0.20 BTC = 20 DFI
      ownerAddress: accountBTC
    }
    // accountBTC before partial make offer
    const accountBTCBefore = await container.call('getaccount', [accountBTC, {}, true])

    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    // accountBTC balance after partial make offer
    const accountBTCAfterOffer = await container.call('getaccount', [accountBTC, {}, true])

    // check fee of 0.01 DFI has been reduced from the accountBTCBefore[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBefore[idDFI] - 0.02)

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
      amount: new BigNumber(15), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 500
    }
    const DFCHTLCTxId = (await client.icxorderbook.submitDFCHTLC(DFCHTLC)).txid
    await container.generate(1)

    // accountDFI balance after DFCHTLC
    const accountDFIAfterDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])
    expect(accountDFIAfterDFCHTLC[idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[idDFI] - 0.015)

    // accountBTC balance after DFCHTLC should have extra taker fee of 0.005 DFI back in account
    const accountBTCAfterDFCHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // should have the same balance as accountBTCAfter
    expect(accountBTCAfterDFCHTLC[idDFI]).toStrictEqual(Number(accountBTCAfterOffer[idDFI]) + Number('0.005'))

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
      amount: new BigNumber(0.15),
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
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCAfterDFCHTLC)

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
    expect(accountDFIAfterClaim[idDFI]).toStrictEqual(Number(accountDFIBeforeClaim[idDFI]) + Number('0.015') + Number('0.00375'))
    expect(accountBTCAfterClaim[idDFI]).toStrictEqual(Number(accountBTCBeforeClaim[idDFI]) + Number('15'))

    // offer should be close by now, eventhough we offered higher than order, change is already returned to us
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check no more orders
    orders = await client.icxorderbook.listOrders()
    // check details
    expect(Object.keys(orders).length).toBe(1)
  })
})
