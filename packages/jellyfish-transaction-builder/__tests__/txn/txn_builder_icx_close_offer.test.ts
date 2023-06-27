import { MasterNodeRegTestContainer, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { WIF } from '@defichain/jellyfish-crypto'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import BigNumber from 'bignumber.js'
import { OP_CODES, ICXCloseOffer } from '@defichain/jellyfish-transaction'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'

describe('close ICX offer', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/icx': 'true'
      }
    })

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey)) // set it to container default
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    await testing.icxorderbook.setAccounts(await providers.getAddress(), await providers.getAddress())
    await testing.rpc.account.utxosToAccount({ [testing.icxorderbook.accountDFI]: `${500}@${testing.icxorderbook.symbolDFI}` })
    await testing.rpc.account.utxosToAccount({ [testing.icxorderbook.accountBTC]: `${10}@${testing.icxorderbook.symbolDFI}` }) // for fee
    await testing.generate(1)
    await testing.fixture.createPoolPair({
      a: { amount: '1', symbol: testing.icxorderbook.symbolBTC },
      b: { amount: '100', symbol: testing.icxorderbook.symbolDFI }
    })
    testing.icxorderbook.DEX_DFI_PER_BTC_RATE = new BigNumber(100 / 1)
    await testing.icxorderbook.setTakerFee(new BigNumber(0.001))
    await testing.icxorderbook.initializeTokensIds()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should close ICX offer', async () => {
    const { createOrderTxId: orderTx } = await testing.icxorderbook.createDFISellOrder({
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    })
    const { makeOfferTxId } = await testing.icxorderbook.createDFIBuyOffer({ orderTx })

    const listOrders = await testing.rpc.icxorderbook.listOrders({ orderTx })
    const offerBefore = listOrders[makeOfferTxId]

    const script = await providers.elliptic.script()
    const closeOffer: ICXCloseOffer = {
      offerTx: makeOfferTxId
    }
    const txn = await builder.icxorderbook.closeOffer(closeOffer, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_CLOSE_OFFER(closeOffer).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547837')).toStrictEqual(true)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toStrictEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const listOrdersAfter = await testing.rpc.icxorderbook.listOrders({ orderTx })
    const offerAfter = listOrdersAfter[makeOfferTxId]

    expect(offerBefore).toBeDefined()
    expect(offerAfter).toBeUndefined()
  })

  it('should not close ICX offer with wrong offer id length', async () => {
    const script = await providers.elliptic.script()
    const closeOffer: ICXCloseOffer = {
      offerTx: '1234'
    }

    await expect(builder.icxorderbook.closeOffer(closeOffer, script)).rejects.toThrow('ComposableBuffer.hexBEBufferLE.toBuffer invalid as length != getter().length')
  })

  it('should not close ICX offer with offer id which does not exist', async () => {
    const script = await providers.elliptic.script()
    const closeOffer: ICXCloseOffer = {
      offerTx: '0'.repeat(64) // 32 bytes long
    }
    const txn = await builder.icxorderbook.closeOffer(closeOffer, script)

    await expect(sendTransaction(testing.container, txn)).rejects.toThrow("DeFiDRpcError: 'ICXCloseOfferTx: offer with creation tx 0000000000000000000000000000000000000000000000000000000000000000 does not exists! (code 16)', code: -26")
  })

  it('should not close ICX order with input not from offer owner', async () => {
    const { createOrderTxId: orderTx } = await testing.icxorderbook.createDFISellOrder({
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    })
    const { makeOfferTxId: offerTx } = await testing.icxorderbook.createDFIBuyOffer({ orderTx })

    const newProviders = await getProviders(testing.container)
    const newBuilder = new P2WPKHTransactionBuilder(newProviders.fee, newProviders.prevout, newProviders.elliptic, RegTest)
    const newAddressScript = await newProviders.elliptic.script()
    await fundEllipticPair(testing.container, newProviders.ellipticPair, 21)
    await newProviders.setupMocks()

    const txn = await newBuilder.icxorderbook.closeOffer({ offerTx }, newAddressScript)

    await expect(sendTransaction(testing.container, txn)).rejects.toThrow("DeFiDRpcError: 'ICXCloseOfferTx: tx must have at least one input from offer owner (code 16)', code: -26")
  })
})
