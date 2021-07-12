import BigNumber from 'bignumber.js'
import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  addPoolLiquidity,
  createPoolPair,
  createToken,
  mintTokens,
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

describe('dex.poolswap()', () => {
  it('should poolSwap', async () => {
    await providers.randomizeEllipticPair()
    await container.waitForWalletBalanceGTE(1)
    const addressLP = await container.getNewAddress()
    await addPoolLiquidity(container, {
      tokenA: 'DFI',
      amountA: 100,
      tokenB: 'DOG',
      amountB: 100,
      shareAddress: addressLP
    })
    // Fund 100 DFI TOKEN
    await providers.setupMocks() // required to move utxos
    await utxosToAccount(container, 100, { address: await providers.getAddress() })
    // Fund 10 DOG TOKEN
    await sendTokensToAddress(container, await providers.getAddress(), 10, 'DOG')

    // Fund 10 DFI UTXO
    await fundEllipticPair(container, providers.ellipticPair, 10)

    // Perform SWAP
    const script = await providers.elliptic.script()
    const txn = await builder.dex.poolSwap({
      fromScript: script,
      fromTokenId: pairs.DOG.tokenA,
      fromAmount: new BigNumber('10'),
      toScript: script,
      toTokenId: pairs.DOG.tokenB,
      maxPrice: new BigNumber('18446744073709551615.99999999')
    }, script)

    // Ensure the created txn is correct.
    const outs = await sendTransaction(container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure your balance is correct
    const account = await jsonRpc.account.getAccount(await providers.getAddress())
    expect(account).toContain('90.00000000@DFI')
    expect(account).toContain('19.09090910@DOG')

    const poolPair = await jsonRpc.poolpair.getPoolPair('DFI-DOG', true)
    const pair = Object.values(poolPair)[0]

    // Ensure correct pp liquidity and reverse balances
    expect(pair.totalLiquidity.toFixed(8)).toStrictEqual('100.00000000')
    expect(pair.reserveA.toFixed(8)).toStrictEqual('110.00000000')
    expect(pair.reserveB.toFixed(8)).toStrictEqual('90.90909090') // 100-9.09090910

    // Ensure you don't send all your balance away during poolswap
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)
  })

  it('should poolSwap with maxPrice', async () => {
    await providers.randomizeEllipticPair()
    await container.waitForWalletBalanceGTE(1)
    const addressLP = await container.getNewAddress()
    await addPoolLiquidity(container, {
      tokenA: 'DFI',
      amountA: 100,
      tokenB: 'PIG',
      amountB: 20,
      shareAddress: addressLP
    })
    await providers.setupMocks()
    await utxosToAccount(container, 100, { address: await providers.getAddress() })
    await sendTokensToAddress(container, await providers.getAddress(), 2, 'PIG')
    await fundEllipticPair(container, providers.ellipticPair, 10)
    const script = await providers.elliptic.script()

    const txn = await builder.dex.poolSwap({
      fromScript: script,
      fromTokenId: pairs.PIG.tokenA,
      fromAmount: new BigNumber('2'),
      toScript: script,
      toTokenId: pairs.PIG.tokenB,
      maxPrice: new BigNumber('5.0')
    }, script)

    const outs = await sendTransaction(container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const account = await jsonRpc.account.getAccount(await providers.getAddress())
    expect(account).toContain('98.00000000@DFI')
    expect(account).toContain('2.39215687@PIG')

    const poolPair = await jsonRpc.poolpair.getPoolPair('DFI-PIG', true)
    const pair = Object.values(poolPair)[0]

    expect(pair.totalLiquidity.toFixed(8)).toStrictEqual('44.72135954')
    expect(pair.reserveA.toFixed(8)).toStrictEqual('102.00000000')
    expect(pair.reserveB.toFixed(8)).toStrictEqual('19.60784313')

    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)
  })

  it('should fail poolSwap due to maxPrice lower than reserveA/reserveB', async () => {
    await providers.randomizeEllipticPair()
    await container.waitForWalletBalanceGTE(1)
    const addressLP = await container.getNewAddress()
    await addPoolLiquidity(container, {
      tokenA: 'DFI',
      amountA: 100,
      tokenB: 'CAT',
      amountB: 20,
      shareAddress: addressLP
    })
    await providers.setupMocks()
    await utxosToAccount(container, 100, { address: await providers.getAddress() })
    await sendTokensToAddress(container, await providers.getAddress(), 2, 'CAT')
    await fundEllipticPair(container, providers.ellipticPair, 10)
    const script = await providers.elliptic.script()

    const txn = await builder.dex.poolSwap({
      fromScript: script,
      fromTokenId: pairs.CAT.tokenA,
      fromAmount: new BigNumber('2'),
      toScript: script,
      toTokenId: pairs.CAT.tokenB,
      maxPrice: new BigNumber('0.00000003')
    }, script)

    const promise = sendTransaction(container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Price is higher than indicated')
  })
})
