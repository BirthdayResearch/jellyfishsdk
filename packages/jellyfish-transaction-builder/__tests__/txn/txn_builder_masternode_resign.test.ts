import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { Bech32 } from '@defichain/jellyfish-crypto'
import { ResignMasternode } from '@defichain/jellyfish-transaction'
import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { MasternodeState, MasternodeTimeLock } from '../../../jellyfish-api-core/src/category/masternode'
import {
  fundEllipticPair,
  sendTransaction
} from '../test.utils'

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
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

  await fundEllipticPair(container, providers.ellipticPair, 10)
  await providers.setupMocks()
})

it('should resign', async () => {
  const pubKey = await providers.ellipticPair.publicKey()
  const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')

  const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
  await container.generate(30)

  const masternodesBefore = await jsonRpc.masternode.listMasternodes()
  const createdMasternodeBefore = Object.values(masternodesBefore).find(mn => mn.ownerAuthAddress === collateralAddress)
  if (createdMasternodeBefore === undefined) {
    throw new Error('should not reach here')
  }
  expect(createdMasternodeBefore.state).toStrictEqual(MasternodeState.ENABLED)

  // here fund again to create transaction
  await fundEllipticPair(container, providers.ellipticPair, 10)

  const resignMasternode: ResignMasternode = {
    nodeId: txid
  }

  const script = await providers.elliptic.script()
  const txn = await builder.masternode.resign(resignMasternode, script)

  const outs = await sendTransaction(container, txn)
  expect(outs.length).toStrictEqual(2)
  expect(outs[0].value).toStrictEqual(0)
  expect(outs[0].n).toStrictEqual(0)
  expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547852')).toBeTruthy()
  expect(outs[0].scriptPubKey.hex.startsWith('6a254466547852')).toBeTruthy()
  expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')
  expect(outs[0].tokenId).toStrictEqual(0)

  await container.generate(1)

  const masternodesAfter = await jsonRpc.masternode.listMasternodes()
  const createdMasternodeAfter = Object.values(masternodesAfter).find(mn => mn.ownerAuthAddress === collateralAddress)
  if (createdMasternodeAfter === undefined) {
    throw new Error('should not reach here')
  }
  expect(createdMasternodeAfter.state).toStrictEqual(MasternodeState.PRE_RESIGNED)
})

it('should be failed as tx must have at least one input from owner', async () => {
  const collateralAddress = await container.getNewAddress('', 'legacy')

  const txid = await jsonRpc.masternode.createMasternode(collateralAddress)
  await container.generate(1)

  const masternodes = await jsonRpc.masternode.listMasternodes()
  const createdMasternode = Object.values(masternodes).find(mn => mn.ownerAuthAddress === collateralAddress)
  expect(createdMasternode).not.toBeUndefined()

  await fundEllipticPair(container, providers.ellipticPair, 10)

  const resignMasternode: ResignMasternode = {
    nodeId: txid
  }

  const script = await providers.elliptic.script()
  const txn = await builder.masternode.resign(resignMasternode, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('ResignMasternodeTx: tx must have at least one input from the owner')
})

it('should be failed as trying to resign a NOT ENABLED masternode', async () => {
  const pubKey = await providers.ellipticPair.publicKey()
  const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')

  const txid = await jsonRpc.masternode.createMasternode(collateralAddress, '', { utxos: [], timelock: MasternodeTimeLock.TEN_YEAR })
  await container.generate(1)

  const masternodes = await jsonRpc.masternode.listMasternodes()
  const createdMasternode = Object.values(masternodes).find(mn => mn.ownerAuthAddress === collateralAddress)
  expect(createdMasternode).not.toBeUndefined()

  await fundEllipticPair(container, providers.ellipticPair, 10)

  const resignMasternode: ResignMasternode = {
    nodeId: txid
  }

  const script = await providers.elliptic.script()
  const txn = await builder.masternode.resign(resignMasternode, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow(`ResignMasternodeTx: node ${txid} state is not 'ENABLED'`)
})

it('should be failed as trying to resign masternode before timelock expiration', async () => {
  const pubKey = await providers.ellipticPair.publicKey()
  const collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')

  const txid = await jsonRpc.masternode.createMasternode(collateralAddress, '', { utxos: [], timelock: MasternodeTimeLock.TEN_YEAR })
  await container.generate(30)

  const masternodes = await jsonRpc.masternode.listMasternodes()
  const createdMasternode = Object.values(masternodes).find(mn => mn.ownerAuthAddress === collateralAddress)
  expect(createdMasternode).not.toBeUndefined()

  await fundEllipticPair(container, providers.ellipticPair, 10)

  const resignMasternode: ResignMasternode = {
    nodeId: txid
  }

  const script = await providers.elliptic.script()
  const txn = await builder.masternode.resign(resignMasternode, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('ResignMasternodeTx: Trying to resign masternode before timelock expiration')
})
