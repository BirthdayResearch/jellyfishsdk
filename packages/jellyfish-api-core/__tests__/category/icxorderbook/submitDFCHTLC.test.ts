import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ExtHTLC, HTLC, ICXClaimDFCHTLCInfo, ICXDFCHTLCInfo, ICXEXTHTLCInfo, ICXGenericResult,
  ICXListHTLCOptions, ICXOfferInfo, ICXOrderInfo, ICXOffer, ICXOrder, InputUTXO
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import {
  setup, accountDFI, idDFI, accountBTC, checkBTCBuyOfferDetails, checkBTCSellOrderDetails,
  checkDFIBuyOfferDetails, checkDFISellOrderDetails, checkDFCHTLCDetails, checkEXTHTLCDetails
} from './common.test'
import { RpcApiError } from '../../../src'

describe('Test ICXOrderBook.submitDFCHTLC', () => {
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

  // common code for some tests until ICX offer
  const setupUntilDFIBuyOffer = async (): Promise<string> => {
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

    // make Offer to partial amout 10 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10), // 0.10 BTC = 10 DFI
      ownerAddress: accountBTC
    }
    const accountBTCBeforeOffer = await container.call('getaccount', [accountBTC, {}, true])

    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    const accountBTCAfterOffer = await container.call('getaccount', [accountBTC, {}, true])

    // check fee of 0.01 DFI has been reduced from the accountBTCBeforeOffer[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    // NOTE(surangap): why sometimes garbage values are in expected, floting point representation problems?
    expect(Number(accountBTCAfterOffer[idDFI]).toPrecision(8)).toStrictEqual((Number(accountBTCBeforeOffer[idDFI]) - Number(0.01)).toPrecision(8))

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    await checkDFIBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)

    return makeOfferTxId
  }

  it('Should submit DFCHTLC for a DFC buy offer', async () => {
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

    // make Offer to partial amout 10 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10), // 0.10 BTC = 10 DFI
      ownerAddress: accountBTC
    }
    const accountBTCBeforeOffer = await container.call('getaccount', [accountBTC, {}, true])

    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    const accountBTCAfterOffer = await container.call('getaccount', [accountBTC, {}, true])

    // check fee of 0.01 DFI has been reduced from the accountBTCBeforeOffer[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(Number(accountBTCAfterOffer[idDFI])).toStrictEqual(Number(accountBTCBeforeOffer[idDFI]) - Number(0.01))

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    await checkDFIBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)

    const accountDFIBeforeDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])

    // create DFCHTLC - maker
    const DFCHTLC: HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(10), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 500
    }
    const DFCHTLCTxId = (await client.icxorderbook.submitDFCHTLC(DFCHTLC)).txid
    await container.generate(1)

    const accountDFIAfterDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])
    // maker fee should be reduced from accountDFIBeforeDFCHTLC
    expect(Number(accountDFIAfterDFCHTLC[idDFI])).toStrictEqual(Number(accountDFIBeforeDFCHTLC[idDFI]) - Number(0.01))

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptions)
    expect(Object.keys(HTLCs).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    await checkDFCHTLCDetails(DFCHTLC, DFCHTLCTxId, HTLCs)
  })

  it('Should submit DFCHTLC for a BTC buy offer', async () => {
    const accountDFIStartBalance = await container.call('getaccount', [accountDFI, {}, true])
    const order: ICXOrder = {
      chainFrom: 'BTC',
      tokenTo: idDFI,
      ownerAddress: accountDFI,
      amountFrom: new BigNumber(2),
      orderPrice: new BigNumber(100)
    }
    // create order - maker
    let result: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = result.txid
    await container.generate(1)

    // list ICX orders
    let orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.icxorderbook.listOrders()
    await checkBTCSellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)

    // create Offer to partial amout 1 BTC - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(100), // 100 DFI = 1 BTC
      ownerAddress: accountBTC,
      receivePubkey: '0348790cb93b203a8ea5ce07279cb209d807b535b2ca8b0988a6f7a6578e41f7a5'
    }
    const accountBTCBeforeOffer = await container.call('getaccount', [accountBTC, {}, true])
    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    const accountBTCAfterOffer = await container.call('getaccount', [accountBTC, {}, true])

    // check fee of 0.1 DFI has been reduced from the accountBTCBeforeOffer[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(Number(accountBTCAfterOffer[idDFI])).toStrictEqual(Number(accountBTCBeforeOffer[idDFI]) - Number(0.1000000))

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    await checkBTCBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)

    // submit EXT HTLC - maker
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(1),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 100
    }
    const ExtHTLCTxId = (await client.icxorderbook.submitExtHTLC(ExtHTLC)).txid
    await container.generate(1)

    // List htlc
    let listHTLCOptions = {
      offerTx: makeOfferTxId
    }
    let HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptions)
    expect(Object.keys(HTLCs).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    await checkEXTHTLCDetails(ExtHTLC, ExtHTLCTxId, HTLCs)

    const accountDFIAfterEXTHTLC = await container.call('getaccount', [accountDFI, {}, true])
    // maker deposit should be reduced from accountDFI
    expect(Number(accountDFIAfterEXTHTLC[idDFI])).toStrictEqual(accountDFIStartBalance[idDFI] - Number(0.1000000))

    const accountBTCBeforeDFCHTLC = await container.call('getaccount', [accountBTC, {}, true])

    // create DFCHTLC - taker
    const DFCHTLC: HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(100), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220'
    }
    const DFCHTLCTxId = (await client.icxorderbook.submitDFCHTLC(DFCHTLC)).txid
    await container.generate(1)

    const accountBTCAfterDFCHTLC = await container.call('getaccount', [accountBTC, {}, true])
    expect(new BigNumber(accountBTCAfterDFCHTLC[idDFI])).toStrictEqual(new BigNumber(accountBTCBeforeDFCHTLC[idDFI]).minus(100))

    // List htlc
    listHTLCOptions = {
      offerTx: makeOfferTxId
    }
    HTLCs = await client.icxorderbook.listHTLCs(listHTLCOptions)
    expect(Object.keys(HTLCs).length).toBe(3) // extra entry for the warning text returned by the RPC atm.
    await checkDFCHTLCDetails(DFCHTLC, DFCHTLCTxId, HTLCs)
  })

  it('Should submit DFCHTLC for a DFC buy offer with input UTXOs', async () => {
    const makeOfferTxId = await setupUntilDFIBuyOffer()
    const accountDFIBeforeDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])

    // create DFCHTLC - maker
    const DFCHTLC: HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(10), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 500
    }

    // input utxos
    const utxos = await container.call('listunspent', [1, 9999999, [accountDFI], true])
    const inputUTXOs: InputUTXO[] = utxos.map((utxo: InputUTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })
    const DFCHTLCTxId = (await client.icxorderbook.submitDFCHTLC(DFCHTLC, inputUTXOs)).txid
    await container.generate(1)

    const accountDFIAfterDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])
    // maker fee should be reduced from accountDFIBeforeDFCHTLC
    expect(Number(accountDFIAfterDFCHTLC[idDFI])).toStrictEqual(Number(accountDFIBeforeDFCHTLC[idDFI]) - Number(0.01))

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptions)
    expect(Object.keys(HTLCs).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    await checkDFCHTLCDetails(DFCHTLC, DFCHTLCTxId, HTLCs)
  })

  it('Should return an error when submiting DFCHTLC with invalid HTLC.offerTx', async () => {
    const makeOfferTxId = await setupUntilDFIBuyOffer()
    const accountDFIBeforeDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])

    // create DFCHTLC with invalid offerTx "123" - maker
    const DFCHTLC: HTLC = {
      offerTx: '123',
      amount: new BigNumber(10), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 500
    }
    const promise = client.icxorderbook.submitDFCHTLC(DFCHTLC)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'offerTx (0000000000000000000000000000000000000000000000000000000000000123) does not exist\', code: -8, method: icx_submitdfchtlc')

    const accountDFIAfterDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])
    // should be the same balance as accountDFIBeforeDFCHTLC
    expect(Number(accountDFIAfterDFCHTLC[idDFI])).toStrictEqual(Number(accountDFIBeforeDFCHTLC[idDFI]))

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptions)
    expect(Object.keys(HTLCs).length).toBe(1) // extra entry for the warning text returned by the RPC atm.
  })

  it('Should return an error when submiting DFCHTLC with incorrect HTLC.amount than amount in the offer', async () => {
    const makeOfferTxId = await setupUntilDFIBuyOffer()
    const accountDFIBeforeDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])

    // create DFCHTLC with invalid offerTx "123" - maker
    const DFCHTLC: HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(15), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 500
    }
    const promise = client.icxorderbook.submitDFCHTLC(DFCHTLC)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXSubmitDFCHTLCTx execution failed:\namount must be lower or equal the offer one\', code: -32600, method: icx_submitdfchtlc')

    const accountDFIAfterDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])
    // should be the same balance as accountDFIBeforeDFCHTLC
    expect(Number(accountDFIAfterDFCHTLC[idDFI])).toStrictEqual(Number(accountDFIBeforeDFCHTLC[idDFI]))

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptions)
    expect(Object.keys(HTLCs).length).toBe(1) // extra entry for the warning text returned by the RPC atm.
  })
})
