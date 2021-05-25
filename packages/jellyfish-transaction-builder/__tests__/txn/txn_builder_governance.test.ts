import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer, GenesisKeys } from '@defichain/testcontainers'
import {
  addPoolLiquidity,
  createPoolPair,
  createToken,
  mintTokens, removePoolLiquidity,
  sendTokensToAddress,
  utxosToAccount
} from '@defichain/testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { WIF } from '@defichain/jellyfish-crypto'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder
let jsonRpc: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())

  providers = await getProviders(container)
  // providers = await getProviders(container)
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

  await createToken(container, 'CAT')
  await mintTokens(container, 'CAT', { mintAmount: 10000 })
  await createPoolPair(container, 'DFI', 'CAT')

  // Prep 1000 DFI Token for testing
  await container.waitForWalletBalanceGTE(1)
})

afterAll(async () => {
  await container.stop()
})

it('set gov', async () => {
  // console.log('operator', GenesisKeys[0].operator)
  // providers.ellipticPair = WIF.asEllipticPair(GenesisKeys[0].operator.privKey)
  // providers.elliptic.ellipticPair = providers.ellipticPair
  // providers.prevout.ellipticPair = providers.ellipticPair

  // const res = await container.call('setgov', [{ LP_DAILY_DFI_REWARD: 1.55 }])
  const res = await container.call('setgov', [{
    LP_SPLITS: {
      2: 1
    },
    LP_DAILY_DFI_REWARD: 1.55
  }])
  // console.log(res)

  const tx = await container.call('getrawtransaction', [res, true])
  console.log('RAW: ', tx)
  console.log('vout[0]: ', tx.vout[0].scriptPubKey)
  // console.log('vout[1]: ', tx.vout[1].scriptPubKey)
  // console.log('hex', tx.hex)
})

// sequence: 4294967295

// 6a214466547847134c505f4441494c595f4446495f52455741524400d0ed902e000000

// 6a21 4466547847 13 4c505f4441494c595f4446495f524557415244 00 d0ed90 2e 000000 // 2000

// 6a21 4466547847 13 4c505f4441494c595f4446495f524557415244 00 078142 17 000000 // 999

// 6a21 4466547847 13 4c505f4441494c595f4446495f524557415244 00 e87648 17 000000 // 1000

// 6a21 4466547847 13 4c505f4441494c595f4446495f524557415244 00 e1f505 00 000000 // 1

// 6a21 4466547847 13 4c505f4441494c595f4446495f524557415244 00c2eb0b00000000 // 2
// 6a21 4466547847 13 4c505f4441494c595f4446495f524557415244 80 b398d3 00 000000 // 35.5
// 6a21 4466547847 13 4c505f4441494c595f4446495f524557415244 80 d1f008 00 000000 // 1.5
// 6a21 4466547847 13 4c505f4441494c595f4446495f524557415244 80 778e06 00 000000 // 1.1
// 6a21 4466547847 13 4c505f4441494c595f4446495f524557415244 c0 1c3d09 00 000000 // 1.55

// 174876e8 = 1000
// 17428107 = 999

// LP_SPLITS
// 6a1c 4466547847 09 4c505f53504c495453 0102000000 00e1f50500000000

// 6a1c4466547847094c505f53504c495453010200000000e1f50500000000

// 6a38 4466547847 09 4c505f53504c495453 0102000000 00e1f50500000000 134c505f4441494c595f4446495f524557415244c01c3d0900000000
