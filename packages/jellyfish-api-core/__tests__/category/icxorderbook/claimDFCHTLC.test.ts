import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ExtHTLC, HTLC, ICXClaimDFCHTLCInfo, ICXDFCHTLCInfo, ICXEXTHTLCInfo, ICXGenericResult, ICXHTLCStatus,
  ICXHTLCType, ICXListHTLCOptions, ICXOfferInfo, ICXOrderInfo, ICXOffer, ICXOrder, InputUTXO
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { setup, accountDFI, idDFI, accountBTC, checkDFIBuyOfferDetails, checkDFISellOrderDetails, checkDFCHTLCDetails, checkEXTHTLCDetails } from './common.test'
import { RpcApiError } from '../../../src'

describe('Should test ICXOrderBook.calimDFCHTLC', () => {
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

  afterEach(async () => {
    // cleanup code here
  })

  // setup untill submitting external HTLC for DFC buy offer
  // returns the {makeOfferTxId, DFCHTLCTxId, ExtHTLCTxId}
  const setupUntilSubmitExtHTLCForDFCBuyOffer = async (): Promise<any> => {
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

    // make offer to 15 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.15), // 0.15 BTC = 15 DFI
      ownerAddress: accountBTC
    }
    const accountBTCBeforeOffer = await container.call('getaccount', [accountBTC, {}, true])
    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    const accountBTCAfterOffer = await container.call('getaccount', [accountBTC, {}, true])
    // check fee of 0.015 DFI has been reduced from the accountBTCBeforeOffer[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(Number(accountBTCAfterOffer[idDFI]).toPrecision(8)).toStrictEqual((Number(accountBTCBeforeOffer[idDFI]) - Number(0.015)).toPrecision(8))

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    await checkDFIBuyOfferDetails(container, offer, makeOfferTxId, orders as Record<string, ICXOfferInfo>)

    const accountDFIBeforeDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])

    // create DFCHTLC - maker
    const DFCHTLC: HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(15), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 500
    }
    const DFCHTLCTxId = (await client.icxorderbook.submitDFCHTLC(DFCHTLC)).txid
    await container.generate(1)

    const accountDFIAfterDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])
    // should reduce accountDFIBeforeDFCHTLC[idDFI] balance by 0.015 DFI
    expect(Number(accountDFIAfterDFCHTLC[idDFI]).toPrecision(8)).toStrictEqual((Number(accountDFIBeforeDFCHTLC[idDFI]) - Number(0.015)).toPrecision(8))

    // List htlc
    let listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    let HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    await checkDFCHTLCDetails(DFCHTLC, DFCHTLCTxId, HTLCs)

    const accountBTCBeforeEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // submit EXT HTLC - taker
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
    HTLCs = await container.call('icx_listhtlcs', [listHTLCOptions])
    expect(Object.keys(HTLCs).length).toBe(3) // extra entry for the warning text returned by the RPC atm.
    await checkEXTHTLCDetails(ExtHTLC, ExtHTLCTxId, HTLCs)

    const accountBTCAfterEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // should have the same balance as accountBTCAfterDFCHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)

    return {
      makeOfferTxId: makeOfferTxId,
      DFCHTLCTxId: DFCHTLCTxId,
      ExtHTLCTxId: ExtHTLCTxId
    }
  }

  it('Create ICX order to sell DFI, make offer, create HTLCs and claim DFCHTLC, maker and taker balances should be updated as expected', async () => {
    const { makeOfferTxId, DFCHTLCTxId } = await setupUntilSubmitExtHTLCForDFCBuyOffer()

    const accountDFIBeforeClaim = await container.call('getaccount', [accountDFI, {}, true])
    const accountBTCBeforeClaim = await container.call('getaccount', [accountBTC, {}, true])
    // claim
    const claimTxId = (await client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')).txid
    await container.generate(1)

    // List htlc and check
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId,
      closed: true
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
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
    // expect(Number(accountDFIAfterClaim[idDFI])).toStrictEqual(Number(accountDFIBeforeClaim[idDFI]) + Number(0.01500000000000) + Number(0.00375000000000))
    expect(Number(accountDFIAfterClaim[idDFI]).toPrecision(8)).toStrictEqual((Number(accountDFIBeforeClaim[idDFI]) + Number(0.01500000000000) + Number(0.00375000000000)).toPrecision(8))
    expect(Number(accountBTCAfterClaim[idDFI])).toStrictEqual(Number(accountBTCBeforeClaim[idDFI]) + Number(15))
  })

  it('Should claim DFCHTLC with input UTXOs', async () => {
    const { makeOfferTxId, DFCHTLCTxId } = await setupUntilSubmitExtHTLCForDFCBuyOffer()

    const accountDFIBeforeClaim = await container.call('getaccount', [accountDFI, {}, true])
    const accountBTCBeforeClaim = await container.call('getaccount', [accountBTC, {}, true])

    // input utxos
    const utxos = await container.call('listunspent', [1, 9999999, [accountDFI], true])
    const inputUTXOs: InputUTXO[] = utxos.map((utxo: InputUTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })
    // claim
    const claimTxId = (await client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef', inputUTXOs)).txid
    await container.generate(1)

    // List htlc and check
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId,
      closed: true
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await container.call('icx_listhtlcs', [listHTLCOptions])
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
    // expect(Number(accountDFIAfterClaim[idDFI])).toStrictEqual(Number(accountDFIBeforeClaim[idDFI]) + Number(0.01500000000000) + Number(0.00375000000000))
    expect(Number(accountDFIAfterClaim[idDFI]).toPrecision(8)).toStrictEqual((Number(accountDFIBeforeClaim[idDFI]) + Number(0.01500000000000) + Number(0.00375000000000)).toPrecision(8))
    expect(Number(accountBTCAfterClaim[idDFI])).toStrictEqual(Number(accountBTCBeforeClaim[idDFI]) + Number(15))
  })

  it('Should return an error when try to claim with invalid htlc transaction id', async () => {
    await setupUntilSubmitExtHTLCForDFCBuyOffer()

    // claim with invalid dfc htlc tx id "123"
    const promise = client.icxorderbook.claimDFCHTLC('123', 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXClaimDFCHTLCTx execution failed:\ndfc htlc with creation tx 0000000000000000000000000000000000000000000000000000000000000123 does not exists!\', code: -32600, method: icx_claimdfchtlc')
  })

  it('Should return an error when try to claim with invalid seed', async () => {
    const { DFCHTLCTxId } = await setupUntilSubmitExtHTLCForDFCBuyOffer()

    // claim with invalid seed "123"
    const promise = client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, '123')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXClaimDFCHTLCTx execution failed:\nhash generated from given seed is different than in dfc htlc: f299791cddd3d6664f6670842812ef6053eb6501bd6282a476bbbf3ee91e750c - 957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220!\', code: -32600, method: icx_claimdfchtlc')
  })
})
