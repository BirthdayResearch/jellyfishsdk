import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ExtHTLC, HTLC, ICXClaimDFCHTLCInfo, ICXDFCHTLCInfo, ICXEXTHTLCInfo, ICXHTLCStatus,
  ICXHTLCType, ICXOfferInfo, ICXOrderInfo, ICXOffer, ICXOrder
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { createToken, mintTokens, accountToAccount } from '@defichain/testing'

// globals
export let symbolDFI: string
export let symbolBTC: string
export let accountDFI: string
export let accountBTC: string
export let poolOwner: string
export let idDFI: string
export let idBTC: string
export let ICX_TAKERFEE_PER_BTC: number
export let DEX_DFI_PER_BTC_RATE: number

export async function setup (container: MasterNodeRegTestContainer): Promise<void> {
  // reset global variables
  symbolDFI = ''
  symbolBTC = ''
  accountDFI = ''
  accountBTC = ''
  poolOwner = ''
  idDFI = ''
  idBTC = ''
  ICX_TAKERFEE_PER_BTC = 0
  DEX_DFI_PER_BTC_RATE = 0

  symbolDFI = 'DFI'
  symbolBTC = 'BTC'
  accountDFI = await container.call('getnewaddress')
  accountBTC = await container.call('getnewaddress')

  // create BTC tocken
  const createTokenOptions = {
    name: symbolBTC,
    isDAT: true,
    mintable: true,
    tradeable: true,
    collateralAddress: accountBTC
  }
  await createToken(container, symbolBTC, createTokenOptions)

  // mint 100 BTC
  const mintTokensOptions = {
    address: accountBTC,
    mintAmount: 100
  }
  await mintTokens(container, symbolBTC, mintTokensOptions)

  // check tokens
  let tokenInfo = await container.call('gettoken', [symbolBTC])
  idBTC = Object.keys(tokenInfo)[0]
  tokenInfo = await container.call('gettoken', [symbolDFI])
  idDFI = Object.keys(tokenInfo)[0]

  // send funds to accounts
  const payload: { [key: string]: string } = {}
  payload[accountDFI] = '500@' + symbolDFI
  payload[accountBTC] = '10@' + symbolDFI // for fee
  await container.call('utxostoaccount', [payload])

  // create pool
  poolOwner = await container.call('getnewaddress', ['', 'legacy'])
  await accountToAccount(container, symbolBTC, 1, { from: accountBTC, to: accountDFI })

  const poolPairMetadata = {
    tokenA: idBTC,
    tokenB: idDFI,
    commission: 1,
    status: true,
    ownerAddress: poolOwner,
    pairSymbol: 'BTC-DFI'
  }
  await container.call('createpoolpair', [poolPairMetadata, []])
  await container.generate(1)

  // check
  const pool = await container.call('getpoolpair', ['BTC-DFI'])
  const combToken = await container.call('gettoken', ['BTC-DFI'])
  const idDFIBTC = Object.keys(combToken)[0]
  expect(pool[idDFIBTC].idTokenA).toBe(idBTC)
  expect(pool[idDFIBTC].idTokenB).toBe(idDFI)

  // add pool liquidity
  const poolLiquidityMetadata: { [key: string]: string [] } = {}
  poolLiquidityMetadata[accountDFI] = ['1@' + symbolBTC, '100@' + symbolDFI]

  await container.call('addpoolliquidity', [poolLiquidityMetadata, accountDFI, []])
  await container.generate(1)
  DEX_DFI_PER_BTC_RATE = 100

  const accountInfo = await container.call('getaccount', [accountDFI, {}, true])
  expect(Object.keys(accountInfo).length).toBe(2)

  // set taker fee rate (in BTC)
  await container.call('setgov', [{ ICX_TAKERFEE_PER_BTC: 0.001 }])
  await container.generate(1)
  const result: any = await container.call('getgov', ['ICX_TAKERFEE_PER_BTC'])
  expect(result.ICX_TAKERFEE_PER_BTC as number).toStrictEqual(0.001)
  ICX_TAKERFEE_PER_BTC = result.ICX_TAKERFEE_PER_BTC as number
}

