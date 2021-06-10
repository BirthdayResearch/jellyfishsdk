import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ICXGenericResult, ICXOfferInfo, ICXOrderInfo, ICXOrder
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { accountDFI, checkBTCSellOrderDetails, checkDFISellOrderDetails, closeAllOrders, idDFI, setup } from './common.test'

describe('Should test ICXOrderBook.createOrder', () => {
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

  beforeEach(async () => {
    // close any existing orders
    await closeAllOrders(container)
  })

  it('Should create ICX order to sell 15 DFI', async () => {
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

    const result: ICXGenericResult = await client.icxorderbook.createOrder(order, [])
    const createOrderTxId = result.txid

    await container.generate(1)

    // list ICX orders
    let orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.icxorderbook.listOrders()
    // check details
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    // we know that only ICXOrderInfo will be returned, so cast and pass to check order details
    await checkDFISellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)

    // close order createOrderTxId
    await client.icxorderbook.closeOrder(createOrderTxId)
    await container.generate(1)

    // check no more ICX orders
    orders = await client.icxorderbook.listOrders()
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check accountDFI[idDFI] balance
    const accountDFIBalance = await container.call('getaccount', [accountDFI, {}, true])
    expect(accountDFIBalance).toStrictEqual(accountDFIStartBalance)
  })

  it('Should create ICX order to sell 2 BTC', async () => {
    // accountDFI start balance
    const accountDFIStartBalance = await container.call('getaccount', [accountDFI, {}, true])
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
    let orders: Record<string, ICXOrderInfo| ICXOfferInfo> = await client.icxorderbook.listOrders()
    // check details
    expect(Object.keys(orders).length).toBe(2) // extra entry for the warning text returned by the RPC atm.
    // we know that only ICXOrderInfo will be returned, so cast and pass to check order details
    await checkBTCSellOrderDetails(container, order, createOrderTxId, orders as Record<string, ICXOrderInfo>)

    // close order createOrderTxId
    await client.icxorderbook.closeOrder(createOrderTxId)
    await container.generate(1)

    // check no more ICX orders
    orders = await client.icxorderbook.listOrders()
    expect(Object.keys(orders).length).toBe(1) // extra entry for the warning text returned by the RPC atm.

    // check accountDFI[idDFI] balance
    const accountDFIBalance = await container.call('getaccount', [accountDFI, {}, true])
    expect(accountDFIBalance).toStrictEqual(accountDFIStartBalance)
  })
})
