import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ICXGenericResult, ICXOfferInfo, ICXOrderInfo, ICXOrder, ICXOrderStatus, ICXOrderType
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { accountBTC, accountDFI, ICXSetup, idDFI, symbolDFI } from './icx_setup'
import { RpcApiError } from '../../../src'

describe('ICXOrderBook.createOrder', () => {
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

  it('should createOrder to sell 15 DFI from chain:DFI to chain:BTC', async () => {
    const accountDFIBeforeOrder: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // create order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const result: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = result.txid
    await container.generate(1)

    // list ICX orders
    const orders: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
    // we know that only ICXOrderInfo will be returned, so cast and pass to check order details
    expect((orders as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.INTERNAL,
        tokenFrom: symbolDFI,
        chainTo: order.chainTo,
        receivePubkey: order.receivePubkey,
        ownerAddress: order.ownerAddress,
        amountFrom: order.amountFrom,
        amountToFill: order.amountFrom,
        orderPrice: order.orderPrice,
        amountToFillInToAsset: order.amountFrom.multipliedBy(order.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber)
      }
    )

    // check accountDFI[idDFI] balance, reduced by 15 DFI
    const accountDFIAfterOrder: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    expect(accountDFIAfterOrder[idDFI]).toStrictEqual(accountDFIBeforeOrder[idDFI].minus(15))
  })

  it('should createOrder to sell 2 BTC from chain:BTC to chain:DFI', async () => {
    const accountDFIBeforeOrder: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // create order - maker
    const order: ICXOrder = {
      chainFrom: 'BTC',
      tokenTo: idDFI,
      ownerAddress: accountDFI,
      amountFrom: new BigNumber(2),
      orderPrice: new BigNumber(1000)
    }
    const result: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = result.txid
    await container.generate(1)

    // list ICX orders
    const orders: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
    expect((orders as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.EXTERNAL,
        tokenTo: symbolDFI,
        chainFrom: order.chainFrom,
        ownerAddress: order.ownerAddress,
        amountFrom: order.amountFrom,
        amountToFill: order.amountFrom,
        orderPrice: order.orderPrice,
        amountToFillInToAsset: order.amountFrom.multipliedBy(order.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber)
      }
    )
    // check accountDFI[idDFI] balance, should be the same
    const accountDFIAfterOrder: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    expect(accountDFIAfterOrder).toStrictEqual(accountDFIBeforeOrder)
  })

  it('should createOrder to sell 15 DFI from chain:DFI to chain:BTC with input utxos', async () => {
    const accountDFIBeforeOrder: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    // create order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }

    // input utxos
    const inputUTXOs = await container.fundAddress(accountDFI, 10)

    const result: ICXGenericResult = await client.icxorderbook.createOrder(order, [inputUTXOs])
    const createOrderTxId = result.txid
    await container.generate(1)

    // list ICX orders
    const orders: Record<string, ICXOrderInfo | ICXOfferInfo> = await client.call('icx_listorders', [], 'bignumber')
    // we know that only ICXOrderInfo will be returned, so cast and pass to check order details
    expect((orders as Record<string, ICXOrderInfo>)[createOrderTxId]).toStrictEqual(
      {
        status: ICXOrderStatus.OPEN,
        type: ICXOrderType.INTERNAL,
        tokenFrom: symbolDFI,
        chainTo: order.chainTo,
        receivePubkey: order.receivePubkey,
        ownerAddress: order.ownerAddress,
        amountFrom: order.amountFrom,
        amountToFill: order.amountFrom,
        orderPrice: order.orderPrice,
        amountToFillInToAsset: order.amountFrom.multipliedBy(order.orderPrice),
        height: expect.any(BigNumber),
        expireHeight: expect.any(BigNumber)
      }
    )
    // check accountDFI[idDFI] balance, reduced by 15 DFI
    const accountDFIAfterOrder: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    expect(accountDFIAfterOrder[idDFI]).toStrictEqual(accountDFIBeforeOrder[idDFI].minus(15))
  })

  it('should return an error when using non-existent token', async () => {
    // create order - maker
    const order: ICXOrder = {
      tokenFrom: 'DOGE',
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const promise = client.icxorderbook.createOrder(order, [])

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Token DOGE does not exist!\', code: -8, method: icx_createorder')
  })

  it('should return an error as chainTo is not BTC while tokenFrom is specified', async () => {
    // create order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'DOGE',
      ownerAddress: accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const promise = client.icxorderbook.createOrder(order, [])

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid parameters, argument "chainTo" must be "BTC" if "tokenFrom" specified\', code: -8, method: icx_createorder')
  })

  it('should return an error when invalid ICXOrder.ownerAddress is used', async () => {
    // create order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: 'INVALID_OWNDER_ADDRESS',
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const promise = client.icxorderbook.createOrder(order, [])

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'recipient (INVALID_OWNDER_ADDRESS) does not refer to any valid address\', code: -5, method: icx_createorder')
  })

  it('should return an error when invalid ICXOrder.receivePubkey is used', async () => {
    // create order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: 'INVALID_RECEIVE_PUB_KEY',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const promise = client.icxorderbook.createOrder(order, [])

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid public key: INVALID_RECEIVE_PUB_KEY\', code: -5, method: icx_createorder')
  })
})
