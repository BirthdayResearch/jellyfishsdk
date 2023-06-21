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
  ICXOrderStatus
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { accountBTC, accountDFI, ICXSetup, idDFI, symbolDFI } from './icx_setup'

describe('ICXOrderBook.listHTLCs', () => {
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

  it('should list HTLCs for particular offer', async () => {
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
    expect(accountDFIAfterDFCHTLC[idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[idDFI].minus(0.01))

    // List htlc anc check
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptions)
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
    expect(HTLCsAfterExtHTLC[DFCHTLCTxId] as ICXDFCHTLCInfo).toStrictEqual(
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

  it('should test ICXListHTLCOptions.limit parameter functionality', async () => {
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

    // List htlc without limit param and check
    const listHTLCOptionsAfterExtHTLC = {
      offerTx: makeOfferTxId
    }
    const HTLCsAfterExtHTLC: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptionsAfterExtHTLC)
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
    expect(HTLCsAfterExtHTLC[DFCHTLCTxId] as ICXDFCHTLCInfo).toStrictEqual(
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

    // List htlc with limit of 1 and check
    const listHTLCOptionsWithLimit1 = {
      offerTx: makeOfferTxId,
      limit: 1
    }
    const HTLCsWithLimit1: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptionsWithLimit1)
    expect(Object.keys(HTLCsWithLimit1).length).toStrictEqual(2)
  })

  it.skip('should list closed HTLCs with ICXListHTLCOptions.closed parameter after HTLCs are expired', async () => {
    jest.setTimeout(1200000)
    const startBlockHeight = (await container.call('getblockchaininfo', [])).blocks
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
    const DFCHTLCTxId = (await client.icxorderbook.submitDFCHTLC(DFCHTLC)).txid
    await container.generate(1)

    const accountDFIAfterDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    expect(accountDFIAfterDFCHTLC[idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[idDFI].minus(0.01))

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

    // List htlc without limit param and check
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptions)
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

    // expire HTLCs
    await container.generate(2000)
    const endBlockHeight = (await container.call('getblockchaininfo', [])).blocks
    expect(endBlockHeight).toBeGreaterThan(Number(startBlockHeight) + Number(550))

    // List htlc anc check
    const listHTLCOptionsAfterExpiry = {
      offerTx: makeOfferTxId
    }
    const HTLCsAfterExpiry: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptionsAfterExpiry)
    expect(Object.keys(HTLCsAfterExpiry).length).toStrictEqual(2) // NOTE(surangap): EXT HTLC will still be in OPEN state

    // List refended htlcs also and check
    const listHTLCOptionsWithRefunded = {
      offerTx: makeOfferTxId,
      closed: true
    }
    const HTLCsWithRefunded: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptionsWithRefunded)
    expect(Object.keys(HTLCsWithRefunded).length).toStrictEqual(3)
  })

  it('should list closed HTLCs with ICXListHTLCOptions.closed parameter after DFC HTLC claim', async () => {
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

    // List htlc without limit param and check
    const listHTLCOptionsAfterExtHTLC = {
      offerTx: makeOfferTxId
    }
    const HTLCsAfterExtHTLC: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptionsAfterExtHTLC)
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
    expect(HTLCsAfterExtHTLC[DFCHTLCTxId] as ICXDFCHTLCInfo).toStrictEqual(
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

    // claim - taker
    const claimTxId = (await client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')).txid
    await container.generate(1)

    // List HTLCs for offer
    const listHTLCOptionsAfterClaim = {
      offerTx: makeOfferTxId
    }
    const HTLCsAfterClaim: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptionsAfterClaim)
    expect(Object.keys(HTLCsAfterClaim).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    // we have a common field "type", use that to narrow down the record
    if (HTLCsAfterClaim[claimTxId].type === ICXHTLCType.CLAIM_DFC) {
      // ICXClaimDFCHTLCInfo cast
      const ClaimHTLCInfo: ICXClaimDFCHTLCInfo = HTLCsAfterClaim[claimTxId] as ICXClaimDFCHTLCInfo
      expect(ClaimHTLCInfo.dfchtlcTx).toStrictEqual(DFCHTLCTxId)
      expect(ClaimHTLCInfo.seed).toStrictEqual('f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')
    }

    // List htlc with closed=true and check
    const listHTLCOptionsWithClosed = {
      offerTx: makeOfferTxId,
      closed: true
    }
    const HTLCsWithClosed: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptionsWithClosed)
    expect(Object.keys(HTLCsWithClosed).length).toStrictEqual(4) // extra entry for the warning text returned by the RPC atm.
    // we have a common field "type", use that to narrow down the record
    if (HTLCsWithClosed[claimTxId].type === ICXHTLCType.CLAIM_DFC) {
      // ICXClaimDFCHTLCInfo cast
      const ClaimHTLCInfo: ICXClaimDFCHTLCInfo = HTLCsWithClosed[claimTxId] as ICXClaimDFCHTLCInfo
      expect(ClaimHTLCInfo.dfchtlcTx).toStrictEqual(DFCHTLCTxId)
      expect(ClaimHTLCInfo.seed).toStrictEqual('f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')
    }

    if (HTLCsWithClosed[DFCHTLCTxId].type === ICXHTLCType.DFC) {
      // ICXDFCHTLCInfo cast
      const DFCHTLCInfo: ICXDFCHTLCInfo = HTLCsWithClosed[DFCHTLCTxId] as ICXDFCHTLCInfo
      expect(DFCHTLCInfo.offerTx).toStrictEqual(makeOfferTxId)
      expect(DFCHTLCInfo.status).toStrictEqual(ICXHTLCStatus.CLAIMED)
    }

    if (HTLCsWithClosed[ExtHTLCTxId].type === ICXHTLCType.EXTERNAL) {
      // ICXEXTHTLCInfo cast
      const ExtHTLCInfo: ICXEXTHTLCInfo = HTLCsWithClosed[ExtHTLCTxId] as ICXEXTHTLCInfo
      expect(ExtHTLCInfo.offerTx).toStrictEqual(makeOfferTxId)
      expect(ExtHTLCInfo.status).toStrictEqual(ICXHTLCStatus.CLOSED)
    }
  })

  it('should return an empty result set when invalid ICXListHTLCOptions.offerTx is passed', async () => {
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
    const DFCHTLCTxId = (await client.icxorderbook.submitDFCHTLC(DFCHTLC)).txid
    await container.generate(1)

    const accountDFIAfterDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    expect(accountDFIAfterDFCHTLC[idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[idDFI].minus(0.01))

    // List htlc and check
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptions)
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

    // List htlcs with invalid offer tx "123" and check
    const listHTLCOptionsIncorrectOfferTx = {
      offerTx: '123'
    }
    const HTLCsForIncorrectOfferTx: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptionsIncorrectOfferTx)
    expect(Object.keys(HTLCsForIncorrectOfferTx).length).toStrictEqual(1) // extra entry for the warning text returned by the RPC atm.

    // List htlcs with invalid offer tx "INVALID_OFFER_TX" and check
    const listHTLCOptionsIncorrectOfferTx2 = {
      offerTx: 'INVALID_OFFER_TX'
    }
    const HTLCsForIncorrectOfferTx2: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptionsIncorrectOfferTx2)
    expect(Object.keys(HTLCsForIncorrectOfferTx2).length).toStrictEqual(1) // extra entry for the warning text returned by the RPC atm.
  })
})
