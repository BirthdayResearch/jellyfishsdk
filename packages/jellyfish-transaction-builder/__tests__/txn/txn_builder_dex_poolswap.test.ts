import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
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

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder
let jsonRpc: JsonRpcClient

const pairs: Record<string, { tokenA: number, tokenB: number }> = {
  PIG: { tokenA: 0, tokenB: Number.NaN },
  CAT: { tokenA: 0, tokenB: Number.NaN },
  DOG: { tokenA: 0, tokenB: Number.NaN }
}

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())

  providers = await getProviders(container)
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

  // creating DFI-* pool pairs and funding liquidity
  for (const symbol of Object.keys(pairs)) {
    pairs[symbol].tokenB = await createToken(container, symbol)
    await mintTokens(container, symbol, { mintAmount: 10000 })
    await createPoolPair(container, 'DFI', symbol)
  }

  // Prep 1000 DFI Token for testing
  await container.waitForWalletBalanceGTE(1001)
  await utxosToAccount(container, 1000)
})

afterAll(async () => {
  await container.stop()
})

describe('DFI to DOG', () => {
  let addressLP: string
  let amountLP: BigNumber

  beforeEach(async () => {
    await providers.randomizeEllipticPair()
    await container.waitForWalletBalanceGTE(1)

    addressLP = await container.getNewAddress()
    amountLP = await addPoolLiquidity(container, {
      tokenA: 'DFI',
      amountA: 100,
      tokenB: 'DOG',
      amountB: 100,
      shareAddress: addressLP
    })
  })

  afterEach(async () => {
    await container.waitForWalletBalanceGTE(1)
    await removePoolLiquidity(container, {
      address: addressLP,
      amountLP: amountLP,
      tokenLP: 'DFI-DOG'
    })
  })

  it('should poolSwap from DFI to DOG', async () => {
    // Fund 10 DFI UTXO
    await fundEllipticPair(container, providers.ellipticPair, 10)
    // Fund 10 DFI TOKEN
    await providers.setupMocks() // required to move utxos
    await utxosToAccount(container, 100, { address: await providers.getAddress() })
    // Fund 10 DOG TOKEN
    await sendTokensToAddress(container, await providers.getAddress(), 10, 'DOG')

    // Perform SWAP
    const script = await providers.elliptic.script()
    const txn = await builder.dex.poolSwap({
      fromScript: script,
      fromTokenId: pairs.DOG.tokenA,
      fromAmount: new BigNumber('10'),
      toScript: script,
      toTokenId: pairs.DOG.tokenB,
      maxPrice: {
        integer: new BigNumber('9223372036854775807'),
        fraction: new BigNumber('9223372036854775807')
      }
    }, script)

    // Ensure the created txn is correct.
    const outs = await sendTransaction(container, txn)
    expect(outs[0].value).toBe(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toBe(await providers.getAddress())

    // Ensure your balance is correct
    const account = await jsonRpc.account.getAccount(await providers.getAddress())
    expect(account).toContain('90.00000000@DFI')
    expect(account).toContain('19.09090910@DOG')

    const poolPair = await jsonRpc.poolpair.getPoolPair('DFI-DOG', true)
    const pair = Object.values(poolPair)[0]

    // Ensure correct pp liquidity and reverse balances
    expect(pair.totalLiquidity.toFixed(8)).toBe('100.00000000')
    expect(pair.reserveA.toFixed(8)).toBe('110.00000000')
    expect(pair.reserveB.toFixed(8)).toBe('90.90909090') // 100-9.09090910

    // Ensure you don't send all your balance away during poolswap
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toBe(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)
  })
})

// TODO(jellyfish): test alternative poolpair
// TODO(jellyfish): test alternative maxPrice
