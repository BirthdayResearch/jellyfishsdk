import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { ICXSubmitDFCHTLC, OP_CODES } from '@defichain/jellyfish-transaction'
import { Testing } from '@defichain/jellyfish-testing'
import { icxorderbook } from '@defichain/jellyfish-api-core'
import { RegTest } from '@defichain/jellyfish-network'

describe('submit DFC HTLC', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)
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

    // steps required for ICX testing
    await testing.icxorderbook.setAccounts(await providers.getAddress(), await providers.getAddress())
    await testing.rpc.account.utxosToAccount({ [testing.icxorderbook.accountDFI]: `${500}@${testing.icxorderbook.symbolDFI}` })
    await testing.rpc.account.utxosToAccount({ [testing.icxorderbook.accountBTC]: `${10}@${testing.icxorderbook.symbolDFI}` }) // for fee
    await testing.generate(1)
    await testing.fixture.createPoolPair({
      a: {
        amount: '1',
        symbol: testing.icxorderbook.symbolBTC
      },
      b: {
        amount: '100',
        symbol: testing.icxorderbook.symbolDFI
      }
    })
    testing.icxorderbook.DEX_DFI_PER_BTC_RATE = new BigNumber(100 / 1)
    await testing.icxorderbook.setTakerFee(new BigNumber(0.001))
    await testing.icxorderbook.initializeTokensIds()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  afterEach(async () => {
    await testing.icxorderbook.closeAllOpenOffers()
  })

  it('should submit DFC HTLC for a DFC buy offer', async () => {
    // ICX order creation and make offer
    const createOrder = {
      chainTo: 'BTC',
      ownerAddress: testing.icxorderbook.accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const {
      order,
      createOrderTxId
    } = await testing.icxorderbook.createDFISellOrder(createOrder)

    const makeOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10),
      ownerAddress: testing.icxorderbook.accountBTC
    }
    const { makeOfferTxId } = await testing.icxorderbook.createDFIBuyOffer(makeOffer)

    // submit DFC HTLC
    const script = await providers.elliptic.script()
    const submitDFCHTLC: ICXSubmitDFCHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 1440
    }
    const txn = await builder.icxorderbook.submitDFCHTLC(submitDFCHTLC, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_SUBMIT_DFC_HTLC(submitDFCHTLC).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547833')).toBeTruthy()
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toStrictEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.reqSigs).toStrictEqual(1)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    await testing.generate(1)

    // List htlc and check
    const listHTLCOptions: icxorderbook.ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs = await testing.rpc.icxorderbook.listHTLCs(listHTLCOptions)
    expect(Object.keys(HTLCs).length).toStrictEqual(2) // extra entry for the warning text returned by the RPC atm.
    const DFCHTLCTxId = calculateTxid(txn)
    expect(HTLCs[DFCHTLCTxId] as icxorderbook.ICXDFCHTLCInfo).toStrictEqual(
      {
        type: icxorderbook.ICXHTLCType.DFC,
        status: icxorderbook.ICXHTLCStatus.OPEN,
        offerTx: makeOfferTxId,
        amount: submitDFCHTLC.amount,
        amountInEXTAsset: submitDFCHTLC.amount.multipliedBy(order.orderPrice),
        hash: submitDFCHTLC.hash,
        timeout: new BigNumber(submitDFCHTLC.timeout),
        height: expect.any(BigNumber),
        refundHeight: expect.any(BigNumber)
      }
    )
  })

  it('should return an error when ICXSubmitDFCHTLC.amount is negative', async () => {
    // ICX order creation and make offer
    const createOrder = {
      chainTo: 'BTC',
      ownerAddress: testing.icxorderbook.accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const { createOrderTxId } = await testing.icxorderbook.createDFISellOrder(createOrder)

    const makeOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10),
      ownerAddress: testing.icxorderbook.accountBTC
    }
    const { makeOfferTxId } = await testing.icxorderbook.createDFIBuyOffer(makeOffer)

    // submit DFC HTLC
    const script = await providers.elliptic.script()
    const submitDFCHTLC: ICXSubmitDFCHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(-10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 1440
    }
    await expect(builder.icxorderbook.submitDFCHTLC(submitDFCHTLC, script)).rejects.toThrow('The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received -1000000000')
  })

  it('should return an error when ICXSubmitDFCHTLC.timeout is negative', async () => {
    // ICX order creation and make offer
    const createOrder = {
      chainTo: 'BTC',
      ownerAddress: testing.icxorderbook.accountDFI,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(15),
      orderPrice: new BigNumber(0.01)
    }
    const { createOrderTxId } = await testing.icxorderbook.createDFISellOrder(createOrder)

    const makeOffer = {
      orderTx: createOrderTxId,
      amount: new BigNumber(0.10),
      ownerAddress: testing.icxorderbook.accountBTC
    }
    const { makeOfferTxId } = await testing.icxorderbook.createDFIBuyOffer(makeOffer)

    // submit DFC HTLC
    const script = await providers.elliptic.script()
    const submitDFCHTLC: ICXSubmitDFCHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: -1440
    }
    await expect(builder.icxorderbook.submitDFCHTLC(submitDFCHTLC, script)).rejects.toThrow('The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received -1440')
  })
})
