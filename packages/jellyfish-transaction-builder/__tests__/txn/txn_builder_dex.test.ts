import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createPoolPair, createToken, mintTokens, sendTokensToAddress, utxosToAccount } from "@defichain/testing";
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder

const pairs: Record<string, { tokenA: number, tokenB: number }> = {
  PIG: { tokenA: 0, tokenB: Number.NaN },
  CAT: { tokenA: 0, tokenB: Number.NaN },
  DOG: { tokenA: 0, tokenB: Number.NaN },
}

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  providers = await getProviders(container)
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

  // creating DFI-SYMBOL pool pairs and funding liquidity
  for (const symbol of Object.keys(pairs)) {
    pairs[symbol].tokenB = await createToken(container, symbol)
    await mintTokens(container, symbol, { mintAmount: 10000 })
    await createPoolPair(container, 'DFI', symbol)
  }
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  // TODO(fuxingloh): remove lid
  // TODO(fuxingloh): add required liq

  await providers.randomizeEllipticPair()
  await container.waitForWalletBalanceGTE(101)

  // Fund all tokens
  const address = await providers.getAddress()
  for (const symbol of Object.keys(pairs)) {
    await sendTokensToAddress(container, address, 100, symbol)
  }

  // Fund account DFI
  await container.waitForWalletBalanceGTE(101)
  await utxosToAccount(container, 100)

  // Link wallet so that it can be sign as UTXO
  await providers.setupMocks()
  await sendTokensToAddress(container, address, 100, 'DFI')

  // Fund utxos
  await fundEllipticPair(container, providers.ellipticPair, 100)
})

describe('dex.poolSwap', () => {
  it('should poolSwap from DFI to DOG', async () => {
    const pair = pairs.DOG

    const script = await providers.elliptic.script()
    const txn = await builder.dex.poolSwap({
      fromScript: script,
      fromTokenId: pair.tokenA,
      fromAmount: new BigNumber('10'),
      toScript: script,
      toTokenId: pair.tokenB!,
      maxPrice: {
        integer: new BigNumber('9223372036854775807'),
        fraction: new BigNumber('9223372036854775807')
      }
    }, script)
    const outs = await sendTransaction(container, txn)

    console.log(outs)

    // const sendPair = randomEllipticPair()
    // const sendPubKey = await sendPair.publicKey()
    //
    // const to: Script = {
    //   stack: [
    //     OP_CODES.OP_0,
    //     OP_CODES.OP_PUSHDATA(HASH160(sendPubKey), 'little')
    //   ]
    // }
    // const change = await providers.elliptic.script()
    // const txn = await builder.utxo.send(new BigNumber('5'), to, change)
    // const outs = await sendTransaction(container, txn)
    //
    // const sendTo = await findOut(outs, sendPair)
    // expect(sendTo.value).toBe(5)
    // expect(sendTo.scriptPubKey.hex).toBe(`0014${HASH160(sendPubKey).toString('hex')}`)
    // expect(sendTo.scriptPubKey.addresses[0]).toBe(Bech32.fromPubKey(sendPubKey, 'bcrt'))
    //
    // const changePair = await providers.elliptic.ellipticPair
    // const changePubKey = await changePair.publicKey()
    // const changeTo = await findOut(outs, providers.elliptic.ellipticPair)
    // expect(changeTo.value).toBeGreaterThan(4.99)
    // expect(changeTo.value).toBeLessThan(5)
    // expect(changeTo.scriptPubKey.hex).toBe(`0014${HASH160(changePubKey).toString('hex')}`)
    // expect(changeTo.scriptPubKey.addresses[0]).toBe(Bech32.fromPubKey(changePubKey, 'bcrt'))
    //
    // const prevouts = await providers.prevout.all()
    // expect(prevouts.length).toBe(1)
    // expect(prevouts[0].value.toNumber()).toBe(changeTo.value)
    // expect(prevouts[0].vout).toBe(changeTo.n)
    //
    // expect(prevouts[0].script.stack.length).toBe(2)
    // expect(prevouts[0].script.stack[0].type).toBe('OP_0')
    // expect((prevouts[0].script.stack[1] as OP_PUSHDATA).hex).toBe(HASH160(changePubKey).toString('hex'))
  })

  // TODO(jellyfish): test alternative maxPrice
})
