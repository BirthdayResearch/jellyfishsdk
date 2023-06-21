import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
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
import {
  accountBTC,
  accountDFI,
  DEX_DFI_PER_BTC_RATE,
  ICX_TAKERFEE_PER_BTC,
  ICXSetup,
  idDFI,
  symbolBTC,
  symbolDFI
} from './icx_setup'
import { accountToAccount } from '@defichain/testing'

describe('ICX Complex test scenarios', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const icxSetup = new ICXSetup(container, client)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.generate(1)
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

  it('make a higher offer to an sell DFI order, then the extra amount should be returned when DFC HTLC is submitted', async () => {
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
    // make offer to higher amount 20 DFI - taker
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.20), // 0.20 BTC = 20 DFI
      ownerAddress: accountBTC
    }
    const makeOfferResult = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = makeOfferResult.txid
    await container.generate(1)

    const accountBTCAfterOffer: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // check fee of 0.02 DFI has been reduced from the accountBTCBeforeOffer[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfterOffer[idDFI]).toStrictEqual(accountBTCBeforeOffer[idDFI].minus(0.02))

    // List the ICX offers for orderTx = createOrderTxId and check
    const offersForOrder1: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(offersForOrder1).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    expect((offersForOrder1 as Record<string, ICXOfferInfo>)[makeOfferTxId]).toStrictEqual(
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

    const accountDFIBeforeDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // create DFCHTLC - maker
    const DFCHTLC: HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(15), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 1440
    }
    await client.icxorderbook.submitDFCHTLC(DFCHTLC)
    await container.generate(1)

    const accountDFIAfterDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // should reduce accountDFIBeforeDFCHTLC[idDFI] balance by 0.015 DFI
    expect(accountDFIAfterDFCHTLC[idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[idDFI].minus(0.015))

    // accountBTC balance after DFCHTLC should have credited back with extra taker fee of 0.005 DFI
    const accountBTCAfterDFCHTLC: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    expect(accountBTCAfterDFCHTLC[idDFI]).toStrictEqual(accountBTCAfterOffer[idDFI].plus(0.005))
  })

  it('should claim DFC HTLC for DFI sell order when DEX rate is changed in between', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)

    // change the DEX rate
    await accountToAccount(container, symbolBTC, 1, { from: accountBTC, to: accountDFI })
    await icxSetup.addLiquidityToBTCDFIPool(1, 150)

    const { DFCHTLCTxId } = await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)
    await icxSetup.submitExtHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(0.10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N', '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252', 24)

    const accountDFIBeforeClaim: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    const accountBTCBeforeClaim: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // claim
    const { txid: claimTxId } = await client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')
    await container.generate(1)

    // List htlc and check
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId,
      closed: true
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toStrictEqual(4) // extra entry for the warning text returned by the RPC atm.
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

    const accountDFIAfterClaim: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    const accountBTCAfterClaim: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')

    // maker should get incentive + maker deposit and taker should get amount in DFCHTLCTxId HTLC - takerfee
    expect(accountDFIAfterClaim[idDFI]).toStrictEqual(accountDFIBeforeClaim[idDFI].plus(0.010).plus(0.00250))
    expect(accountBTCAfterClaim[idDFI]).toStrictEqual(accountBTCBeforeClaim[idDFI].plus(10))
  })
})
