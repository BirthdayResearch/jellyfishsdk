import { Testing } from './index'
import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { icxorderbook } from '@defichain/jellyfish-api-core'
import { accountToAccount } from '@defichain/testing'

const {
  ICXOrderStatus,
  ICXOrderType,
  ICXHTLCType
} = icxorderbook

export class TestingICX {
  public symbolDFI: string
  public symbolBTC: string
  public accountDFI: string
  public accountBTC: string
  public poolOwner: string
  public idDFI: string
  public idBTC: string
  public ICX_TAKERFEE_PER_BTC: number
  public DEX_DFI_PER_BTC_RATE: number

  constructor (
    private readonly testing: Testing,
    private readonly container: MasterNodeRegTestContainer,
    private readonly rpc: JsonRpcClient
  ) {
    this.accountDFI = ''
    this.accountBTC = ''
    this.poolOwner = ''
    this.idDFI = ''
    this.idBTC = ''
    this.ICX_TAKERFEE_PER_BTC = 0
    this.DEX_DFI_PER_BTC_RATE = 0
    this.symbolDFI = 'DFI'
    this.symbolBTC = 'BTC'
  }

  async setup (): Promise<void> {
    await this.createAccounts()
    await this.createBTCToken()
    await this.initializeTokensIds()
    await this.mintBTCtoken(100)
    await this.fundAccount(this.accountDFI, this.symbolDFI, 500)
    await this.fundAccount(this.accountBTC, this.symbolDFI, 10) // for fee
    await this.createBTCDFIPool()
    await this.addLiquidityToBTCDFIPool(1, 100)
    await this.setTakerFee(0.001)
  }

  async createAccounts (): Promise<void> {
    this.accountDFI = await this.container.call('getnewaddress')
    this.accountBTC = await this.container.call('getnewaddress')
  }

  async createBTCToken (): Promise<void> {
    await this.testing.token.create({
      symbol: this.symbolBTC,
      name: this.symbolBTC,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: this.accountBTC
    })
    await this.container.generate(1)
  }

  async initializeTokensIds (): Promise<void> {
    let tokenInfo = await this.container.call('gettoken', [this.symbolBTC])
    this.idBTC = Object.keys(tokenInfo)[0]
    tokenInfo = await this.container.call('gettoken', [this.symbolDFI])
    this.idDFI = Object.keys(tokenInfo)[0]
  }

  async mintBTCtoken (amount: number): Promise<void> {
    await this.testing.token.mint({ amount, symbol: this.symbolBTC })
  }

  async fundAccount (account: string, token: string, amount: number): Promise<void> {
    const payload: { [key: string]: string } = {}
    payload[account] = `${amount}@${token}`
    await this.container.call('utxostoaccount', [payload])
    await this.container.generate(1)
  }

  async createBTCDFIPool (): Promise<void> {
    this.poolOwner = await this.container.call('getnewaddress', ['', 'legacy'])
    await accountToAccount(this.container, this.symbolBTC, 1, { from: this.accountBTC, to: this.accountDFI })

    const poolPairMetadata = {
      tokenA: this.idBTC,
      tokenB: this.idDFI,
      commission: 1,
      status: true,
      ownerAddress: this.poolOwner,
      pairSymbol: 'BTC-DFI'
    }
    await this.container.call('createpoolpair', [poolPairMetadata, []])
    await this.container.generate(1)

    const pool = await this.container.call('getpoolpair', ['BTC-DFI'])
    const combToken = await this.container.call('gettoken', ['BTC-DFI'])
    const idDFIBTC = Object.keys(combToken)[0]
    expect(pool[idDFIBTC].idTokenA).toBe(this.idBTC)
    expect(pool[idDFIBTC].idTokenB).toBe(this.idDFI)
  }

