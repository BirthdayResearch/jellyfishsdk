import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ICXOrderInfo, ICXOrder
} from '../../../src/category/icxorderbook'
import { createToken, mintTokens, accountToAccount } from '@defichain/testing'
import { BigNumber } from '@defichain/jellyfish-api-core'

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
  expect(new BigNumber(orderInfoRetrived[createOrderTxId].amountFrom)).toStrictEqual(orderInput.amountFrom)
  expect(new BigNumber(orderInfoRetrived[createOrderTxId].amountToFill)).toStrictEqual(orderInput.amountFrom)
  expect(new BigNumber(orderInfoRetrived[createOrderTxId].orderPrice)).toStrictEqual(orderInput.orderPrice)
  expect(new BigNumber(orderInfoRetrived[createOrderTxId].amountToFillInToAsset)).toStrictEqual(orderInput.amountFrom.multipliedBy(orderInput.orderPrice))
  // NOTE(surangap): sometimes received == expected - 1 ??
  // let currentBlockHeight: number = (await container.call('getblockchaininfo', [])).blocks
  // expect(orderInfoRetrived[createOrderTxId].expireHeight).toStrictEqual(new BigNumber(currentBlockHeight + 2880))
}

export async function checkBTCSellOrderDetails (container: MasterNodeRegTestContainer, orderInput: ICXOrder, createOrderTxId: string,
  orderInfoRetrived: Record<string, ICXOrderInfo>): Promise<void> {
  const orderInfo: Record<string, ICXOrderInfo> = orderInfoRetrived
  expect(orderInfo[createOrderTxId].chainFrom).toStrictEqual(orderInput.chainFrom)
  expect(orderInfo[createOrderTxId].tokenTo).toStrictEqual(orderInput.tokenTo === idBTC ? symbolBTC : symbolDFI)
  expect(orderInfo[createOrderTxId].ownerAddress).toStrictEqual(orderInput.ownerAddress)
  expect(new BigNumber(orderInfo[createOrderTxId].amountFrom)).toStrictEqual(orderInput.amountFrom)
  expect(new BigNumber(orderInfo[createOrderTxId].amountToFill)).toStrictEqual(orderInput.amountFrom)
  expect(new BigNumber(orderInfo[createOrderTxId].orderPrice)).toStrictEqual(orderInput.orderPrice)
  expect(new BigNumber(orderInfo[createOrderTxId].amountToFillInToAsset)).toStrictEqual(orderInput.amountFrom.multipliedBy(orderInput.orderPrice))
  // NOTE(surangap): sometimes received == expected - 1 ??
  // const currentBlockHeight: number = (await container.call('getblockchaininfo', [])).blocks
  // expect(orderInfo[createOrderTxId].expireHeight).toStrictEqual(new BigNumber(currentBlockHeight + 2880))
}
