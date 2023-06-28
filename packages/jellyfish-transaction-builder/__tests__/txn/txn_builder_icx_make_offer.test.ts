import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { WIF } from '@defichain/jellyfish-crypto'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import BigNumber from 'bignumber.js'
import { ICXMakeOffer, OP_CODES } from '@defichain/jellyfish-transaction'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'

describe('make ICX offer', () => {
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
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey)) // set it to testing.container default
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    // steps required for ICX setup
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

    await testing.container.waitForWalletBalanceGTE(10)
    await fundEllipticPair(testing.container, providers.elliptic.ellipticPair, 10)
    await providers.setupMocks()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  afterEach(async () => {
    await testing.icxorderbook.closeAllOpenOffers()
  })

  it('should make internal ICX offer', async () => {
    const icxOrder = {
      tokenFrom: testing.icxorderbook.idDFI,
      chainTo: 'BTC',
      ownerAddress: testing.icxorderbook.accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const orderResult = await testing.rpc.icxorderbook.createOrder(icxOrder)
    const orderTx = orderResult.txid
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const icxOffer: ICXMakeOffer = {
      orderTx,
      amount: new BigNumber(0.1),
      ownerAddress: script,
      expiry: 20,
      takerFee: new BigNumber(0.01)
    }
    const txn = await builder.icxorderbook.makeOffer(icxOffer, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_MAKE_OFFER(icxOffer).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547832')).toStrictEqual(true)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toStrictEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const listOrders = await testing.rpc.icxorderbook.listOrders({ orderTx })
    const txid = calculateTxid(txn)
    const offer = listOrders[txid]

    const currentHeight = await testing.container.getBlockCount() // Get current block count to calculate expiry
    const expectedExpireHeight = currentHeight + icxOffer.expiry

    expect(offer).toStrictEqual({
      orderTx: icxOffer.orderTx,
      status: 'OPEN',
      amount: icxOffer.amount,
      amountInFromAsset: icxOffer.amount.dividedBy(icxOrder.orderPrice),
      ownerAddress: testing.icxorderbook.accountDFI,
      takerFee: icxOffer.amount.multipliedBy(testing.icxorderbook.ICX_TAKERFEE_PER_BTC).multipliedBy(testing.icxorderbook.DEX_DFI_PER_BTC_RATE),
      expireHeight: new BigNumber(expectedExpireHeight)
    })
  })

  it('should make external ICX offer', async () => {
    const icxOrder = {
      chainFrom: 'BTC',
      tokenTo: testing.icxorderbook.idDFI,
      ownerAddress: testing.icxorderbook.accountDFI,
      amountFrom: new BigNumber(2),
      orderPrice: new BigNumber(100)
    }
    const orderResult = await testing.rpc.icxorderbook.createOrder(icxOrder)
    const orderTx = orderResult.txid
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const icxOffer: ICXMakeOffer = {
      orderTx,
      amount: new BigNumber(100),
      ownerAddress: script,
      receivePubkey: '0348790cb93b203a8ea5ce07279cb209d807b535b2ca8b0988a6f7a6578e41f7a5',
      expiry: 20,
      takerFee: new BigNumber(0.01)
    }
    const txn = await builder.icxorderbook.makeOffer(icxOffer, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_MAKE_OFFER(icxOffer).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547832')).toStrictEqual(true)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toStrictEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const listOrders = await testing.rpc.icxorderbook.listOrders({ orderTx })
    const txid = calculateTxid(txn)
    const offer = listOrders[txid]

    const currentHeight = await testing.container.getBlockCount() // Get current block count to calculate expiry
    const expectedExpireHeight = currentHeight + icxOffer.expiry

    expect(offer).toStrictEqual({
      orderTx: icxOffer.orderTx,
      status: 'OPEN',
      amount: icxOffer.amount,
      amountInFromAsset: icxOffer.amount.dividedBy(icxOrder.orderPrice),
      ownerAddress: testing.icxorderbook.accountDFI,
      takerFee: icxOffer.amount.multipliedBy(testing.icxorderbook.ICX_TAKERFEE_PER_BTC),
      expireHeight: new BigNumber(expectedExpireHeight),
      receivePubkey: icxOffer.receivePubkey
    })
  })

  it('should make external ICX offer with uncompressed receivePubkey', async () => {
    const icxOrder = {
      chainFrom: 'BTC',
      tokenTo: testing.icxorderbook.idDFI,
      ownerAddress: testing.icxorderbook.accountDFI,
      amountFrom: new BigNumber(2),
      orderPrice: new BigNumber(100)
    }
    const orderResult = await testing.rpc.icxorderbook.createOrder(icxOrder)
    const orderTx = orderResult.txid
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const icxOffer: ICXMakeOffer = {
      orderTx,
      amount: new BigNumber(100),
      ownerAddress: script,
      receivePubkey: '04e6873a6492abfbcf66524249828eee1baf072f3b01db6c1fec05456876229f1ac462019d2cedc8a990056c4fd2df4a8eb930504c2af7dc2a5d776f7072491558',
      expiry: 20,
      takerFee: new BigNumber(0.01)
    }
    const txn = await builder.icxorderbook.makeOffer(icxOffer, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_MAKE_OFFER(icxOffer).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547832')).toStrictEqual(true)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toStrictEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const listOrders = await testing.rpc.icxorderbook.listOrders({ orderTx })
    const txid = calculateTxid(txn)
    const offer = listOrders[txid]

    const currentHeight = await testing.container.getBlockCount() // Get current block count to calculate expiry
    const expectedExpireHeight = currentHeight + icxOffer.expiry

    expect(offer).toStrictEqual({
      orderTx: icxOffer.orderTx,
      status: 'OPEN',
      amount: icxOffer.amount,
      amountInFromAsset: icxOffer.amount.dividedBy(icxOrder.orderPrice),
      ownerAddress: testing.icxorderbook.accountDFI,
      takerFee: icxOffer.amount.multipliedBy(testing.icxorderbook.ICX_TAKERFEE_PER_BTC),
      expireHeight: new BigNumber(expectedExpireHeight),
      receivePubkey: icxOffer.receivePubkey
    })
  })

  it('should reject with wrong receivePubkey length', async () => {
    const icxOrder = {
      chainFrom: 'BTC',
      tokenTo: testing.icxorderbook.idDFI,
      ownerAddress: testing.icxorderbook.accountDFI,
      amountFrom: new BigNumber(2),
      orderPrice: new BigNumber(100)
    }
    const orderResult = await testing.rpc.icxorderbook.createOrder(icxOrder)
    const orderTx = orderResult.txid
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const icxOffer: ICXMakeOffer = {
      orderTx,
      amount: new BigNumber(100),
      ownerAddress: script,
      receivePubkey: '0348790cb93b203a8ea5ce07279cb209d807b535b2ca8b0988a6f7a6578e41f7a5' + '1234', // compressed public key + 2 extra bytes
      expiry: 20,
      takerFee: new BigNumber(0.01)
    }

    await expect(builder.icxorderbook.makeOffer(icxOffer, script)).rejects.toThrow('Make offer receivePubkey buffer length should be 33 (COMPRESSED_PUBLIC_KEY_SIZE) or 65 (PUBLIC_KEY_SIZE)')
  })
})
