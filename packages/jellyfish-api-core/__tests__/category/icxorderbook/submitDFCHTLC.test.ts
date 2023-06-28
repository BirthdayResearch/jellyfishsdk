import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ExtHTLC,
  HTLC,
  ICXClaimDFCHTLCInfo,
  ICXDFCHTLCInfo,
  ICXEXTHTLCInfo,
  ICXGenericResult,
  ICXHTLCType,
  ICXListHTLCOptions,
  ICXOffer,
  ICXOfferInfo,
  ICXOrder,
  ICXOrderInfo,
  ICXOrderStatus
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { accountBTC, accountDFI, ICXSetup, idDFI, symbolDFI } from './icx_setup'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('ICXOrderBook.submitDFCHTLC', () => {
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

  it('should submit DFC HTLC for a DFC buy offer', async () => {
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
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // make Offer to partial amount 10 DFI - taker
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
    const offersForOrder1: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(offersForOrder1).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect((offersForOrder1 as Record<string, ICXOfferInfo>)[makeOfferTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

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
    // maker fee should be reduced from accountDFIBeforeDFCHTLC
    expect(accountDFIAfterDFCHTLC[idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[idDFI].minus(0.01))

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect(HTLCs[DFCHTLCTxId] as ICXDFCHTLCInfo).toStrictEqual(
      {
        type: ICXHTLCType.DFC,
        status: ICXOrderStatus.OPEN,
        offerTx: makeOfferTxId,
        amount: DFCHTLC.amount,
        amountInEXTAsset: DFCHTLC.amount.multipliedBy(order.orderPrice),
        hash: DFCHTLC.hash,
        timeout: new BigNumber(DFCHTLC.timeout as number),
        height: expect.any(BigNumber),
        refundHeight: expect.any(BigNumber)
      }
    )
  })

  it('should submit DFC HTLC for a lower amount than the amount in DFC buy offer', async () => {
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
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // make Offer to partial amount 10 DFI - taker
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
    const offersForOrder1: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(offersForOrder1).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect((offersForOrder1 as Record<string, ICXOfferInfo>)[makeOfferTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    const accountDFIBeforeDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // create DFCHTLC for 5 DFI - maker
    const DFCHTLC: HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(5), // lower than the amout in offer
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 1440
    }
    const DFCHTLCTxId = (await client.icxorderbook.submitDFCHTLC(DFCHTLC)).txid
    await container.generate(1)

    const accountDFIAfterDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // maker fee should be reduced from accountDFIBeforeDFCHTLC
    expect(accountDFIAfterDFCHTLC[idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[idDFI].minus(0.005))

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect(HTLCs[DFCHTLCTxId] as ICXDFCHTLCInfo).toStrictEqual(
      {
        type: ICXHTLCType.DFC,
        status: ICXOrderStatus.OPEN,
        offerTx: makeOfferTxId,
        amount: DFCHTLC.amount,
        amountInEXTAsset: DFCHTLC.amount.multipliedBy(order.orderPrice),
        hash: DFCHTLC.hash,
        timeout: new BigNumber(DFCHTLC.timeout as number),
        height: expect.any(BigNumber),
        refundHeight: expect.any(BigNumber)
      }
    )
  })

  it('should submit DFC HTLC for a BTC buy offer', async () => {
    const order: ICXOrder = {
      chainFrom: 'BTC',
      tokenTo: idDFI,
      ownerAddress: accountDFI,
      amountFrom: new BigNumber(2),
      orderPrice: new BigNumber(100)
    }
    // create order - maker
    const createOrderResult: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = createOrderResult.txid
    await container.generate(1)

    // list ICX orders
    const ordersAfterCreateOrder: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders()
    expect((ordersAfterCreateOrder as Record<string, ICXOrderInfo>)[createOrderTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    const accountBTCBeforeOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // create Offer to partial amount 1 BTC - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(100), // 100 DFI = 1 BTC
      ownerAddress: accountBTC,
      receivePubkey: '0348790cb93b203a8ea5ce07279cb209d807b535b2ca8b0988a6f7a6578e41f7a5'
    }
    const makeOfferResult = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = makeOfferResult.txid
    await container.generate(1)

    const accountBTCAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // check fee of 0.1 DFI has been reduced from the accountBTCBeforeOffer[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI].minus(0.1))

    // List the ICX offers for orderTx = createOrderTxId and check
    const offersForOrder1: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(offersForOrder1).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect((offersForOrder1 as Record<string, ICXOfferInfo>)[makeOfferTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    const accountDFIBeforeExtHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // submit EXT HTLC - maker
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(1),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 100
    }
    const ExtHTLCTxId = (await container.call('icx_submitexthtlc', [ExtHTLC])).txid
    await container.generate(1)

    // List htlc
    const listHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect(HTLCs[ExtHTLCTxId] as ICXEXTHTLCInfo).toStrictEqual(
      {
        type: ICXHTLCType.EXTERNAL,
        status: ICXOrderStatus.OPEN,
        offerTx: makeOfferTxId,
        amount: ExtHTLC.amount,
        amountInDFCAsset: ExtHTLC.amount.multipliedBy(order.orderPrice),
        hash: ExtHTLC.hash,
        htlcScriptAddress: ExtHTLC.htlcScriptAddress,
        ownerPubkey: ExtHTLC.ownerPubkey,
        timeout: new BigNumber(ExtHTLC.timeout),
        height: expect.any(BigNumber)
      }
    )

    const accountDFIAfterExtHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // maker deposit should be reduced from accountDFI
    expect(accountDFIAfterExtHTLC[idDFI]).toStrictEqual(accountDFIBeforeExtHTLC[idDFI].minus(0.1))

    const accountBTCBeforeDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // create DFCHTLC - taker
    const DFCHTLC: HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(100), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220'
    }
    const DFCHTLCTxId = (await client.icxorderbook.submitDFCHTLC(DFCHTLC)).txid
    await container.generate(1)

    const accountBTCAfterDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    expect(accountBTCAfterDFCHTLC[idDFI]).toStrictEqual(accountBTCBeforeDFCHTLC[idDFI].minus(100))

    // List htlc
    const listHTLCOptionsAfterDFCHTLC = {
      offerTx: makeOfferTxId
    }
    const HTLCsAfterDFCHTLC: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptionsAfterDFCHTLC], 'bignumber')
    expect(Object.keys(HTLCsAfterDFCHTLC).length).toStrictEqual(3) // extra entry for the warning text returned by the RPC atm.
    expect(HTLCsAfterDFCHTLC[DFCHTLCTxId] as ICXDFCHTLCInfo).toStrictEqual(
      {
        type: ICXHTLCType.DFC,
        status: ICXOrderStatus.OPEN,
        offerTx: makeOfferTxId,
        amount: DFCHTLC.amount,
        amountInEXTAsset: DFCHTLC.amount.dividedBy(order.orderPrice),
        hash: DFCHTLC.hash,
        timeout: new BigNumber(480),
        height: expect.any(BigNumber),
        refundHeight: expect.any(BigNumber)
      }
    )
  })

  it('should submit DFC HTLC with input utxos for a DFC buy offer', async () => {
    const { order, createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)

    const accountDFIBeforeDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // create DFCHTLC - maker
    const DFCHTLC: HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(10), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 1440
    }

    // input utxos
    const inputUTXOs = await container.fundAddress(accountDFI, 10)
    const DFCHTLCTxId = (await client.icxorderbook.submitDFCHTLC(DFCHTLC, [inputUTXOs])).txid
    await container.generate(1)

    const rawtx = await container.call('getrawtransaction', [DFCHTLCTxId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(inputUTXOs.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(inputUTXOs.vout)

    const accountDFIAfterDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // maker fee should be reduced from accountDFIBeforeDFCHTLC
    expect(accountDFIAfterDFCHTLC[idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[idDFI].minus(0.01))

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect(HTLCs[DFCHTLCTxId] as ICXDFCHTLCInfo).toStrictEqual(
      {
        type: ICXHTLCType.DFC,
        status: ICXOrderStatus.OPEN,
        offerTx: makeOfferTxId,
        amount: DFCHTLC.amount,
        amountInEXTAsset: DFCHTLC.amount.multipliedBy(order.orderPrice),
        hash: DFCHTLC.hash,
        timeout: new BigNumber(DFCHTLC.timeout as number),
        height: expect.any(BigNumber),
        refundHeight: expect.any(BigNumber)
      }
    )
  })

  it('should return an error when submiting DFC HTLC with invalid HTLC.offerTx', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)

    const accountDFIBeforeDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // create DFCHTLC with invalid offerTx "INVALID_OFFER_TX_ID" - maker
    const DFCHTLC: HTLC = {
      offerTx: 'INVALID_OFFER_TX_ID',
      amount: new BigNumber(10), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 1440
    }
    const promise = client.icxorderbook.submitDFCHTLC(DFCHTLC)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'offerTx (0000000000000000000000000000000000000000000000000000000000000000) does not exist\', code: -8, method: icx_submitdfchtlc')

    // create DFCHTLC with invalid offerTx "123" - maker
    const DFCHTLC2: HTLC = {
      offerTx: '123',
      amount: new BigNumber(10), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 1440
    }
    const promise2 = client.icxorderbook.submitDFCHTLC(DFCHTLC2)

    await expect(promise2).rejects.toThrow(RpcApiError)
    await expect(promise2).rejects.toThrow('RpcApiError: \'offerTx (0000000000000000000000000000000000000000000000000000000000000123) does not exist\', code: -8, method: icx_submitdfchtlc')

    const accountDFIAfterDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // should be the same balance as accountDFIBeforeDFCHTLC
    expect(accountDFIAfterDFCHTLC[idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[idDFI])

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toStrictEqual(1) // extra entry for the warning text returned by the RPC atm.
  })

  it('should return an error when submiting DFC HTLC with incorrect HTLC.amount from the amount in the relavant offer', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)

    const accountDFIBeforeDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // create DFCHTLC with incorrect amount 15
    const DFCHTLC: HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(15), // here the amount is 15 DFI, but in the offer the amount is 10 DFI
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 1440
    }
    const promise = client.icxorderbook.submitDFCHTLC(DFCHTLC)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXSubmitDFCHTLCTx execution failed:\namount must be lower or equal the offer one\', code: -32600, method: icx_submitdfchtlc')

    const accountDFIAfterDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // should be the same balance as accountDFIBeforeDFCHTLC
    expect(accountDFIAfterDFCHTLC[idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[idDFI])

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toStrictEqual(1) // extra entry for the warning text returned by the RPC atm.
  })
})
