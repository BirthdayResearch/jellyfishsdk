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
    await icxSetup.setupICXFlag()
  })

  afterAll(async () => {
    await container.stop()
  })

  afterEach(async () => {
    await icxSetup.closeAllOpenOffers()
  })

  it('should submit ExtHTLC for a DFC buy offer', async () => {
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
    expect((HTLCs[DFCHTLCTxId] as ICXDFCHTLCInfo).type).toStrictEqual(ICXHTLCType.DFC)
    expect((HTLCs[DFCHTLCTxId] as ICXDFCHTLCInfo).status).toStrictEqual(ICXOrderStatus.OPEN)
    expect((HTLCs[DFCHTLCTxId] as ICXDFCHTLCInfo).offerTx).toStrictEqual(makeOfferTxId)

    const accountBTCBeforeEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
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

    // List htlc for offer Tx makeOfferTxId
    const listHTLCOptionsAfterExtHTLC = {
      offerTx: makeOfferTxId
    }
    const HTLCsAfterExtHTLC: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptionsAfterExtHTLC], 'bignumber')
    expect(Object.keys(HTLCsAfterExtHTLC).length).toStrictEqual(3) // extra entry for the warning text returned by the RPC atm.
    expect(HTLCsAfterExtHTLC[ExtHTLCTxId] as ICXEXTHTLCInfo).toStrictEqual(
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

    const accountBTCAfterEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // should have the same balance as accountBTCAfterEXTHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should submit ExtHTLC for a BTC buy offer', async () => {
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
    const ExtHTLCTxId = (await client.icxorderbook.submitExtHTLC(ExtHTLC)).txid
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

    const accountDFIAfterEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // maker deposit should be reduced from accountDFI
    expect(accountDFIAfterEXTHTLC[idDFI]).toStrictEqual(accountDFIBeforeExtHTLC[idDFI].minus(0.1))
  })

  it('should submit ExtHTLC for a DFC buy offer with input utxos', async () => {
    const { order, createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)

    const accountBTCBeforeEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // submit EXT HTLC - taker
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 24
    }

    // input utxos
    const inputUTXOs = await container.fundAddress(accountBTC, 10)
    const ExtHTLCTxId = (await client.icxorderbook.submitExtHTLC(ExtHTLC, [inputUTXOs])).txid
    await container.generate(1)

    const rawtx = await container.call('getrawtransaction', [ExtHTLCTxId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(inputUTXOs.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(inputUTXOs.vout)

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toStrictEqual(3) // extra entry for the warning text returned by the RPC atm.
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

    const accountBTCAfterEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // should have the same balance as accountBTCBeforeEXTHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should return an error when submitting ExtHTLC with incorrect ExtHTLC.offerTx', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)

    const accountBTCBeforeEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // submit EXT HTLC with offer tx "123"- taker
    const ExtHTLC: ExtHTLC = {
      offerTx: '123',
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 24
    }
    const promise = client.icxorderbook.submitExtHTLC(ExtHTLC)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'offerTx (0000000000000000000000000000000000000000000000000000000000000123) does not exist\', code: -8, method: icx_submitexthtlc')

    // submit EXT HTLC with offer tx "INVALID_OFFER_TX_ID"- taker
    const ExtHTLC2: ExtHTLC = {
      offerTx: 'INVALID_OFFER_TX_ID',
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 24
    }
    const promise2 = client.icxorderbook.submitExtHTLC(ExtHTLC2)
    await expect(promise2).rejects.toThrow(RpcApiError)
    await expect(promise2).rejects.toThrow('RpcApiError: \'offerTx (0000000000000000000000000000000000000000000000000000000000000000) does not exist\', code: -8, method: icx_submitexthtlc')

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.

    const accountBTCAfterEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // should have the same balance as accountBTCBeforeEXTHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should return an error when submitting ExtHTLC with incorrect ExtHTLC.amount than the amount in DFC HTLC', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)

    const accountBTCBeforeEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // submit EXT HTLC with amount 0.20 BTC- taker
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.20), // here we are passing 0.20 BTC which is greater than the amount in DFC HTLC which is 0.1 BTC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 24
    }
    const promise = client.icxorderbook.submitExtHTLC(ExtHTLC)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXSubmitEXTHTLCTx execution failed:\namount must be equal to calculated dfchtlc amount\', code: -32600, method: icx_submitexthtlc')

    // submit EXT HTLC with amount 0.05 BTC- taker
    const ExtHTLC2: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.05), // here we are passing 0.05 BTC which is lesser than the amount in DFC HTLC which is 0.1 BTC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 24
    }
    const promise2 = client.icxorderbook.submitExtHTLC(ExtHTLC2)
    await expect(promise2).rejects.toThrow(RpcApiError)
    await expect(promise2).rejects.toThrow('RpcApiError: \'Test ICXSubmitEXTHTLCTx execution failed:\namount must be equal to calculated dfchtlc amount\', code: -32600, method: icx_submitexthtlc')

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.

    const accountBTCAfterEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // should have the same balance as accountBTCBeforeEXTHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should return an error when submitting ExtHTLC with incorrect hash from the hash in DFC HTLC', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)

    const accountBTCBeforeEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // submit EXT HTLC with incorrect hash "INCORRECT_HASH" from DFCHTLC hash - taker
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: 'INCORRECT_HASH',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 24
    }
    const promise = client.icxorderbook.submitExtHTLC(ExtHTLC)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXSubmitEXTHTLCTx execution failed:\nInvalid hash, external htlc hash is different than dfc htlc hash\', code: -32600, method: icx_submitexthtlc')

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.

    const accountBTCAfterEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // should have the same balance as accountBTCAfterDFCHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should return an error when submitting ExtHTLC with invalid ExtHTLC.ownerPubkey', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)

    const accountBTCBeforeEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // submit EXT HTLC with incorrect ownerPubkey "INVALID_OWNER_PUB_KEY" - taker
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: 'INVALID_OWNER_PUB_KEY',
      timeout: 24
    }
    const promise = client.icxorderbook.submitExtHTLC(ExtHTLC)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid public key: INVALID_OWNER_PUB_KEY\', code: -5, method: icx_submitexthtlc')

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.

    const accountBTCAfterEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // should have the same balance as accountBTCBeforeEXTHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should test submitting ExtHTLC with different values for ExtHTLC.timeout', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)

    const accountBTCBeforeEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // submit EXT HTLC with timeout < 24 - taker
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 14
    }
    const promise = client.icxorderbook.submitExtHTLC(ExtHTLC)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXSubmitEXTHTLCTx execution failed:\ntimeout must be greater than 23\', code: -32600, method: icx_submitexthtlc')

    // submit EXT HTLC with  a ExtHTLC.timeout such that order->creationHeight + order->expiry < current height + (ExtHTLC.timeout * 16) - taker
    ExtHTLC.timeout = 400
    const promise2 = client.icxorderbook.submitExtHTLC(ExtHTLC)
    await expect(promise2).rejects.toThrow(RpcApiError)
    await expect(promise2).rejects.toThrow('RpcApiError: \'Test ICXSubmitEXTHTLCTx execution failed:\norder will expire before ext htlc expires!\', code: -32600, method: icx_submitexthtlc')

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.

    const accountBTCAfterEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // should have the same balance as accountBTCAfterDFCHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should return an error when submitting an ExtHTLC, prior to the DFC HTLC for buy DFI offer', async () => {
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

    // No DFC HTLC submitted yet.
    // submit EXT HTLC - taker
    const accountBTCBeforeEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 24
    }
    const promise = client.icxorderbook.submitExtHTLC(ExtHTLC)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Test ICXSubmitEXTHTLCTx execution failed:\noffer (${makeOfferTxId}) needs to have dfc htlc submitted first, but no dfc htlc found!', code: -32600, method: icx_submitexthtlc`)

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toStrictEqual(1) // extra entry for the warning text returned by the RPC atm.

    const accountBTCAfterEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // should have the same balance as accountBTCAfterDFCHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })

  it('should not submit ExtHTLC for a DFC buy offer with arbitary input utxos', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)

    const accountBTCBeforeEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // submit EXT HTLC with incorrect ownerPubkey "INVALID_OWNER_PUB_KEY" - taker
    const ExtHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 24
    }
    // input utxos
    const inputUTXOs = await container.fundAddress(await container.getNewAddress(), 10)
    const promise = client.icxorderbook.submitExtHTLC(ExtHTLC, [inputUTXOs])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXSubmitEXTHTLCTx execution failed:\ntx must have at least one input from offer owner\', code: -32600, method: icx_submitexthtlc')

    // List htlc
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.

    const accountBTCAfterEXTHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // should have the same balance as accountBTCBeforeEXTHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)
  })
})
