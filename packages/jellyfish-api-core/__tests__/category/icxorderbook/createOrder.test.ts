import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ICXGenericResult, ICXOfferInfo, ICXOrderInfo, ICXOrder, InputUTXO
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { accountDFI, checkBTCSellOrderDetails, checkDFISellOrderDetails, idDFI, setup } from './common.test'
import { RpcApiError } from '../../../src'

describe('Should test ICXOrderBook.createOrder', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await setup(container)
  })

  afterAll(async () => {
    await container.stop()
  })

  afterEach(async () => {
    // cleanup code here
  })

  it('Should create an ICX order to sell 15 DFI', async () => {
    const accountDFIStart = await container.call('getaccount', [accountDFI, {}, true])
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
    const orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.icxorderbook.listOrders()
    // we know that only ICXOrderInfo will be returned, so cast and pass to check order details
    await checkDFISellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)

    // check accountDFI[idDFI] balance, reduced by 15 DFI
    const accountDFIAfterOrder = await container.call('getaccount', [accountDFI, {}, true])
    expect(Number(accountDFIAfterOrder[idDFI])).toStrictEqual(Number(accountDFIStart[idDFI] - Number(15)))
  })

  it('Should create an ICX order to sell 2 BTC', async () => {
    const accountDFIStart = await container.call('getaccount', [accountDFI, {}, true])
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
    const orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.icxorderbook.listOrders()
    await checkBTCSellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)

    // check accountDFI[idDFI] balance, should be the same
    const accountDFIAfterOrder = await container.call('getaccount', [accountDFI, {}, true])
    expect(accountDFIAfterOrder).toStrictEqual(accountDFIStart)
  })

  it('Should create an ICX order to sell 15 DFI with input UTXOs', async () => {
    const accountDFIStart = await container.call('getaccount', [accountDFI, {}, true])
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
    const utxos = await container.call('listunspent', [1, 9999999, [accountDFI], true])
    const inputUTXOs: InputUTXO[] = utxos.map((utxo: InputUTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })
    const result: ICXGenericResult = await client.icxorderbook.createOrder(order, inputUTXOs)
    const createOrderTxId = result.txid
    await container.generate(1)

    // list ICX orders
    const orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.icxorderbook.listOrders()
    // we know that only ICXOrderInfo will be returned, so cast and pass to check order details
    await checkDFISellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)

    // check accountDFI[idDFI] balance, reduced by 15 DFI
    const accountDFIAfterOrder = await container.call('getaccount', [accountDFI, {}, true])
    expect(Number(accountDFIAfterOrder[idDFI])).toStrictEqual(Number(accountDFIStart[idDFI] - Number(15)))
  })

  it('Should return an error when invalid ICXOrder.tokenFrom is used', async () => {
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

  it('Should return an error when invalid ICXOrder.chainTo is used', async () => {
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

  it('Should return an error when invalid ICXOrder.ownerAddress is used', async () => {
    // create order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: '123',
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const promise = client.icxorderbook.createOrder(order, [])

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'recipient (123) does not refer to any valid address\', code: -5, method: icx_createorder')
  })

  it('Should return an error when invalid ICXOrder.receivePubkey is used', async () => {
    // create order - maker
    const order: ICXOrder = {
      tokenFrom: idDFI,
      chainTo: 'BTC',
      ownerAddress: accountDFI,
      receivePubkey: '123',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const promise = client.icxorderbook.createOrder(order, [])

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid public key: 123\', code: -5, method: icx_createorder')
  })
})
