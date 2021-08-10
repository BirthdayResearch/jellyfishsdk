import { MasterNodeRegTestContainer, GenesisKeys } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../../jellyfish-api-core/__tests__/container_adapter_client'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { WIF } from '@defichain/jellyfish-crypto'
import { sendTransaction } from '../test.utils'
import BigNumber from 'bignumber.js'
import { OP_CODES, ICXCloseOrder } from '@defichain/jellyfish-transaction'
import { accountDFI, ICXSetup, symbolDFI } from '../../../jellyfish-api-core/__tests__/category/icxorderbook/icx_setup'

describe('close ICX order', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const icxSetup = new ICXSetup(container, client)
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey)) // set it to container default
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

    // steps required for ICX setup
    await icxSetup.setAccounts(await providers.getAddress(), await providers.getAddress())
    await icxSetup.fundAccount(accountDFI, symbolDFI, 15) // funds account to create order
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should close ICX order', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))

    const listOrders = await container.call('icx_listorders')
    const orderBefore = listOrders[createOrderTxId]

    const script = await providers.elliptic.script()
    const closeOrder: ICXCloseOrder = {
      orderTx: createOrderTxId
    }
    const txn = await builder.icx.closeOrder(closeOrder, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_CLOSE_ORDER(closeOrder).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(container, txn)
    expect(outs.length).toEqual(2)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547836')).toStrictEqual(true)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const listOrdersAfter = await container.call('icx_listorders')
    const orderAfter = listOrdersAfter[createOrderTxId]

    expect(orderBefore).toBeDefined()
    expect(orderAfter).toBeUndefined()
  })
})