export async function checkDFISellOrderDetails (container: MasterNodeRegTestContainer, orderInput: ICXOrder, createOrderTxId: string,
  orderInfoRetrived: Record<string, ICXOrderInfo>): Promise<void> {
  expect(orderInfoRetrived[createOrderTxId].chainTo).toStrictEqual(orderInput.chainTo)
  expect(orderInfoRetrived[createOrderTxId].tokenFrom).toStrictEqual(orderInput.tokenFrom === idDFI ? symbolDFI : symbolBTC)
  expect(orderInfoRetrived[createOrderTxId].ownerAddress).toStrictEqual(orderInput.ownerAddress)
  expect(orderInfoRetrived[createOrderTxId].receivePubkey).toStrictEqual(orderInput.receivePubkey)
  expect(orderInfoRetrived[createOrderTxId].amountFrom).toStrictEqual(orderInput.amountFrom)
  expect(orderInfoRetrived[createOrderTxId].amountToFill).toStrictEqual(orderInput.amountFrom)
  expect(orderInfoRetrived[createOrderTxId].orderPrice).toStrictEqual(orderInput.orderPrice)
  expect(orderInfoRetrived[createOrderTxId].amountToFillInToAsset).toStrictEqual(orderInput.amountFrom.multipliedBy(orderInput.orderPrice))
  // let currentBlockHeight: number = (await container.call('getblockchaininfo', [])).blocks
  // expect(orderInfoRetrived[createOrderTxId].expireHeight).toStrictEqual(new BigNumber(currentBlockHeight + 2880)) // NOTE(surangap) why BigNumber?
}

export async function checkBTCSellOrderDetails (container: MasterNodeRegTestContainer, orderInput: ICXOrder, createOrderTxId: string,
  orderInfoRetrived: Record<string, ICXOrderInfo>): Promise<void> {
  const orderInfo: Record<string, ICXOrderInfo> = orderInfoRetrived
  expect(orderInfo[createOrderTxId].chainFrom).toStrictEqual(orderInput.chainFrom)
  expect(orderInfo[createOrderTxId].tokenTo).toStrictEqual(orderInput.tokenTo === idBTC ? symbolBTC : symbolDFI)
  expect(orderInfo[createOrderTxId].ownerAddress).toStrictEqual(orderInput.ownerAddress)
  expect(orderInfo[createOrderTxId].amountFrom).toStrictEqual(orderInput.amountFrom)
  expect(orderInfo[createOrderTxId].amountToFill).toStrictEqual(orderInput.amountFrom)
  expect(orderInfo[createOrderTxId].orderPrice).toStrictEqual(orderInput.orderPrice)
  expect(orderInfo[createOrderTxId].amountToFillInToAsset).toStrictEqual(orderInput.amountFrom.multipliedBy(orderInput.orderPrice))
  // const currentBlockHeight: number = (await container.call('getblockchaininfo', [])).blocks
  // expect(orderInfo[createOrderTxId].expireHeight).toStrictEqual(new BigNumber(currentBlockHeight + 2880)) // NOTE(surangap) why BigNumber?
}

export async function checkDFIBuyOfferDetails (container: MasterNodeRegTestContainer, offerInput: ICXOffer, makeOfferTxId: string,
  offerInfoRetrived: Record<string, ICXOfferInfo>): Promise<void> {
  expect(offerInfoRetrived[makeOfferTxId].orderTx).toStrictEqual(offerInput.orderTx)
  expect(offerInfoRetrived[makeOfferTxId].amount).toStrictEqual(offerInput.amount)
  expect(offerInfoRetrived[makeOfferTxId].ownerAddress).toStrictEqual(offerInput.ownerAddress)
  // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
  const takerFee = offerInput.amount.multipliedBy(ICX_TAKERFEE_PER_BTC).multipliedBy(DEX_DFI_PER_BTC_RATE)
  expect(offerInfoRetrived[makeOfferTxId].takerFee).toStrictEqual(takerFee)
  // let currentBlockHeight = (await container.call('getblockchaininfo', [])).blocks
  // expect(offerInfoRetrived[makeOfferTxId].expireHeight).toStrictEqual(new BigNumber(currentBlockHeight + 10))
}