  async addLiquidityToBTCDFIPool (amountInBTC: number, amountInDFI: number): Promise<void> {
    const poolLiquidityMetadata: { [key: string]: string [] } = {}
    poolLiquidityMetadata[this.accountDFI] = [`${amountInBTC}@${this.symbolBTC}`, `${amountInDFI}@${this.symbolDFI}`]

    await this.container.call('addpoolliquidity', [poolLiquidityMetadata, this.accountDFI, []])
    await this.container.generate(1)
    this.DEX_DFI_PER_BTC_RATE = amountInDFI / amountInBTC
  }

  async setTakerFee (fee: number): Promise<void> {
    await this.container.call('setgov', [{ ICX_TAKERFEE_PER_BTC: fee }])
    await this.container.generate(1)
    const result: any = await this.container.call('getgov', ['ICX_TAKERFEE_PER_BTC'])
    expect(result.ICX_TAKERFEE_PER_BTC as number).toStrictEqual(fee)
    this.ICX_TAKERFEE_PER_BTC = result.ICX_TAKERFEE_PER_BTC as number
  }

  async closeAllOpenOffers (): Promise<void> {
    const orders = await this.container.call('icx_listorders', [])
    for (const orderTx of Object.keys(orders).splice(1)) {
      const offers = await this.container.call('icx_listorders', [{ orderTx: orderTx }])
      for (const offerTx of Object.keys(offers).splice(1)) {
        if (offers[offerTx].status === ICXOrderStatus.OPEN) {
          await this.container.call('icx_closeoffer', [offerTx])
        }
      }
    }
    await this.container.generate(1)
  }

