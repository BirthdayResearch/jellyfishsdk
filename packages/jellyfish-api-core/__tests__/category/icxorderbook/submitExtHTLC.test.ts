import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ExtHTLC, HTLC, ICXClaimDFCHTLCInfo, ICXDFCHTLCInfo, ICXEXTHTLCInfo, ICXGenericResult,
  ICXListHTLCOptions, ICXOfferInfo, ICXOrderInfo, ICXOffer, ICXOrder, UTXO, ICXHTLCType, ICXOrderStatus, ICXOrderType
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { accountDFI, idDFI, accountBTC, ICXSetup, DEX_DFI_PER_BTC_RATE, ICX_TAKERFEE_PER_BTC, symbolBTC, symbolDFI } from './icx_setup'
import { RpcApiError } from '../../../src'

describe('ICXOrderBook.submitExtHTLC', () => {
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
  })

  afterAll(async () => {
    await container.stop()
  })

  afterEach(async () => {
    // cleanup code here
  })

  it('should submit external htlc for a dfc buy offer', async () => {
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
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI] - 0.01)

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
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
    expect(accountDFIAfterDFCHTLC[idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[idDFI] - 0.01)

    // List htlc
    let listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    let HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
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

    const accountBTCBeforeEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // submit EXT HTLC - taker
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
    HTLCs = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toBe(3) // extra entry for the warning text returned by the RPC atm.
    expect(HTLCs[ExtHTLCTxId] as ICXEXTHTLCInfo).toStrictEqual(
      {
        type: ICXHTLCType.EXTERNAL,
        status: ICXOrderStatus.OPEN,
        offerTx: makeOfferTxId,
        amount: ExtHTLC.amount,
        amountInDFCAsset: ExtHTLC.amount.dividedBy(order.orderPrice),
        hash: ExtHTLC.hash,
        htlcScriptAddress: ExtHTLC.htlcScriptAddress,
        ownerPubkey: ExtHTLC.ownerPubkey,
        timeout: new BigNumber(ExtHTLC.timeout),
        height: expect.any(BigNumber)
      }
    )

    const accountBTCAfterEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // should have the same balance as accountBTCAfterDFCHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should submit external htlc for a btc buy offer', async () => {
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
    expect((orders as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.EXTERNAL,
        tokenTo: order.tokenTo === '0' ? symbolDFI : symbolBTC,
        chainFrom: order.chainFrom,
        ownerAddress: order.ownerAddress,
        amountFrom: order.amountFrom,
        amountToFill: order.amountFrom,
        orderPrice: order.orderPrice,
        amountToFillInToAsset: order.amountFrom.multipliedBy(order.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber)
      }
    )

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
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI] - 0.1000000)

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    expect((orders as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
      {
        orderTx: createOrderTxId,
        status: ICXOrderStatus.OPEN,
        amount: offer.amount,
        amountInFromAsset: offer.amount.dividedBy(order.orderPrice),
        ownerAddress: offer.ownerAddress,
        takerFee: offer.amount.multipliedBy(ICX_TAKERFEE_PER_BTC),
        expireHeight: expect.any(BigNumber),
        receivePubkey: offer.receivePubkey
      }
    )

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
    const listHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
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

    const accountDFIAfterEXTHTLC = await container.call('getaccount', [accountDFI, {}, true])
    // maker deposit should be reduced from accountDFI
    expect(accountDFIAfterEXTHTLC[idDFI]).toStrictEqual(accountDFIStartBalance[idDFI] - 0.1)
  })

  it('should submit external htlc for a dfc buy offer with input utxos', async () => {
    // create order - maker
    const { order, makeOfferTxId } = await icxSetup.setupUntilSubmitDFCHTLCForDFIBuyOffer()

    const accountBTCBeforeEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // submit EXT HTLC - taker
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 15
    }
    // input utxos
    const utxos = await container.call('listunspent', [1, 9999999, [accountBTC], true])
    const inputUTXOs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })
    const ExtHTLCTxId = (await client.icxorderbook.submitExtHTLC(ExtHTLC, inputUTXOs)).txid
    await container.generate(1)

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toBe(3) // extra entry for the warning text returned by the RPC atm.
    expect(HTLCs[ExtHTLCTxId] as ICXEXTHTLCInfo).toStrictEqual(
      {
        type: ICXHTLCType.EXTERNAL,
        status: ICXOrderStatus.OPEN,
        offerTx: makeOfferTxId,
        amount: ExtHTLC.amount,
        amountInDFCAsset: ExtHTLC.amount.dividedBy(order.orderPrice),
        hash: ExtHTLC.hash,
        htlcScriptAddress: ExtHTLC.htlcScriptAddress,
        ownerPubkey: ExtHTLC.ownerPubkey,
        timeout: new BigNumber(ExtHTLC.timeout),
        height: expect.any(BigNumber)
      }
    )

    const accountBTCAfterEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // should have the same balance as accountBTCAfterDFCHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should return an error when submit external htlc with incorrect ExtHTLC.offerTx', async () => {
    const { makeOfferTxId } = await icxSetup.setupUntilSubmitDFCHTLCForDFIBuyOffer()

    const accountBTCBeforeEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // submit EXT HTLC with offer tx "123"- taker
    const ExtHTLC: ExtHTLC = {
      offerTx: '123',
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 15
    }
    const promise = client.icxorderbook.submitExtHTLC(ExtHTLC)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'offerTx (0000000000000000000000000000000000000000000000000000000000000123) does not exist\', code: -8, method: icx_submitexthtlc')

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toBe(2) // extra entry for the warning text returned by the RPC atm.

    const accountBTCAfterEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // should have the same balance as accountBTCAfterDFCHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should return an error when submit external htlc with higher ExtHTLC.amount than the amount in offer', async () => {
    const { makeOfferTxId } = await icxSetup.setupUntilSubmitDFCHTLCForDFIBuyOffer()

    const accountBTCBeforeEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // submit EXT HTLC with amount 0.20 BTC- taker
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.20), // here we are passing 0.20 BTC which is greater than the amount in makeOfferTxId 0.1 BTC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 15
    }
    const promise = client.icxorderbook.submitExtHTLC(ExtHTLC)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXSubmitEXTHTLCTx execution failed:\namount must be equal to calculated dfchtlc amount\', code: -32600, method: icx_submitexthtlc')

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toBe(2) // extra entry for the warning text returned by the RPC atm.

    const accountBTCAfterEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // should have the same balance as accountBTCAfterDFCHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should return an error when submit external htlc with incorrect hash from hash in dfc htlc', async () => {
    const { makeOfferTxId } = await icxSetup.setupUntilSubmitDFCHTLCForDFIBuyOffer()

    const accountBTCBeforeEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // submit EXT HTLC with incorrect hash from DFCHTLC hash- taker
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '123',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 15
    }
    const promise = client.icxorderbook.submitExtHTLC(ExtHTLC)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXSubmitEXTHTLCTx execution failed:\nInvalid hash, external htlc hash is different than dfc htlc hash\', code: -32600, method: icx_submitexthtlc')

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toBe(2) // extra entry for the warning text returned by the RPC atm.

    const accountBTCAfterEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // should have the same balance as accountBTCAfterDFCHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should return an error when submit external htlc with incorrect ExtHTLC.ownerPubkey', async () => {
    const { makeOfferTxId } = await icxSetup.setupUntilSubmitDFCHTLCForDFIBuyOffer()

    const accountBTCBeforeEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // submit EXT HTLC with incorrect ownerPubkey "123" - taker
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '123',
      timeout: 15
    }
    const promise = client.icxorderbook.submitExtHTLC(ExtHTLC)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid public key: 123\', code: -5, method: icx_submitexthtlc')

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toBe(2) // extra entry for the warning text returned by the RPC atm.

    const accountBTCAfterEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // should have the same balance as accountBTCAfterDFCHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should test submit external htlc with different values for ExtHTLC.timeout', async () => {
    const { makeOfferTxId } = await icxSetup.setupUntilSubmitDFCHTLCForDFIBuyOffer()

    const accountBTCBeforeEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // submit EXT HTLC with timeout < 14 - taker
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 14
    }
    let promise = client.icxorderbook.submitExtHTLC(ExtHTLC)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXSubmitEXTHTLCTx execution failed:\ntimeout must be greater than 14\', code: -32600, method: icx_submitexthtlc')

    // submit EXT HTLC with  a ExtHTLC.timeout such that order->creationHeight + order->expiry < current height + (ExtHTLC.timeout * 16) - taker
    ExtHTLC.timeout = 400
    promise = client.icxorderbook.submitExtHTLC(ExtHTLC)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXSubmitEXTHTLCTx execution failed:\norder will expire before ext htlc expires!\', code: -32600, method: icx_submitexthtlc')

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toBe(2) // extra entry for the warning text returned by the RPC atm.

    const accountBTCAfterEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // should have the same balance as accountBTCAfterDFCHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should return an error when submit external htlc prior to dfc htlc for buy dfi offer', async () => {
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
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI] - 0.01)

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
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

    // No DFC HTLC submitted.
    // submit EXT HTLC - taker
    const accountBTCBeforeEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 15
    }
    const promise = client.icxorderbook.submitExtHTLC(ExtHTLC)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXSubmitEXTHTLCTx execution failed:\noffer (' + makeOfferTxId + ') needs to have dfc htlc submitted first, but no dfc htlc found!\', code: -32600, method: icx_submitexthtlc')

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    const accountBTCAfterEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // should have the same balance as accountBTCAfterDFCHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })
})
