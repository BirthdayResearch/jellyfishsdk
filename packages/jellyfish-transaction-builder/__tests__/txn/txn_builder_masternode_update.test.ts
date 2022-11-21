import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTest } from '@defichain/jellyfish-network'
import { OP_CODES, TransactionSegWit, UpdateMasternode } from '@defichain/jellyfish-transaction'
import { P2WPKH } from '@defichain/jellyfish-address'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { Bech32 } from '@defichain/jellyfish-crypto'

describe('UpdateMasternode', () => {
  const container = new MasterNodeRegTestContainer()
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder
  let jsonRpc: JsonRpcClient

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(1001)

    jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())
    providers = await getProviders(container)
  })

  afterAll(async () => {
    await container.stop()
  })

  beforeEach(async () => {
    await providers.randomizeEllipticPair()
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
    await fundEllipticPair(container, providers.ellipticPair, 10)
    await providers.setupMocks()
  })

  it('should update operator address with P2WPKH address', async () => {
    const balance = await container.call('getbalance')
    expect(balance >= 2).toBeTruthy()

    // enable updating
    await jsonRpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/mn-setowneraddress': 'true',
        'v0/params/feature/mn-setoperatoraddress': 'true',
        'v0/params/feature/mn-setrewardaddress': 'true'
      }
    })
    await container.generate(1)

    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const address = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, address, P2WPKH)
    const addressDestHex = addressDest.pubKeyHash

    const updateMasternode: UpdateMasternode = {
      nodeId: txid,
      updates: [
        {
          updateType: 0x02,
          address: { addressType: 0x04, addressPubKeyHash: addressDestHex }
        }
      ]
    }

    const script = await providers.elliptic.script()
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
    const encoded: string = OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(container, txn)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 446654786d')).toBeTruthy()
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toStrictEqual(6.9999542)
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.reqSigs).toStrictEqual(1)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())
  })

  it('should update reward address with P2WPKH address', async () => {
    const balance = await container.call('getbalance')
    expect(balance >= 2).toBeTruthy()

    // enable updating
    await jsonRpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/mn-setowneraddress': 'true',
        'v0/params/feature/mn-setoperatoraddress': 'true',
        'v0/params/feature/mn-setrewardaddress': 'true'
      }
    })
    await container.generate(1)

    const pubKey = await providers.ellipticPair.publicKey()
    const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
    await container.generate(20)

    const address = await container.getNewAddress('', 'bech32')
    const addressDest: P2WPKH = P2WPKH.fromAddress(RegTest, address, P2WPKH)
    const addressDestHex = addressDest.pubKeyHash

    const updateMasternode: UpdateMasternode = {
      nodeId: txid,
      updates: [
        {
          updateType: 0x03,
          address: { addressType: 0x04, addressPubKeyHash: addressDestHex }
        }
      ]
    }

    const script = await providers.elliptic.script()
    const txn: TransactionSegWit = await builder.masternode.update(updateMasternode, script)
    const encoded: string = OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(container, txn)
    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 446654786d')).toBeTruthy()
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toStrictEqual(6.9999542)
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.reqSigs).toStrictEqual(1)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())
  })
})