  // creates DFI sell order
  async createDFISellOrder ({
    chainTo = 'BTC',
    ownerAddress = this.accountDFI,
    receivePubkey,
    amountFrom,
    orderPrice
  }: CreateDFISellOrderData): Promise<{order: icxorderbook.ICXOrder, createOrderTxId: string}> {
    // create order - maker
    const order = {
      tokenFrom: this.idDFI,
      chainTo,
      ownerAddress,
      receivePubkey,
      amountFrom,
      orderPrice
    }

    const { txid: createOrderTxId } = await this.rpc.icxorderbook.createOrder(order)
    await this.container.generate(1)

    const ordersAfterCreateOrder = await this.rpc.icxorderbook.listOrders()
    expect(ordersAfterCreateOrder[createOrderTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    return {
      order,
      createOrderTxId
    }
  }

  // creates DFI buy offer
  async createDFIBuyOffer ({
    orderTx,
    amount,
    ownerAddress = this.accountBTC
  }: CreateDFIBuyOfferData): Promise<{offer: icxorderbook.ICXOffer, makeOfferTxId: string}> {
    const accountBTCBeforeOffer: Record<string, BigNumber> = await this.rpc.call('getaccount', [this.accountBTC, {}, true], 'bignumber')
    // make Offer to partial amount 10 DFI - taker
    const offer = {
      orderTx,
      amount, // 0.10 BTC = 10 DFI
      ownerAddress
    }

    const { txid: makeOfferTxId } = await this.rpc.icxorderbook.makeOffer(offer, [])
    await this.container.generate(1)

    const accountBTCAfterOffer: Record<string, BigNumber> = await this.rpc.call('getaccount', [this.accountBTC, {}, true], 'bignumber')
    // check fee of 0.01 DFI has been reduced from the accountBTCBeforeOffer[this.idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfterOffer[this.idDFI]).toStrictEqual(accountBTCBeforeOffer[this.idDFI].minus(0.01))

    // List the ICX offers for orderTx = createOrderTxId and check
    const offersForOrder = await this.rpc.icxorderbook.listOrders({ orderTx })
    expect(Object.keys(offersForOrder).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    expect(offersForOrder[makeOfferTxId].status).toStrictEqual(ICXOrderStatus.OPEN)

    return {
      offer,
      makeOfferTxId
    }
  }

  // create and submits DFC HTLC for DFI buy offer
  async createDFCHTLCForDFIBuyOffer ({
    offerTx,
    amount,
    hash,
    timeout = 1440
  }: CreateDFCHTLCForDFIBuyOfferData): Promise<{DFCHTLC: icxorderbook.HTLC, DFCHTLCTxId: string}> {
    const accountDFIBeforeDFCHTLC: Record<string, BigNumber> = await this.rpc.call('getaccount', [this.accountDFI, {}, true], 'bignumber')
    // create DFCHTLC - maker
    const DFCHTLC = {
      offerTx,
      amount, // in  DFC
      hash,
      timeout
    }
    const { txid: DFCHTLCTxId } = await this.rpc.icxorderbook.submitDFCHTLC(DFCHTLC)
    await this.container.generate(1)

    const accountDFIAfterDFCHTLC: Record<string, BigNumber> = await this.rpc.call('getaccount', [this.accountDFI, {}, true], 'bignumber')
    // maker fee should be reduced from accountDFIBeforeDFCHTLC
    expect(accountDFIAfterDFCHTLC[this.idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[this.idDFI].minus(0.01))

    const HTLCs = await this.rpc.icxorderbook.listHTLCs({ offerTx })
    expect(Object.keys(HTLCs).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    expect((HTLCs[DFCHTLCTxId] as icxorderbook.ICXDFCHTLCInfo).type).toStrictEqual(ICXHTLCType.DFC)
    expect((HTLCs[DFCHTLCTxId] as icxorderbook.ICXDFCHTLCInfo).status).toStrictEqual(ICXOrderStatus.OPEN)

    return {
      DFCHTLC,
      DFCHTLCTxId
    }
  }

  // submits ExtHTLC for DFI buy offer
  async submitExtHTLCForDFIBuyOffer ({
    offerTx,
    amount,
    hash,
    htlcScriptAddress,
    ownerPubkey,
    timeout = 24
  }: submitExtHTLCForDFIBuyOfferData): Promise<{ExtHTLC: icxorderbook.ExtHTLC, ExtHTLCTxId: string}> {
    const accountBTCBeforeEXTHTLC = await this.rpc.call('getaccount', [this.accountBTC, {}, true], 'bignumber')
    // submit EXT HTLC - taker
    const ExtHTLC = {
      offerTx,
      amount,
      hash,
      htlcScriptAddress,
      ownerPubkey,
      timeout
    }
    const { txid: ExtHTLCTxId } = await this.rpc.icxorderbook.submitExtHTLC(ExtHTLC)
    await this.container.generate(1)

    const HTLCs = await this.rpc.icxorderbook.listHTLCs({ offerTx })
    expect(Object.keys(HTLCs).length).toBe(3) // extra entry for the warning text returned by the RPC atm.
    expect((HTLCs[ExtHTLCTxId] as icxorderbook.ICXEXTHTLCInfo).type).toStrictEqual(ICXOrderType.EXTERNAL)
    expect((HTLCs[ExtHTLCTxId] as icxorderbook.ICXEXTHTLCInfo).status).toStrictEqual(ICXOrderStatus.OPEN)

    const accountBTCAfterEXTHTLC = await this.rpc.call('getaccount', [this.accountBTC, {}, true], 'bignumber')
    // should have the same balance as accountBTCBeforeEXTHTLC
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCBeforeEXTHTLC)

    return {
      ExtHTLC,
      ExtHTLCTxId
    }
  }
}

interface CreateDFISellOrderData {
  chainTo?: string
  ownerAddress?: string
  receivePubkey: string
  amountFrom: BigNumber
  orderPrice: BigNumber
}

interface CreateDFIBuyOfferData {
  orderTx: string
  amount: BigNumber
  ownerAddress?: string
}

interface CreateDFIBuyOfferData {
  orderTx: string
  amount: BigNumber
  ownerAddress?: string
}

interface CreateDFCHTLCForDFIBuyOfferData {
  offerTx: string
  amount: BigNumber
  hash: string
  timeout?: number
}

interface submitExtHTLCForDFIBuyOfferData {
  offerTx: string
  amount: BigNumber
  hash: string
  htlcScriptAddress: string
  ownerPubkey: string
  timeout?: number
}

export {
  ICXOrderStatus,
  ICXOrderType,
  ICXHTLCType
}
