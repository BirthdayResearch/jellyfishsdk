// import BigNumber from 'bignumber.js'
// import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
// import { RegTest } from '@defichain/jellyfish-network'
// import { CreateMasterNode, OP_CODES, PoolAddLiquidity, ResignMasterNode } from '@defichain/jellyfish-transaction'
// import { P2WPKH } from '@defichain/jellyfish-address'
// import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
// import { createPoolPair, createToken, mintTokens, sendTokensToAddress, utxosToAccount } from '@defichain/testing'
// import { getProviders, MockProviders } from '../provider.mock'
// import { P2WPKHTransactionBuilder } from '../../src'
// import {
//   findOut,
//   fundEllipticPair,
//   sendTransaction
// } from '../test.utils'
// import { Bech32, HASH160 } from '@defichain/jellyfish-crypto'

// const container = new MasterNodeRegTestContainer()
// let providers: MockProviders
// let builder: P2WPKHTransactionBuilder
// let jsonRpc: JsonRpcClient

// beforeAll(async () => {
//   await container.start()
//   await container.waitForReady()
//   await container.waitForWalletCoinbaseMaturity()
//   jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())
//   providers = await getProviders(container)

//   await container.waitForWalletBalanceGTE(1)

// })

// afterAll(async () => {
//   await container.stop()
// })

// it('should resign()', async () => {
//   const pubKey = await providers.ellipticPair.publicKey()
//   const script = await providers.elliptic.script()

//   const resignMasternode: ResignMasterNode = {
//     nodeId: ''
//   }

//   const txn = await builder.masternode.resign(resignMasternode, script)
// })
