import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { OP_CODES, OP_PUSHDATA, Script } from '@defichain/jellyfish-transaction'
import { Bech32, HASH160 } from '@defichain/jellyfish-crypto'
import {
  findOut,
  fundEllipticPair,
  randomEllipticPair,
  sendTransaction
} from '../test.utils'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  providers = await getProviders(container)
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await providers.randomizeEllipticPair()
  await container.waitForWalletBalanceGTE(101)

  await fundEllipticPair(container, providers.elliptic.ellipticPair, 1.1) // 1.1
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 5.5) // 6.6
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 10.566) // 17.166
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 15.51345) // 32.67945
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 20) // 52.67945
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 37.98) // 90.65945
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 9.34055) // 100

  await providers.setupMocks()
})

describe('utxo.send', () => {
  it('should send to address', async () => {
    const sendPair = randomEllipticPair()
    const sendPubKey = await sendPair.publicKey()

    const to: Script = {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(HASH160(sendPubKey), 'little')
      ]
    }
    const change = await providers.elliptic.script()
    const txn = await builder.utxo.send(new BigNumber('99'), to, change)
    const outs = await sendTransaction(container, txn)

    const sendTo = await findOut(outs, sendPair)
    expect(sendTo.value).toStrictEqual(99)
    expect(sendTo.scriptPubKey.hex).toStrictEqual(`0014${HASH160(sendPubKey).toString('hex')}`)
    expect(sendTo.scriptPubKey.addresses[0]).toStrictEqual(Bech32.fromPubKey(sendPubKey, 'bcrt'))

    const changePair = await providers.elliptic.ellipticPair
    const changePubKey = await changePair.publicKey()
    const changeTo = await findOut(outs, providers.elliptic.ellipticPair)
    expect(changeTo.value).toBeGreaterThan(0.9)
    expect(changeTo.value).toBeLessThan(1)
    expect(changeTo.scriptPubKey.hex).toStrictEqual(`0014${HASH160(changePubKey).toString('hex')}`)
    expect(changeTo.scriptPubKey.addresses[0]).toStrictEqual(Bech32.fromPubKey(changePubKey, 'bcrt'))

    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toStrictEqual(changeTo.value)
    expect(prevouts[0].vout).toStrictEqual(changeTo.n)

    expect(prevouts[0].script.stack.length).toStrictEqual(2)
    expect(prevouts[0].script.stack[0].type).toStrictEqual('OP_0')
    expect((prevouts[0].script.stack[1] as OP_PUSHDATA).hex).toStrictEqual(HASH160(changePubKey).toString('hex'))
  })
})

describe('utxo.sendAll', () => {
  it('should send all to address', async () => {
    const sendPair = randomEllipticPair()
    const sendPubKey = await sendPair.publicKey()

    const to: Script = {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(HASH160(sendPubKey), 'little')
      ]
    }
    const txn = await builder.utxo.sendAll(to)
    const outs = await sendTransaction(container, txn)

    expect(outs.length).toStrictEqual(1)

    const sendTo = await findOut(outs, sendPair)
    expect(sendTo.value).toBeGreaterThan(99.99)
    expect(sendTo.value).toBeLessThan(100)
    expect(sendTo.scriptPubKey.hex).toStrictEqual(`0014${HASH160(sendPubKey).toString('hex')}`)
    expect(sendTo.scriptPubKey.addresses[0]).toStrictEqual(Bech32.fromPubKey(sendPubKey, 'bcrt'))

    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(0)
  })
})
