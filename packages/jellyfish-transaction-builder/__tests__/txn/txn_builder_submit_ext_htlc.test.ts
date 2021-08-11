import { MasterNodeRegTestContainer, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import { ContainerAdapterClient } from '../../../jellyfish-api-core/__tests__/container_adapter_client'
import { accountBTC, accountDFI, ICXSetup, symbolDFI } from '../../../jellyfish-api-core/__tests__/category/icxorderbook/icx_setup'
import BigNumber from 'bignumber.js'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { ICXSubmitEXTHTLC } from '@defichain/jellyfish-transaction/script/dftx/dftx_icxorderbook'
import { ICXClaimDFCHTLCInfo, ICXDFCHTLCInfo, ICXEXTHTLCInfo, ICXListHTLCOptions } from '@defichain/jellyfish-api-core/category/icxorderbook'

describe('submit EXT HTLC', () => {
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

  afterEach(async () => {
    await icxSetup.closeAllOpenOffers()
  })

  it('should submit EXT HTLC for a DFC buy offer', async () => {
    // ICX order creation, make offer and submit DFC HTLC
    const { order, createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)

    // submit EXT HTLC
    const script = await providers.elliptic.script()
    const submitEXTHTLC: ICXSubmitEXTHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e625',
      timeout: 24
    }
    const txn = await builder.icxorderbook.submitEXTHTLC(submitEXTHTLC, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_SUBMIT_EXT_HTLC(submitEXTHTLC).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(container, txn)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547834')).toBeTruthy()
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.reqSigs).toStrictEqual(1)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    await container.generate(1)

    // List htlc and check
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toBe(3) // extra entry for the warning text returned by the RPC atm.
    const EXTHTLCTxId = calculateTxid(txn)
    expect(HTLCs[EXTHTLCTxId] as ICXEXTHTLCInfo).toStrictEqual(
      {
        type: 'EXTERNAL',
        status: 'OPEN',
        offerTx: makeOfferTxId,
        amount: submitEXTHTLC.amount,
        amountInDFCAsset: submitEXTHTLC.amount.dividedBy(order.orderPrice),
        htlcScriptAddress: submitEXTHTLC.htlcScriptAddress,
        ownerPubkey: submitEXTHTLC.ownerPubkey,
        hash: submitEXTHTLC.hash,
        timeout: new BigNumber(submitEXTHTLC.timeout),
        height: expect.any(BigNumber)
      }
    )
  })

  it('should return an error when ICXSubmitEXTHTLC.amount is negative', async () => {
    // ICX order creation, make offer and submit DFC HTLC
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)

    // submit EXT HTLC
    const script = await providers.elliptic.script()
    const submitEXTHTLC: ICXSubmitEXTHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(-0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: 24
    }
    await expect(builder.icxorderbook.submitDFCHTLC(submitEXTHTLC, script)).rejects.toThrow('The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received -10000000')
  })

  it('should return an error when ICXSubmitEXTHTLC.timeout is negative', async () => {
    // ICX order creation, make offer and submit DFC HTLC
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)

    // submit EXT HTLC
    const script = await providers.elliptic.script()
    const submitEXTHTLC: ICXSubmitEXTHTLC = {
      offerTx: makeOfferTxId,
      amount: new BigNumber(0.10),
      hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
      ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
      timeout: -24
    }
    await expect(builder.icxorderbook.submitDFCHTLC(submitEXTHTLC, script)).rejects.toThrow('The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received -24')
  })
})
