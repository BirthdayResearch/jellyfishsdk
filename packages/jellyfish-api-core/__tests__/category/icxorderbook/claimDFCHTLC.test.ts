import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ICXClaimDFCHTLCInfo,
  ICXDFCHTLCInfo,
  ICXEXTHTLCInfo,
  ICXHTLCStatus,
  ICXHTLCType,
  ICXListHTLCOptions
} from '../../../src/category/icxorderbook'
import { accountBTC, accountDFI, ICXSetup, idDFI, symbolDFI } from './icx_setup'
import { BigNumber, RpcApiError } from '../../../src'

describe('ICXOrderBook.claimDFCHTLC', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const icxSetup = new ICXSetup(container, client)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForBlockHeight(1)
    await icxSetup.createAccounts()
    await icxSetup.createBTCToken()
    await icxSetup.initializeTokensIds()
    await icxSetup.mintBTCtoken(100)
    await icxSetup.fundAccount(accountDFI, symbolDFI, 500)
    await icxSetup.fundAccount(accountBTC, symbolDFI, 10) // for fee
    await icxSetup.createBTCDFIPool()
    await icxSetup.addLiquidityToBTCDFIPool(1, 100)
    await icxSetup.setTakerFee(0.001)
    await icxSetup.setupICXFlag()
  })

  afterAll(async () => {
    await container.stop()
  })

  afterEach(async () => {
    await icxSetup.closeAllOpenOffers()
  })

  it('should claim DFC HTLC for DFI sell order', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    const { DFCHTLCTxId } = await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)
    await icxSetup.submitExtHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(0.10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N', '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252', 24)

    const accountDFIBeforeClaim: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    const accountBTCBeforeClaim: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // claim
    const { txid: claimTxId } = await client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')
    await container.generate(1)

    // List htlc and check
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId,
      closed: true
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toStrictEqual(4) // extra entry for the warning text returned by the RPC atm.
    // we have a common field "type", use that to narrow down the record
    if (HTLCs[claimTxId].type === ICXHTLCType.CLAIM_DFC) {
      // ICXClaimDFCHTLCInfo cast
      const ClaimHTLCInfo: ICXClaimDFCHTLCInfo = HTLCs[claimTxId] as ICXClaimDFCHTLCInfo
      expect(ClaimHTLCInfo.dfchtlcTx).toStrictEqual(DFCHTLCTxId)
      expect(ClaimHTLCInfo.seed).toStrictEqual('f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')
    }

    // check HTLC DFCHTLCTxId is in claimed status
    if (HTLCs[DFCHTLCTxId].type === ICXHTLCType.DFC) {
      // ICXDFCHTLCInfo cast
      const DFCHTLCInfo: ICXDFCHTLCInfo = HTLCs[DFCHTLCTxId] as ICXDFCHTLCInfo
      expect(DFCHTLCInfo.status).toStrictEqual(ICXHTLCStatus.CLAIMED)
    }

    const accountDFIAfterClaim: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    const accountBTCAfterClaim: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')

    // maker should get incentive + maker deposit and taker should get amount in DFCHTLCTxId HTLC - takerfee
    expect(accountDFIAfterClaim[idDFI]).toStrictEqual(accountDFIBeforeClaim[idDFI].plus(0.010).plus(0.00250))
    expect(accountBTCAfterClaim[idDFI]).toStrictEqual(accountBTCBeforeClaim[idDFI].plus(10))
  })

  it('should claim DFC HTLC with input utxos', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    const { DFCHTLCTxId } = await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)
    await icxSetup.submitExtHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(0.10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N', '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252', 24)

    const accountDFIBeforeClaim: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    const accountBTCBeforeClaim: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')

    // input utxos
    const inputUTXOs = await container.fundAddress(accountBTC, 10)
    // claim
    const claimTxId = (await client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef', [inputUTXOs])).txid
    await container.generate(1)

    const rawtx = await container.call('getrawtransaction', [claimTxId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(inputUTXOs.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(inputUTXOs.vout)

    // List htlc and check
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId,
      closed: true
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toStrictEqual(4) // extra entry for the warning text returned by the RPC atm.
    // we have a common field "type", use that to narrow down the record
    if (HTLCs[claimTxId].type === ICXHTLCType.CLAIM_DFC) {
      // ICXClaimDFCHTLCInfo cast
      const ClaimHTLCInfo: ICXClaimDFCHTLCInfo = HTLCs[claimTxId] as ICXClaimDFCHTLCInfo
      expect(ClaimHTLCInfo.dfchtlcTx).toStrictEqual(DFCHTLCTxId)
      expect(ClaimHTLCInfo.seed).toStrictEqual('f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')
    }

    // check HTLC DFCHTLCTxId is in claimed status
    if (HTLCs[DFCHTLCTxId].type === ICXHTLCType.DFC) {
      // ICXDFCHTLCInfo cast
      const DFCHTLCInfo: ICXDFCHTLCInfo = HTLCs[DFCHTLCTxId] as ICXDFCHTLCInfo
      expect(DFCHTLCInfo.status).toStrictEqual(ICXHTLCStatus.CLAIMED)
    }

    const accountDFIAfterClaim: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    const accountBTCAfterClaim: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')

    // maker should get incentive + maker deposit and taker should get amount in DFCHTLCTxId HTLC - takerfee
    expect(accountDFIAfterClaim[idDFI]).toStrictEqual(accountDFIBeforeClaim[idDFI].plus(0.010).plus(0.00250))
    expect(accountBTCAfterClaim[idDFI]).toStrictEqual(accountBTCBeforeClaim[idDFI].plus(10))
  })

  it('should return an error when try to claim DFC HTLC with invalid transaction id', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)
    await icxSetup.submitExtHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(0.10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N', '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252', 24)

    // claim with invalid DFC HTLC tx id "123"
    const promise = client.icxorderbook.claimDFCHTLC('123', 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXClaimDFCHTLCTx execution failed:\ndfc htlc with creation tx 0000000000000000000000000000000000000000000000000000000000000123 does not exists!\', code: -32600, method: icx_claimdfchtlc')

    // claim with invalid DFC HTLC tx id "INVALID_DFC_HTLC_TX_ID"
    const promise2 = client.icxorderbook.claimDFCHTLC('INVALID_DFC_HTLC_TX_ID', 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')
    await expect(promise2).rejects.toThrow(RpcApiError)
    await expect(promise2).rejects.toThrow('RpcApiError: \'Test ICXClaimDFCHTLCTx execution failed:\ndfc htlc with creation tx 0000000000000000000000000000000000000000000000000000000000000000 does not exists!\', code: -32600, method: icx_claimdfchtlc')
  })

  it('should return an error when try to claim DFC HTLC with invalid seed', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    const { DFCHTLCTxId } = await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)
    await icxSetup.submitExtHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(0.10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N', '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252', 24)

    // claim with invalid seed "INVALID_SEED"
    const promise = client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, 'INVALID_SEED')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXClaimDFCHTLCTx execution failed:\nhash generated from given seed is different than in dfc htlc: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 - 957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220!\', code: -32600, method: icx_claimdfchtlc')
  })

  it('should be able to claim DFC HTLC with arbitary input utxos', async () => {
    const { createOrderTxId } = await icxSetup.createDFISellOrder('BTC', accountDFI, '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941', new BigNumber(15), new BigNumber(0.01))
    const { makeOfferTxId } = await icxSetup.createDFIBuyOffer(createOrderTxId, new BigNumber(0.10), accountBTC)
    const { DFCHTLCTxId } = await icxSetup.createDFCHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220', 1440)
    await icxSetup.submitExtHTLCForDFIBuyOffer(makeOfferTxId, new BigNumber(0.10), '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
      '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N', '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252', 24)

    const accountDFIBeforeClaim: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    const accountBTCBeforeClaim: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')
    // input utxos
    const inputUTXOs = await container.fundAddress(await container.getNewAddress(), 10)
    // claim
    const claimTxId = (await client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef', [inputUTXOs])).txid
    await container.generate(1)

    const rawtx = await container.call('getrawtransaction', [claimTxId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(inputUTXOs.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(inputUTXOs.vout)

    // List htlc and check
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId,
      closed: true
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo | ICXEXTHTLCInfo | ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toStrictEqual(4) // extra entry for the warning text returned by the RPC atm.
    // we have a common field "type", use that to narrow down the record
    if (HTLCs[claimTxId].type === ICXHTLCType.CLAIM_DFC) {
      // ICXClaimDFCHTLCInfo cast
      const ClaimHTLCInfo: ICXClaimDFCHTLCInfo = HTLCs[claimTxId] as ICXClaimDFCHTLCInfo
      expect(ClaimHTLCInfo.dfchtlcTx).toStrictEqual(DFCHTLCTxId)
      expect(ClaimHTLCInfo.seed).toStrictEqual('f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')
    }

    // check HTLC DFCHTLCTxId is in claimed status
    if (HTLCs[DFCHTLCTxId].type === ICXHTLCType.DFC) {
      // ICXDFCHTLCInfo cast
      const DFCHTLCInfo: ICXDFCHTLCInfo = HTLCs[DFCHTLCTxId] as ICXDFCHTLCInfo
      expect(DFCHTLCInfo.status).toStrictEqual(ICXHTLCStatus.CLAIMED)
    }

    const accountDFIAfterClaim: Record<string, BigNumber> = await client.call('getaccount', [accountDFI, {}, true], 'bignumber')
    const accountBTCAfterClaim: Record<string, BigNumber> = await client.call('getaccount', [accountBTC, {}, true], 'bignumber')

    // maker should get incentive + maker deposit and taker should get amount in DFCHTLCTxId HTLC - takerfee
    expect(accountDFIAfterClaim[idDFI]).toStrictEqual(accountDFIBeforeClaim[idDFI].plus(0.010).plus(0.00250))
    expect(accountBTCAfterClaim[idDFI]).toStrictEqual(accountBTCBeforeClaim[idDFI].plus(10))
  })
})
