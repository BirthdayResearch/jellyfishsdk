import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { fundEllipticPair, getProviders, MockEllipticPairProvider, randomEllipticPair } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { OP_CODES, Script } from '@defichain/jellyfish-transaction'
import { HASH160 } from '@defichain/jellyfish-crypto'

const container = new MasterNodeRegTestContainer()
let elliptic: MockEllipticPairProvider
let builder: P2WPKHTransactionBuilder

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  const { fee, prevout, elliptic: e } = getProviders(container)
  elliptic = e
  builder = new P2WPKHTransactionBuilder(fee, prevout, elliptic)
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await container.waitForWalletBalanceGTE(100)
  await fundEllipticPair(container, elliptic.ellipticPair, 10)
})

describe('utxo.send', () => {
  it('should send to P2WPKH address', async () => {
    const ellipticPair = randomEllipticPair()
    const amount = new BigNumber('5')
    const to: Script = {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(HASH160(await ellipticPair.publicKey()), 'little')
      ]
    }
    const change = await elliptic.script()
    await builder.utxo.send(amount, to, change)

    // TODO(fuxingloh): check received
    // TODO(fuxingloh): check unspent
  })

  // TODO(ivan-zynesis): other address types
})


describe('utxo.sendAll', () => {
  it('should send all to P2WPKH address', async () => {
    const ellipticPair = randomEllipticPair()
    const to: Script = {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(HASH160(await ellipticPair.publicKey()), 'little')
      ]
    }
    await builder.utxo.sendAll(to)

    // TODO(fuxingloh): check received
    // TODO(fuxingloh): check unspent be empty
  })

  // TODO(ivan-zynesis): other address types
})