export async function checkBTCBuyOfferDetails (container: MasterNodeRegTestContainer, offerInput: ICXOffer, makeOfferTxId: string,
  offerInfoRetrived: Record<string, ICXOfferInfo>): Promise<void> {
  expect(offerInfoRetrived[makeOfferTxId].orderTx).toStrictEqual(offerInput.orderTx)
  expect(offerInfoRetrived[makeOfferTxId].amount).toStrictEqual(offerInput.amount)
  expect(offerInfoRetrived[makeOfferTxId].ownerAddress).toStrictEqual(offerInput.ownerAddress)
  // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
  const takerFee = offerInput.amount.multipliedBy(ICX_TAKERFEE_PER_BTC)
  expect(offerInfoRetrived[makeOfferTxId].takerFee).toStrictEqual(takerFee)
// let currentBlockHeight = (await container.call('getblockchaininfo', [])).blocks
// expect(offerInfoRetrived[makeOfferTxId].expireHeight).toStrictEqual(new BigNumber(currentBlockHeight + 10))
}

export async function closeAllOrders (container: MasterNodeRegTestContainer): Promise<void> {
  const orders = (await container.call('icx_listorders', [])) as Record<string, ICXOrderInfo>
  for (const orderTx of Object.keys(orders).splice(1)) {
    await container.call('icx_closeorder', [orderTx])
  }
  await container.generate(1)
}

export async function checkDFCHTLCDetails (HTLCInput: HTLC, DFCHTLCTxId: string,
  HTLCsRetrived: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo>): Promise<void> {
  // we have a common field "type", use that to narrow down the record
  expect(HTLCsRetrived[DFCHTLCTxId].type).toStrictEqual(ICXHTLCType.DFC)
  // ICXDFCHTLCInfo cast
  const DFCHTLCInfo: ICXDFCHTLCInfo = HTLCsRetrived[DFCHTLCTxId] as ICXDFCHTLCInfo
  expect(DFCHTLCInfo.status).toStrictEqual(ICXHTLCStatus.OPEN)
  expect(DFCHTLCInfo.offerTx).toStrictEqual(HTLCInput.offerTx)
  expect(DFCHTLCInfo.amount).toStrictEqual(HTLCInput.amount)
  expect(DFCHTLCInfo.amountInEXTAsset).toStrictEqual(HTLCInput.amount.dividedBy(DEX_DFI_PER_BTC_RATE))
  expect(DFCHTLCInfo.hash).toStrictEqual(HTLCInput.hash)
  if (HTLCInput.timeout !== undefined) { expect(DFCHTLCInfo.timeout).toStrictEqual(new BigNumber(HTLCInput.timeout)) }
}

export async function checkEXTHTLCDetails (HTLCInput: ExtHTLC, ExtHTLCTxId: string,
  HTLCsRetrived: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo>): Promise<void> {
  // we have a common field "type", use that to narrow down the record
  expect(HTLCsRetrived[ExtHTLCTxId].type).toStrictEqual(ICXHTLCType.EXTERNAL)
  // ICXEXTHTLCInfo cast
  const EXTHTLCInfo: ICXEXTHTLCInfo = HTLCsRetrived[ExtHTLCTxId] as ICXEXTHTLCInfo
  expect(EXTHTLCInfo.status).toStrictEqual(ICXHTLCStatus.OPEN)
  expect(EXTHTLCInfo.offerTx).toStrictEqual(HTLCInput.offerTx)
  expect(EXTHTLCInfo.amount).toStrictEqual(HTLCInput.amount)
  expect(EXTHTLCInfo.amountInDFCAsset).toStrictEqual(HTLCInput.amount.multipliedBy(DEX_DFI_PER_BTC_RATE))
  expect(EXTHTLCInfo.hash).toStrictEqual(HTLCInput.hash)
  expect(EXTHTLCInfo.htlcScriptAddress).toStrictEqual(HTLCInput.htlcScriptAddress)
  expect(EXTHTLCInfo.ownerPubkey).toStrictEqual(HTLCInput.ownerPubkey)
  expect(EXTHTLCInfo.timeout).toStrictEqual(new BigNumber(HTLCInput.timeout))
}

// add empty test just to get over this file failing
describe('Empty test', () => {
  it('Empty test', () => {})
})
