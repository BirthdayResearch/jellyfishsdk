import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ICXGenericResult, ICXOfferInfo, ICXOrderInfo, ICXOrder
} from '../../../src/category/icxorderbook'
import BigNumber from 'bignumber.js'
import { accountDFI, checkBTCSellOrderDetails, checkDFISellOrderDetails, idDFI, setup } from './common.test'

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

    // check accountDFI[idDFI] balance, reduced by 15 DFI //NOTE(surangap) check this
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
})
