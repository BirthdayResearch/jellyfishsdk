import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  ICXClaimDFCHTLCInfo, ICXDFCHTLCInfo, ICXEXTHTLCInfo, ICXHTLCStatus,
  ICXHTLCType, ICXListHTLCOptions, UTXO
} from '../../../src/category/icxorderbook'
import { accountDFI, idDFI, accountBTC, ICXSetup, symbolDFI } from './icx_setup'
import { RpcApiError } from '../../../src'

describe('ICXOrderBook.calimDFCHTLC', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const icxSetup = new ICXSetup(container, client)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForBlock(1)
    await icxSetup.createAccounts()
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
    // cleanup code here
  })

  it('create icx order to sell dfi, make offer, create htlcs and claim dfc htlc, maker and taker balances should be updated as expected', async () => {
    const { makeOfferTxId, DFCHTLCTxId } = await icxSetup.setupUntilSubmitExtHTLCForDFCBuyOffer()

    const accountDFIBeforeClaim = await container.call('getaccount', [accountDFI, {}, true])
    const accountBTCBeforeClaim = await container.call('getaccount', [accountBTC, {}, true])
    // claim
    const claimTxId = (await client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')).txid
    await container.generate(1)

    // List htlc and check
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId,
      closed: true
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toBe(4) // extra entry for the warning text returned by the RPC atm.
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

    const accountDFIAfterClaim = await container.call('getaccount', [accountDFI, {}, true])
    const accountBTCAfterClaim = await container.call('getaccount', [accountBTC, {}, true])

    // maker should get incentive + maker deposit and taker should get amount in DFCHTLCTxId HTLC - takerfee
    // expect(Number(accountDFIAfterClaim[idDFI])).toStrictEqual(Number(accountDFIBeforeClaim[idDFI]) + Number(0.01500000000000) + Number(0.00375000000000))
    expect(accountDFIAfterClaim[idDFI]).toStrictEqual(Number(accountDFIBeforeClaim[idDFI]) + Number(0.010) + Number(0.00250))
    expect(accountBTCAfterClaim[idDFI]).toStrictEqual(Number(accountBTCBeforeClaim[idDFI]) + Number(10))
  })

  it('should claim dfc htlc with input utxos', async () => {
    const { makeOfferTxId, DFCHTLCTxId } = await icxSetup.setupUntilSubmitExtHTLCForDFCBuyOffer()

    const accountDFIBeforeClaim = await container.call('getaccount', [accountDFI, {}, true])
    const accountBTCBeforeClaim = await container.call('getaccount', [accountBTC, {}, true])

    // input utxos
    const utxos = await container.call('listunspent', [1, 9999999, [accountDFI], true])
    const inputUTXOs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })
    // claim
    const claimTxId = (await client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef', inputUTXOs)).txid
    await container.generate(1)

    // List htlc and check
    const listHTLCOptions: ICXListHTLCOptions = {
      offerTx: makeOfferTxId,
      closed: true
    }
    const HTLCs: Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo> = await client.call('icx_listhtlcs', [listHTLCOptions], 'bignumber')
    expect(Object.keys(HTLCs).length).toBe(4) // extra entry for the warning text returned by the RPC atm.
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

    const accountDFIAfterClaim = await container.call('getaccount', [accountDFI, {}, true])
    const accountBTCAfterClaim = await container.call('getaccount', [accountBTC, {}, true])

    // maker should get incentive + maker deposit and taker should get amount in DFCHTLCTxId HTLC - takerfee
    // expect(Number(accountDFIAfterClaim[idDFI])).toStrictEqual(Number(accountDFIBeforeClaim[idDFI]) + Number(0.01500000000000) + Number(0.00375000000000))
    expect(accountDFIAfterClaim[idDFI]).toStrictEqual(Number(accountDFIBeforeClaim[idDFI]) + Number(0.010) + Number(0.00250))
    expect(accountBTCAfterClaim[idDFI].toPrecision(8)).toStrictEqual((Number(accountBTCBeforeClaim[idDFI]) + Number(10)).toPrecision(8))
  })

  it('should return an error when try to claim with invalid htlc transaction id', async () => {
    await icxSetup.setupUntilSubmitExtHTLCForDFCBuyOffer()

    // claim with invalid dfc htlc tx id "123"
    const promise = client.icxorderbook.claimDFCHTLC('123', 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXClaimDFCHTLCTx execution failed:\ndfc htlc with creation tx 0000000000000000000000000000000000000000000000000000000000000123 does not exists!\', code: -32600, method: icx_claimdfchtlc')
  })

  it('should return an error when try to claim with invalid seed', async () => {
    const { DFCHTLCTxId } = await icxSetup.setupUntilSubmitExtHTLCForDFCBuyOffer()

    // claim with invalid seed "123"
    const promise = client.icxorderbook.claimDFCHTLC(DFCHTLCTxId, '123')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test ICXClaimDFCHTLCTx execution failed:\nhash generated from given seed is different than in dfc htlc: f299791cddd3d6664f6670842812ef6053eb6501bd6282a476bbbf3ee91e750c - 957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220!\', code: -32600, method: icx_claimdfchtlc')
  })
})
