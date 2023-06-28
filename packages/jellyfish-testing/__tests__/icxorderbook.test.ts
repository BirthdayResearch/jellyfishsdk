import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'
import { icxorderbook } from '@defichain/jellyfish-api-core'

const { ICXOrderStatus, ICXOrderType, ICXHTLCType } = icxorderbook

const testing = Testing.create(new MasterNodeRegTestContainer())

describe('ICX', () => {
  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/icx': 'true'
      }
    })
    await testing.icxorderbook.createAccounts()
    await testing.rpc.account.utxosToAccount({ [testing.icxorderbook.accountDFI]: `${500}@${testing.icxorderbook.symbolDFI}` })
    await testing.rpc.account.utxosToAccount({ [testing.icxorderbook.accountBTC]: `${10}@${testing.icxorderbook.symbolDFI}` }) // for fee
    await testing.container.generate(1)
    await testing.fixture.createPoolPair({
      a: { amount: '1', symbol: testing.icxorderbook.symbolBTC },
      b: { amount: '100', symbol: testing.icxorderbook.symbolDFI }
    })
    testing.icxorderbook.DEX_DFI_PER_BTC_RATE = new BigNumber(100)
    await testing.icxorderbook.setTakerFee(new BigNumber(0.001))
    await testing.icxorderbook.initializeTokensIds()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should createDFISellOrder', async () => {
    const createOrder = {
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const { createOrderTxId } = await testing.icxorderbook.createDFISellOrder(createOrder)
    const listOrders = await testing.rpc.icxorderbook.listOrders()
    const order = listOrders[createOrderTxId]

    expect(order).toStrictEqual({
      status: ICXOrderStatus.OPEN,
      type: ICXOrderType.INTERNAL,
      tokenFrom: testing.icxorderbook.symbolDFI,
      chainTo: testing.icxorderbook.symbolBTC,
      receivePubkey: createOrder.receivePubkey,
      ownerAddress: testing.icxorderbook.accountDFI,
      amountFrom: createOrder.amountFrom,
      amountToFill: createOrder.amountFrom,
      orderPrice: createOrder.orderPrice,
      amountToFillInToAsset: createOrder.amountFrom.multipliedBy(createOrder.orderPrice),
      height: expect.any(BigNumber),
      expireHeight: expect.any(BigNumber)
    })
  })

  it('should createDFIBuyOffer', async () => {
    const createOrder = {
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const { createOrderTxId } = await testing.icxorderbook.createDFISellOrder(createOrder)

    const makeOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10)
    }
    const { makeOfferTxId } = await testing.icxorderbook.createDFIBuyOffer(makeOffer)

    const listOrders = await testing.rpc.icxorderbook.listOrders({ orderTx: createOrderTxId })
    const offer = listOrders[makeOfferTxId]

    expect(offer).toStrictEqual({
      orderTx: createOrderTxId,
      status: ICXOrderStatus.OPEN,
      amount: makeOffer.amount,
      amountInFromAsset: makeOffer.amount.dividedBy(createOrder.orderPrice),
      ownerAddress: testing.icxorderbook.accountBTC,
      takerFee: makeOffer.amount.multipliedBy(testing.icxorderbook.ICX_TAKERFEE_PER_BTC).multipliedBy(testing.icxorderbook.DEX_DFI_PER_BTC_RATE),
      expireHeight: expect.any(BigNumber)
    })
  })

  it('should createDFCHTLCForDFIBuyOffer', async () => {
    const createOrder = {
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const { createOrderTxId } = await testing.icxorderbook.createDFISellOrder(createOrder)
    const makeOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10)
    }
    const { makeOfferTxId } = await testing.icxorderbook.createDFIBuyOffer(makeOffer)

    const HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220'
    }
    const { DFCHTLCTxId } = await testing.icxorderbook.createDFCHTLCForDFIBuyOffer(HTLC)

    const listHTLCs = await testing.rpc.icxorderbook.listHTLCs({ offerTx: makeOfferTxId })
    const DFCHTLC = listHTLCs[DFCHTLCTxId]

    expect(DFCHTLC).toStrictEqual({
      status: ICXOrderStatus.OPEN,
      offerTx: makeOfferTxId,
      amount: HTLC.amount,
      amountInEXTAsset: HTLC.amount.multipliedBy(createOrder.orderPrice),
      hash: HTLC.hash,
      timeout: new BigNumber(1440),
      type: ICXHTLCType.DFC,
      refundHeight: expect.any(BigNumber),
      height: expect.any(BigNumber)
    })
  })

  it('should submitExtHTLCForDFIBuyOffer', async () => {
    const createOrder = {
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const { createOrderTxId } = await testing.icxorderbook.createDFISellOrder(createOrder)
    const makeOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10)
    }
    const { makeOfferTxId } = await testing.icxorderbook.createDFIBuyOffer(makeOffer)

    const HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220'
    }
    await testing.icxorderbook.createDFCHTLCForDFIBuyOffer(HTLC)

    const ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252'
    }
    const { ExtHTLCTxId } = await testing.icxorderbook.submitExtHTLCForDFIBuyOffer(ExtHTLC)

    const listHTLCs = await testing.rpc.icxorderbook.listHTLCs({ offerTx: makeOfferTxId })
    expect(listHTLCs[ExtHTLCTxId]).toStrictEqual({
      type: ICXHTLCType.EXTERNAL,
      status: ICXOrderStatus.OPEN,
      offerTx: makeOfferTxId,
      amount: ExtHTLC.amount,
      amountInDFCAsset: ExtHTLC.amount.dividedBy(createOrder.orderPrice),
      hash: ExtHTLC.hash,
      htlcScriptAddress: ExtHTLC.htlcScriptAddress,
      ownerPubkey: ExtHTLC.ownerPubkey,
      timeout: new BigNumber(24),
      height: expect.any(BigNumber)
    })
  })

  it('should closeAllOpenOffers', async () => {
    const createOrder = {
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const { createOrderTxId } = await testing.icxorderbook.createDFISellOrder(createOrder)

    const makeOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10)
    }
    const { makeOfferTxId } = await testing.icxorderbook.createDFIBuyOffer(makeOffer)

    const listOrdersBefore = await testing.rpc.icxorderbook.listOrders({ orderTx: createOrderTxId })
    const offerBefore = listOrdersBefore[makeOfferTxId]

    await testing.icxorderbook.closeAllOpenOffers()

    const listOrdersAfter = await testing.rpc.icxorderbook.listOrders({ orderTx: createOrderTxId })
    const offerAfter = listOrdersAfter[makeOfferTxId]

    expect(offerBefore).toBeDefined()
    expect(offerAfter).toBeUndefined()
  })

  it('should setTakerFee', async () => {
    const fee = new BigNumber(0.05)
    await testing.icxorderbook.setTakerFee(fee)

    expect(testing.icxorderbook.ICX_TAKERFEE_PER_BTC).toStrictEqual(fee)
  })
})
