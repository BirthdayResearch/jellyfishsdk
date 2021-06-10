import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ExtHTLC, HTLC, ICXClaimDFCHTLCInfo, ICXDFCHTLCInfo, ICXEXTHTLCInfo, ICXGenericResult, ICXHTLCStatus,
  ICXHTLCType, ICXListHTLCOptions, ICXOfferInfo, ICXOrderInfo, ICXOffer, ICXOrder
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { createToken, mintTokens, accountToAccount } from '@defichain/testing'

// globals
let symbolDFI: string
let symbolBTC: string
let accountDFI: string
let accountBTC: string
let poolOwner: string
let idDFI: string
let idBTC: string

async function setup (container: MasterNodeRegTestContainer): Promise<void> {
  // reset global variables
  symbolDFI = ''
  symbolBTC = ''
  accountDFI = ''
  accountBTC = ''
  poolOwner = ''
  idDFI = ''
  idBTC = ''

  // make funds mature
  await container.generate(101)
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

  const accountInfo = await container.call('getaccount', [accountDFI, {}, true])
  expect(Object.keys(accountInfo).length).toBe(2)

  // set taker fee rate (in BTC)
  await container.call('setgov', [{ ICX_TAKERFEE_PER_BTC: 0.001 }])
  await container.generate(1)
  const result: any = await container.call('getgov', ['ICX_TAKERFEE_PER_BTC'])
  expect(result.ICX_TAKERFEE_PER_BTC as number).toStrictEqual(0.001)
}

describe('ICXCreateOrder and ICXMakeOffer to partial then ICXCloseOffer then ICXCloseOrder', () => {
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

  it('ICXCreateOrder and ICXMakeOffer to partial then ICXCloseOffer then ICXCloseOrder', async () => {
    // accountDFI start balance
    const accountDFIStartBalance = await container.call('getaccount', [accountDFI, {}, true])
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
    // check details
    expect(Object.keys(orders).length).toBe(2)
    // we know that only ICXOrderInfo will be returned, so cast
    const orderInfo: Record<string, ICXOrderInfo> = orders as Record<string, ICXOrderInfo>
    expect(orderInfo[createOrderTxId].chainTo).toStrictEqual('BTC')
    expect(orderInfo[createOrderTxId].tokenFrom).toStrictEqual(symbolDFI)
    expect(orderInfo[createOrderTxId].ownerAddress).toStrictEqual(accountDFI)
    expect(orderInfo[createOrderTxId].receivePubkey).toStrictEqual('037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941')
    expect(orderInfo[createOrderTxId].amountFrom).toStrictEqual(new BigNumber(15))
    expect(orderInfo[createOrderTxId].amountToFill).toStrictEqual(new BigNumber(15))
    expect(orderInfo[createOrderTxId].orderPrice).toStrictEqual(new BigNumber(0.01))
    expect(orderInfo[createOrderTxId].amountToFillInToAsset).toStrictEqual(new BigNumber(0.1500000))
    const currentBlockHeight: number = (await container.call('getblockchaininfo', [])).blocks
    expect(orderInfo[createOrderTxId].expireHeight).toStrictEqual(new BigNumber(currentBlockHeight + 2880)) // NOTE(surangap) why BigNumber?

    // make ICXMakeOffer to partial amout 10 DFI
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.1), // 10 DFI = 0.1 BTC
      ownerAddress: accountBTC
    }
    // accountBTC before partial make offer
    const accountBTCBefore = await container.call('getaccount', [accountBTC, {}, true])

    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    // accountBTC after partial make offer
    const accountBTCAfter = await container.call('getaccount', [accountBTC, {}, true])

    // check fee of 0.01 DFI has been reduced from the accountBTCBefore[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfter[idDFI]).toStrictEqual(accountBTCBefore[idDFI] - Number('0.01000000'))

    // List the ICX orders
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.

    // close offer
    await client.icxorderbook.closeOffer(makeOfferTxId)
    await container.generate(1)

    // check accountBTC has accountBTCBefore[idDFI] amount
    const accountBTCBalance = await container.call('getaccount', [accountBTC, {}, true])
    expect(accountBTCBalance[idDFI]).toStrictEqual(accountBTCBefore[idDFI])

    // check no offes for orderTx = createOrderTxId
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check createOrderTxId order still exists
    orders = await client.icxorderbook.listOrders()
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.

    // close order createOrderTxId
    await client.icxorderbook.closeOrder(createOrderTxId)
    await container.generate(1)

    // check no more ICX orders
    orders = await client.icxorderbook.listOrders()
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check accountDFI [idDFI] balance
    const accountDFIBalance = await container.call('getaccount', [accountDFI, {}, true])
    expect(accountDFIBalance).toStrictEqual(accountDFIStartBalance)
  })
})

