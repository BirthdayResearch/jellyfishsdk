import { getNetwork } from '@defichain/jellyfish-network'
import { WhaleWalletAccount, WhaleWalletAccountProvider } from '../src/Wallet'
import { TestNodeProvider } from '../testing/TestNode'
import { WhaleMasternodeRegTestContainer } from '../testing/WhaleMasternodeRegTestContainer'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { WhalePrevoutProvider } from '../src/Prevout'

describe('WhalePrevoutProvider', () => {
  const nodeProvider = new TestNodeProvider()
  const container = new WhaleMasternodeRegTestContainer()
  let whaleApiClient: WhaleApiClient
  let account: WhaleWalletAccount
  let prevoutProvider: WhalePrevoutProvider
  beforeEach(async () => {
    await container.start()
    await container.ain.waitForWalletCoinbaseMaturity()
    whaleApiClient = container.getWhaleApiClient()
    const accountProvider = new WhaleWalletAccountProvider(whaleApiClient, getNetwork('regtest'))
    account = accountProvider.provide(nodeProvider.derive('1129/0/0/0'))
    prevoutProvider = new WhalePrevoutProvider(
      account,
      10
    )
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should get prevout array with all()', async () => {
    const addr = await account.getAddress()
    const unspent = await whaleApiClient.address.listTransactionUnspent(addr)
    const res = await prevoutProvider.all()
    for (let i = 0; i < unspent.length; i++) {
      expect(unspent[i].vout.txid).toStrictEqual(res[i].txid)
      expect(unspent[i].vout.n).toStrictEqual(res[i].vout)
      expect(unspent[i].vout.value).toStrictEqual(res[i].value)
      expect(unspent[i].vout.tokenId).toStrictEqual(res[i].tokenId)
    }
  })

  it('should collect()', async () => {
    const addr = await account.getAddress()
    const unspent = await whaleApiClient.address.listTransactionUnspent(addr)
    const res = await prevoutProvider.all()
    for (let i = 0; i < unspent.length; i++) {
      expect(unspent[i].vout.txid).toStrictEqual(res[i].txid)
      expect(unspent[i].vout.n).toStrictEqual(res[i].vout)
      expect(unspent[i].vout.value).toStrictEqual(res[i].value)
      expect(unspent[i].vout.tokenId).toStrictEqual(res[i].tokenId)
    }
  })

  it.skip('should collect() with minBalance', () => {})
})
