import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { ICXClaimDFCHTLC, OP_CODES } from '@defichain/jellyfish-transaction'
import { icxorderbook } from '@defichain/jellyfish-api-core'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'

describe('claim DFC HTLC', () => {
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

  afterEach(async () => {
    await testing.icxorderbook.closeAllOpenOffers()
  })

  it('should claim DFC HTLC for a DFI sell order', async () => {
    // ICX order creation,make offer, submit htlcs
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

    const DFCHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 1440
    }
    const { DFCHTLCTxId } = await testing.icxorderbook.createDFCHTLCForDFIBuyOffer(DFCHTLC)

    const ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 24
    }
    await testing.icxorderbook.submitExtHTLCForDFIBuyOffer(ExtHTLC)

    // claim DFC HTLC
    const script = await providers.elliptic.script()
    const claimDFCHTLC: ICXClaimDFCHTLC = {
      dfcHTLCTx: DFCHTLCTxId,
      seed: 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef'
    }
    const txn = await builder.icxorderbook.claimDFCHTLC(claimDFCHTLC, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_CLAIM_DFC_HTLC(claimDFCHTLC).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547835')).toBeTruthy()
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
      offerTx: makeOfferTxId,
      closed: true
    }
    const HTLCs = await testing.rpc.icxorderbook.listHTLCs(listHTLCOptions)
    expect(Object.keys(HTLCs).length).toStrictEqual(4) // extra entry for the warning text returned by the RPC atm.
    const claimTxId = calculateTxid(txn)
    if (HTLCs[claimTxId].type === icxorderbook.ICXHTLCType.CLAIM_DFC) {
      // ICXClaimDFCHTLCInfo cast
      const ClaimHTLCInfo: icxorderbook.ICXClaimDFCHTLCInfo = HTLCs[claimTxId] as icxorderbook.ICXClaimDFCHTLCInfo
      expect(ClaimHTLCInfo.dfchtlcTx).toStrictEqual(DFCHTLCTxId)
      expect(ClaimHTLCInfo.seed).toStrictEqual('f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')
    }
  })

  it('should return an error when ICXClaimDFCHTLC.dfcHTLCTx length is invalid', async () => {
    // ICX order creation,make offer, submit htlcs
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

    const DFCHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 1440
    }
    await testing.icxorderbook.createDFCHTLCForDFIBuyOffer(DFCHTLC)

    const ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 24
    }
    await testing.icxorderbook.submitExtHTLCForDFIBuyOffer(ExtHTLC)

    // claim DFC HTLC
    const script = await providers.elliptic.script()
    const claimDFCHTLC: ICXClaimDFCHTLC = {
      dfcHTLCTx: 'INVALID_DFC_HTLC_TX_ID',
      seed: 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef'
    }
    await expect(builder.icxorderbook.claimDFCHTLC(claimDFCHTLC, script)).rejects.toThrow('ComposableBuffer.hexBEBufferLE.toBuffer invalid as length != getter().length')
  })

  it('should return an error when ICXClaimDFCHTLC.seed is incorrect', async () => {
    // ICX order creation,make offer, submit htlcs
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

    const DFCHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      timeout: 1440
    }
    const { DFCHTLCTxId } = await testing.icxorderbook.createDFCHTLCForDFIBuyOffer(DFCHTLC)

    const ExtHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 24
    }
    await testing.icxorderbook.submitExtHTLCForDFIBuyOffer(ExtHTLC)

    // claim DFC HTLC
    const script = await providers.elliptic.script()
    const claimDFCHTLC: ICXClaimDFCHTLC = {
      dfcHTLCTx: DFCHTLCTxId,
      seed: 'INVALID_SEED'
    }
    const txn = await builder.icxorderbook.claimDFCHTLC(claimDFCHTLC, script)
    await expect(sendTransaction(testing.container, txn)).rejects.toThrow('DeFiDRpcError: \'ICXClaimDFCHTLCTx: hash generated from given seed is different than in dfc htlc: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 - 957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220! (code 16)\', code: -26')
  })
})