describe('ICXCreateOrder and ICXMakeOffer to partial then ICXCloseOffer then ICXSubmitExtHTLC then ICXClaimDFCHTLC', () => {
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

  it('ICXCreateOrder and ICXMakeOffer to partial then ICXCloseOffer then ICXSubmitExtHTLC then ICXClaimDFCHTLC', async () => {
    // accountDFI start balance
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
    // check details
    expect(Object.keys(orders).length).toBe(2)
    // we know that only ICXOrderInfo will be returned, so cast
    let orderInfo: Record<string, ICXOrderInfo> = orders as Record<string, ICXOrderInfo>
    expect(orderInfo[createOrderTxId].tokenFrom).toStrictEqual(symbolDFI)
    expect(orderInfo[createOrderTxId].chainTo).toStrictEqual('BTC')
    expect(orderInfo[createOrderTxId].ownerAddress).toStrictEqual(accountDFI)
    expect(orderInfo[createOrderTxId].receivePubkey).toStrictEqual('037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941')
    expect(orderInfo[createOrderTxId].amountFrom).toStrictEqual(new BigNumber(15))
    expect(orderInfo[createOrderTxId].amountToFill).toStrictEqual(new BigNumber(15))
    expect(orderInfo[createOrderTxId].orderPrice).toStrictEqual(new BigNumber(0.01))
    expect(orderInfo[createOrderTxId].amountToFillInToAsset).toStrictEqual(new BigNumber(0.1500000))
    let currentBlockHeight: number = (await container.call('getblockchaininfo', [])).blocks
    expect(orderInfo[createOrderTxId].expireHeight).toStrictEqual(new BigNumber(currentBlockHeight + 2880))

    // make ICXMakeOffer to partial amout 10 DFI
    const offer: ICXOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10), // 0.10 BTC = 10 DFI
      ownerAddress: accountBTC
    }
    // accountBTC before partial make offer
    const accountBTCBefore = await container.call('getaccount', [accountBTC, {}, true])

    result = await client.icxorderbook.makeOffer(offer, [])
    const makeOfferTxId = result.txid
    await container.generate(1)

    // accountBTC balance after partial make offer
    const accountBTCAfter = await container.call('getaccount', [accountBTC, {}, true])

    // check fee of 0.01 DFI has been reduced from the accountBTCBefore[idDFI]
    // Fee = takerFeePerBTC(inBTC) * amount(inBTC) * DEX DFI per BTC rate
    expect(accountBTCAfter[idDFI]).toStrictEqual(accountBTCBefore[idDFI] - 0.01)

    // List the ICX offers for orderTx = createOrderTxId and check
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    // we know that only ICXOfferInfo will be returned, so cast
    const makeOfferInfo: Record<string, ICXOfferInfo> = orders as Record<string, ICXOfferInfo>
    expect(makeOfferInfo[makeOfferTxId].orderTx).toStrictEqual(createOrderTxId)
    expect(makeOfferInfo[makeOfferTxId].amount).toStrictEqual(new BigNumber(0.1))
    expect(makeOfferInfo[makeOfferTxId].ownerAddress).toStrictEqual(accountBTC)
    expect(makeOfferInfo[makeOfferTxId].takerFee).toStrictEqual(new BigNumber(0.01))
    currentBlockHeight = (await container.call('getblockchaininfo', [])).blocks
    expect(makeOfferInfo[makeOfferTxId].expireHeight).toStrictEqual(new BigNumber(currentBlockHeight + 10))

    // accountDFI balance before DFCHTLC
    const accountDFIBeforeDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])

    // create DFCHTLC
    const DFCHTLC: HTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(10), // in  DFC
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 500
    }
    const DFCHTLCTxId = (await client.icxorderbook.submitDFCHTLC(DFCHTLC)).txid
    await container.generate(1)

    // accountDFI balance after DFCHTLC
    const accountDFIAfterDFCHTLC = await container.call('getaccount', [accountDFI, {}, true])
    expect(accountDFIAfterDFCHTLC[idDFI]).toStrictEqual(accountDFIBeforeDFCHTLC[idDFI] - 0.01)

    // List htlc
    let listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    let HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await client.icxorderbook.listHTLCs(listHTLCOptions)

    // check htlc
    expect(Object.keys(HTLCs).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    // we have a common field "type", use that to narrow down the record
    if (HTLCs[DFCHTLCTxId].type === 'DFC') {
      // ICXDFCHTLCInfo cast
      const DFCHTLCInfo: ICXDFCHTLCInfo = HTLCs[DFCHTLCTxId] as ICXDFCHTLCInfo
      expect(DFCHTLCInfo.status).toStrictEqual(ICXHTLCStatus.OPEN)
      expect(DFCHTLCInfo.offerTx).toStrictEqual(makeOfferTxId)
      expect(DFCHTLCInfo.amount).toStrictEqual(new BigNumber(10))
      expect(DFCHTLCInfo.amountInEXTAsset).toStrictEqual(new BigNumber(0.1))
      expect(DFCHTLCInfo.hash).toStrictEqual('957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220')
      expect(DFCHTLCInfo.timeout).toStrictEqual(new BigNumber(500))
    }

    // submit EXT HTLC
    const extHTLC: ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 15
    }
    const ExtHTLCTxId = (await client.icxorderbook.submitExtHTLC(extHTLC)).txid
    await container.generate(1)

    // List htlc
    listHTLCOptions = {
      offerTx: makeOfferTxId
    }
    HTLCs = await client.icxorderbook.listHTLCs(listHTLCOptions)

    // check  EXT htlc
    expect(Object.keys(HTLCs).length).toBe(3) // extra entry for the warning text returned by the RPC atm.
    // we have a common field "type", use that to narrow down the record
    if (HTLCs[ExtHTLCTxId].type === 'EXTERNAL') {
      // ICXEXTHTLCInfo cast
      const EXTHTLCInfo: ICXEXTHTLCInfo = HTLCs[ExtHTLCTxId] as ICXEXTHTLCInfo
      expect(EXTHTLCInfo.status).toStrictEqual(ICXHTLCStatus.OPEN)
      expect(EXTHTLCInfo.offerTx).toStrictEqual(makeOfferTxId)
      expect(EXTHTLCInfo.amount).toStrictEqual(new BigNumber(0.1))
      expect(EXTHTLCInfo.amountInDFCAsset).toStrictEqual(new BigNumber(10))
      expect(EXTHTLCInfo.hash).toStrictEqual('957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220')
      expect(EXTHTLCInfo.htlcScriptAddress).toStrictEqual('13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N')
      expect(EXTHTLCInfo.ownerPubkey).toStrictEqual('036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252')
      expect(EXTHTLCInfo.timeout).toStrictEqual(new BigNumber(15))
    }

    // accountBTC balance after EXTHTLC
    const accountBTCAfterEXTHTLC = await container.call('getaccount', [accountBTC, {}, true])
    // should have the same balance as accountBTCAfter
    expect(accountBTCAfterEXTHTLC).toStrictEqual(accountBTCAfter)

    const accountDFIBeforeClaim = await container.call('getaccount', [accountDFI, {}, true])
    const accountBTCBeforeClaim = await container.call('getaccount', [accountBTC, {}, true])

    // claim
    const claimTxId = (await client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')).txid
    await container.generate(1)

    // List htlc
    listHTLCOptions = {
      offerTx: makeOfferTxId,
      closed: true
    }
    HTLCs = await client.icxorderbook.listHTLCs(listHTLCOptions)

    // check  EXT htlc
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

    // maker should get incentive and taker should get amount in DFCHTLCTxId HTLC //NOTE(surangap): check incentive amount
    expect(accountDFIAfterClaim[idDFI]).toStrictEqual(Number(accountDFIBeforeClaim[idDFI]) + Number('0.0125'))
    expect(accountBTCAfterClaim[idDFI]).toStrictEqual(Number(accountBTCBeforeClaim[idDFI]) + Number('10'))

    // offer should be close by now
    orders = await client.icxorderbook.listOrders({ orderTx: createOrderTxId })
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check partial order remaining
    orders = await client.icxorderbook.listOrders()
    // check details
    expect(Object.keys(orders).length).toBe(2)
    // we know that only ICXOrderInfo will be returned, so cast
    orderInfo = orders as Record<string, ICXOrderInfo>
    expect(orderInfo[createOrderTxId].tokenFrom).toStrictEqual(symbolDFI)
    expect(orderInfo[createOrderTxId].chainTo).toStrictEqual('BTC')
    expect(orderInfo[createOrderTxId].ownerAddress).toStrictEqual(accountDFI)
    expect(orderInfo[createOrderTxId].receivePubkey).toStrictEqual('037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941')
    expect(orderInfo[createOrderTxId].amountFrom).toStrictEqual(new BigNumber(15))
    expect(orderInfo[createOrderTxId].amountToFill).toStrictEqual(new BigNumber(5))
    expect(orderInfo[createOrderTxId].orderPrice).toStrictEqual(new BigNumber(0.01))
    expect(orderInfo[createOrderTxId].amountToFillInToAsset).toStrictEqual(new BigNumber(0.0500000))
  })
})
