import { Testing } from './index'
import BigNumber from 'bignumber.js'
import { icxorderbook } from '@defichain/jellyfish-api-core'
import { accountToAccount } from '@defichain/testing'

export class TestingICX {
  public symbolDFI: string
  public symbolBTC: string
  public accountDFI: string
  public accountBTC: string
  public poolOwner: string
  public idDFI: string
  public idBTC: string
  public ICX_TAKERFEE_PER_BTC: BigNumber
  public DEX_DFI_PER_BTC_RATE: BigNumber

  constructor (
    private readonly testing: Testing
  ) {
    this.accountDFI = ''
    this.accountBTC = ''
    this.poolOwner = ''
    this.idDFI = ''
    this.idBTC = ''
    this.ICX_TAKERFEE_PER_BTC = new BigNumber(0)
    this.DEX_DFI_PER_BTC_RATE = new BigNumber(0)
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
    await this.setTakerFee(new BigNumber(0.001))
  }

  async createAccounts (): Promise<void> {
    this.accountDFI = await this.testing.container.getNewAddress()
    this.accountBTC = await this.testing.container.getNewAddress()
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
    await this.testing.container.generate(1)
  }

  async initializeTokensIds (): Promise<void> {
    let tokenInfo = await this.testing.container.call('gettoken', [this.symbolBTC])
    this.idBTC = Object.keys(tokenInfo)[0]
    tokenInfo = await this.testing.container.call('gettoken', [this.symbolDFI])
    this.idDFI = Object.keys(tokenInfo)[0]
  }

  async mintBTCtoken (amount: number): Promise<void> {
    await this.testing.token.mint({ amount, symbol: this.symbolBTC })
  }

  async fundAccount (account: string, token: string, amount: number): Promise<void> {
    const payload: { [key: string]: string } = {}
    payload[account] = `${amount}@${token}`
    await this.testing.container.call('utxostoaccount', [payload])
    await this.testing.container.generate(1)
  }

  async createBTCDFIPool (): Promise<void> {
    this.poolOwner = await this.testing.container.call('getnewaddress', ['', 'legacy'])
    const poolPairMetadata = {
      tokenA: this.idBTC,
      tokenB: this.idDFI,
      commission: 1,
      status: true,
      ownerAddress: this.poolOwner,
      pairSymbol: 'BTC-DFI'
    }
    await this.testing.container.call('createpoolpair', [poolPairMetadata, []])
    await this.testing.container.generate(1)
  }

  async addLiquidityToBTCDFIPool (amountInBTC: number, amountInDFI: number): Promise<void> {
    await accountToAccount(this.testing.container, this.symbolBTC, 1, { from: this.accountBTC, to: this.accountDFI })
    await this.testing.poolpair.add({
      a: { amount: amountInBTC, symbol: this.symbolBTC },
      b: { amount: amountInDFI, symbol: this.symbolDFI }
    })
    await this.testing.container.generate(1)
    this.DEX_DFI_PER_BTC_RATE = new BigNumber(amountInDFI / amountInBTC)
  }

  async setTakerFee (fee: BigNumber): Promise<void> {
    await this.testing.rpc.masternode.setGov({ ICX_TAKERFEE_PER_BTC: fee })
    await this.testing.container.generate(1)
    const result = await this.testing.rpc.masternode.getGov('ICX_TAKERFEE_PER_BTC')
    this.ICX_TAKERFEE_PER_BTC = result.ICX_TAKERFEE_PER_BTC as BigNumber
  }

  async closeAllOpenOffers (): Promise<void> {
    const orders = await this.testing.container.call('icx_listorders', [])
    for (const orderTx of Object.keys(orders).splice(1)) {
      const offers = await this.testing.container.call('icx_listorders', [{ orderTx: orderTx }])
      for (const offerTx of Object.keys(offers).splice(1)) {
        if (offers[offerTx].status === icxorderbook.ICXOrderStatus.OPEN) {
          await this.testing.container.call('icx_closeoffer', [offerTx])
        }
      }
    }
    await this.testing.container.generate(1)
  }

  async createDFISellOrder ({
    chainTo = 'BTC',
    ownerAddress = this.accountDFI,
    receivePubkey,
    amountFrom,
    orderPrice
  }: CreateDFISellOrderData): Promise<{order: icxorderbook.ICXOrder, createOrderTxId: string}> {
    const order = {
      tokenFrom: this.idDFI,
      chainTo,
      ownerAddress,
      receivePubkey,
      amountFrom,
      orderPrice
    }

    const { txid: createOrderTxId } = await this.testing.rpc.icxorderbook.createOrder(order)
    await this.testing.container.generate(1)

    return {
      order,
      createOrderTxId
    }
  }

  async createDFIBuyOffer ({
    orderTx,
    amount = new BigNumber(10),
    ownerAddress = this.accountBTC
  }: CreateDFIBuyOfferData): Promise<{offer: icxorderbook.ICXOffer, makeOfferTxId: string}> {
    const offer = {
      orderTx,
      amount,
      ownerAddress
    }

    const { txid: makeOfferTxId } = await this.testing.rpc.icxorderbook.makeOffer(offer, [])
    await this.testing.container.generate(1)

    return {
      offer,
      makeOfferTxId
    }
  }

  async createDFCHTLCForDFIBuyOffer ({
    offerTx,
    amount,
    hash,
    timeout = 1440
  }: CreateDFCHTLCForDFIBuyOfferData): Promise<{DFCHTLC: icxorderbook.HTLC, DFCHTLCTxId: string}> {
    const DFCHTLC = {
      offerTx,
      amount,
      hash,
      timeout
    }
    const { txid: DFCHTLCTxId } = await this.testing.rpc.icxorderbook.submitDFCHTLC(DFCHTLC)
    await this.testing.container.generate(1)

    return {
      DFCHTLC,
      DFCHTLCTxId
    }
  }

  async submitExtHTLCForDFIBuyOffer ({
    offerTx,
    amount,
    hash,
    htlcScriptAddress,
    ownerPubkey,
    timeout = 24
  }: submitExtHTLCForDFIBuyOfferData): Promise<{ExtHTLC: icxorderbook.ExtHTLC, ExtHTLCTxId: string}> {
    const ExtHTLC = {
      offerTx,
      amount,
      hash,
      htlcScriptAddress,
      ownerPubkey,
      timeout
    }
    const { txid: ExtHTLCTxId } = await this.testing.rpc.icxorderbook.submitExtHTLC(ExtHTLC)
    await this.testing.container.generate(1)

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
  amount?: BigNumber
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
