import { MasterNodeRegTestContainer, GenesisKeys } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../../jellyfish-api-core/__tests__/container_adapter_client'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { WIF } from '@defichain/jellyfish-crypto'
import { sendTransaction } from '../test.utils'
import BigNumber from 'bignumber.js'
import { OP_CODES, ICXCloseOffer } from '@defichain/jellyfish-transaction'
import { accountDFI, accountBTC, ICXSetup, symbolDFI } from '../../../jellyfish-api-core/__tests__/category/icxorderbook/icx_setup'

describe('close ICX offer', () => {
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

    // // steps required for ICX setup
    await icxSetup.setAccounts(await providers.getAddress(), await providers.getAddress())
    await icxSetup.createBTCToken()
    await icxSetup.initializeTokensIds()
    await icxSetup.mintBTCtoken(100)
    await icxSetup.fundAccount(accountDFI, symbolDFI, 500)
    await icxSetup.fundAccount(accountBTC, symbolDFI, 10) // for fee
    await icxSetup.createBTCDFIPool()
    await icxSetup.addLiquidityToBTCDFIPool(1, 100)
    await icxSetup.setTakerFee(0.001)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should close ICX offer', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    await container.generate(1)

    const listOrders = await container.call('icx_listorders', [{ orderTx: createOrderTxId }])
    const offerBefore = listOrders[makeOfferTxId]

    const script = await providers.elliptic.script()
    const closeOffer: ICXCloseOffer = {
      offerTx: makeOfferTxId
    }
    const txn = await builder.icx.closeOffer(closeOffer, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_CLOSE_OFFER(closeOffer).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(container, txn)
    expect(outs.length).toEqual(2)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547837')).toStrictEqual(true)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const listOrdersAfter = await container.call('icx_listorders', [{ orderTx: createOrderTxId }])

    expect(offerBefore.orderTx).toStrictEqual(createOrderTxId)
    expect(offerBefore.status).toStrictEqual('OPEN')
    expect(Object.keys(listOrdersAfter).length).toBe(1) // extra entry for the warning text returned by the RPC atm.
  })
})
