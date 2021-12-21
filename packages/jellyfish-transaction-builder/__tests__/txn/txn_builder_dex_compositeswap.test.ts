import BigNumber from 'bignumber.js'
import { DeFiDRpcError } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTest } from '@defichain/jellyfish-network'
import { Testing } from '@defichain/jellyfish-testing'
import { fromAddress } from '@defichain/jellyfish-address'
import { Script } from 'packages/jellyfish-transaction/src/tx'
import { LoanMasterNodeRegTestContainer } from './loan_container'

const container = new LoanMasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder
let jsonRpc: JsonRpcClient
let testing: Testing

interface Pair {
  tokenId: number
  poolId: number
}

const pairs: Record<string, Pair> = {
  PIG: { tokenId: Number.NaN, poolId: Number.NaN },
  CAT: { tokenId: Number.NaN, poolId: Number.NaN },
  DOG: { tokenId: Number.NaN, poolId: Number.NaN },
  BIRD: { tokenId: Number.NaN, poolId: Number.NaN },
  FISH: { tokenId: Number.NaN, poolId: Number.NaN }
}

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())

  providers = await getProviders(container)
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
  testing = Testing.create(container)

  // creating DFI-* pool pairs and funding liquidity
  for (const symbol of Object.keys(pairs)) {
    await testing.token.create({ symbol })
    await testing.generate(1)

    const token = await container.call('gettoken', [symbol])
    pairs[symbol].tokenId = Number.parseInt(Object.keys(token)[0])

    await testing.token.mint({ symbol, amount: 10000 })
    await testing.poolpair.create({ tokenA: symbol, tokenB: 'DFI' })
    await testing.generate(1)

    const pool = await container.call('getpoolpair', [`${symbol}-DFI`])
    pairs[symbol].poolId = Number.parseInt(Object.keys(pool)[0])
  }

  // Prep 1000 DFI Token for testing
  await testing.token.dfi({ amount: 1000 })
  await testing.generate(1)
})

afterAll(async () => {
  await container.stop()
})

describe('dex.compositeSwap()', () => {
  it('should compositeSwap', async () => {
    await providers.randomizeEllipticPair()
    await container.waitForWalletBalanceGTE(1)

    await testing.poolpair.add({
      a: { symbol: 'PIG', amount: 10 },
      b: { symbol: 'DFI', amount: 100 }
    })
    await testing.poolpair.add({
      a: { symbol: 'DOG', amount: 50 },
      b: { symbol: 'DFI', amount: 100 }
    })
    await testing.generate(1)

    await providers.setupMocks() // required to move utxos

    const address = await providers.getAddress()
    const script = fromAddress(address, 'regtest')?.script as Script

    await testing.token.mint({ symbol: 'PIG', amount: 10 })
    await testing.generate(1)
    await testing.token.send({ symbol: 'PIG', amount: 10, address })
    await testing.generate(1)

    // Fund 10 DFI UTXO, allow provider able to collect 1
    await fundEllipticPair(container, providers.ellipticPair, 10)

    // Perform SWAP
    const txn = await builder.dex.compositeSwap({
      poolSwap: {
        fromScript: script,
        fromTokenId: pairs.PIG.tokenId,
        fromAmount: new BigNumber('1'),
        toScript: script,
        toTokenId: pairs.DOG.tokenId,
        maxPrice: new BigNumber('18446744073709551615.99999999') // max number possible for 16 bytes bignumber
      },
      pools: [
        { id: pairs.PIG.poolId },
        { id: pairs.DOG.poolId }
      ]
    }, script)

    // Ensure the created txn is correct.
    const outs = await sendTransaction(container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(address)

    // Ensure your balance is correct
    const account = await jsonRpc.account.getAccount(address)
    expect(account.length).toStrictEqual(2)
    expect(account).toContain('9.00000000@PIG')
    expect(account).toContain('4.16666668@DOG')

    // reflected on DEXes
    const pigPair = Object.values(await jsonRpc.poolpair.getPoolPair('PIG-DFI', true))
    expect(pigPair.length).toStrictEqual(1)
    expect(pigPair[0].reserveA).toStrictEqual(new BigNumber(11))

    const dogPair = Object.values(await jsonRpc.poolpair.getPoolPair('DOG-DFI', true))
    expect(dogPair.length).toStrictEqual(1)
    expect(dogPair[0].reserveA).toStrictEqual(new BigNumber(45.83333332))

    // Ensure you don't send all your balance away during poolswap
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)
  })

  it('should compositeSwap with acceptable max price', async () => {
    await providers.randomizeEllipticPair()
    await container.waitForWalletBalanceGTE(1)

    await testing.poolpair.add({
      a: { symbol: 'CAT', amount: 10 },
      b: { symbol: 'DFI', amount: 100 }
    })
    await testing.poolpair.add({
      a: { symbol: 'FISH', amount: 50 },
      b: { symbol: 'DFI', amount: 100 }
    })
    await testing.generate(1)

    await providers.setupMocks() // required to move utxos

    const address = await providers.getAddress()
    const script = fromAddress(address, 'regtest')?.script as Script

    await testing.token.mint({ symbol: 'CAT', amount: 10 })
    await testing.generate(1)
    await testing.token.send({ symbol: 'CAT', amount: 10, address })
    await testing.generate(1)

    // Fund 10 DFI UTXO, allow provider able to collect 1
    await fundEllipticPair(container, providers.ellipticPair, 10)

    // Perform SWAP
    const txn = await builder.dex.compositeSwap({
      poolSwap: {
        fromScript: script,
        fromTokenId: pairs.CAT.tokenId,
        fromAmount: new BigNumber('1'),
        toScript: script,
        toTokenId: pairs.FISH.tokenId,
        // CAT is 5x more valueable, anything beyond 0.2 (before consider slope) should be valid
        maxPrice: new BigNumber('0.5')
      },
      pools: [
        { id: pairs.CAT.poolId },
        { id: pairs.FISH.poolId }
      ]
    }, script)

    // Ensure the created txn is correct.
    const outs = await sendTransaction(container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(address)

    // Ensure your balance is correct
    const account = await jsonRpc.account.getAccount(address)
    expect(account.length).toStrictEqual(2)
    expect(account).toContain('9.00000000@CAT')
    expect(account).toContain('4.16666668@FISH')

    // reflected on DEXes
    const catPair = Object.values(await jsonRpc.poolpair.getPoolPair('CAT-DFI', true))
    expect(catPair.length).toStrictEqual(1)
    expect(catPair[0].reserveA).toStrictEqual(new BigNumber(11))

    const fishPair = Object.values(await jsonRpc.poolpair.getPoolPair('FISH-DFI', true))
    expect(fishPair.length).toStrictEqual(1)
    expect(fishPair[0].reserveA).toStrictEqual(new BigNumber(45.83333332))

    // Ensure you don't send all your balance away during poolswap
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)
  })

  it('should fail if path specified is not possible to achieve desired composite swap', async () => {
    // create another pair not composite swap-able
    const colAddr = await testing.generateAddress()
    await testing.token.dfi({ amount: 30000, address: colAddr })
    await testing.generate(1)
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' }
    ]
    const oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(), priceFeeds, { weightage: 1 })
    await testing.generate(1)
    await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '1@TSLA', currency: 'USD' },
        { tokenAmount: '1@DUSD', currency: 'USD' }
      ]
    })
    await testing.generate(1)
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.generate(1)
    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)
    await testing.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await testing.generate(1)
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(1),
      id: 'default'
    })
    await testing.generate(1)
    const vaultId = await testing.rpc.loan.createVault({
      ownerAddress: await testing.generateAddress(),
      loanSchemeId: 'default'
    })
    await testing.generate(1)
    await testing.rpc.loan.depositToVault({
      vaultId: vaultId, from: colAddr, amount: '30000@DFI'
    })
    await testing.generate(1)
    await testing.rpc.loan.takeLoan({
      vaultId: vaultId,
      to: colAddr,
      amounts: ['10000@TSLA', '10000@DUSD']
    })
    await testing.generate(1)

    const tsla = await container.call('gettoken', ['TSLA'])
    const tslaId = Number.parseInt(Object.keys(tsla)[0])
    const dusd = await container.call('gettoken', ['DUSD'])
    const dusdId = Number.parseInt(Object.keys(dusd)[0])

    await testing.poolpair.create({ tokenA: 'TSLA', tokenB: 'DUSD' })
    await testing.generate(1)

    // add liq, "lack of liquidity error come first regardless the conversion path is valid"
    await testing.poolpair.add({
      a: { symbol: 'PIG', amount: 10 },
      b: { symbol: 'DFI', amount: 100 }
    })
    await testing.poolpair.add({
      a: { symbol: 'TSLA', amount: 10 },
      b: { symbol: 'DUSD', amount: 100 }
    })
    await testing.generate(1)

    const pool = await container.call('getpoolpair', ['TSLA-DUSD'])
    const tslaPoolId = Number.parseInt(Object.keys(pool)[0])

    await providers.randomizeEllipticPair()
    await container.waitForWalletBalanceGTE(1)
    await providers.setupMocks()

    const address = await providers.getAddress()
    const script = fromAddress(address, 'regtest')?.script as Script
    await testing.token.mint({ symbol: 'PIG', amount: 10 })
    await testing.generate(1)
    await testing.token.send({ symbol: 'PIG', amount: 10, address })
    await testing.generate(1)

    // Fund 10 DFI UTXO, allow provider able to collect 1
    await fundEllipticPair(container, providers.ellipticPair, 10)

    // Perform SWAP
    const txn = await builder.dex.compositeSwap({
      poolSwap: {
        fromScript: script,
        fromTokenId: pairs.PIG.tokenId,
        fromAmount: new BigNumber('1'),
        toScript: script,
        toTokenId: tslaId,
        maxPrice: new BigNumber('18446744073709551615.99999999') // max number possible for 16 bytes bignumber
      },
      pools: [
        { id: pairs.PIG.poolId },
        { id: tslaPoolId }
      ]
    }, script)

    const promise = sendTransaction(container, txn)
    await expect(promise).rejects.toThrowError(DeFiDRpcError)
    await expect(promise).rejects.toThrowError(`PoolSwapTx: Error, input token ID (0) doesn't match pool tokens (${tslaId},${dusdId})`)
  })

  it('should fail for lack of liquidity in pool', async () => {
    // create another pair not composite swap-able
    await testing.token.create({ symbol: 'AMZN' })
    await testing.generate(1)
    const amzn = await container.call('gettoken', ['AMZN'])
    const amznId = Number.parseInt(Object.keys(amzn)[0])

    await testing.poolpair.create({ tokenA: 'AMZN', tokenB: 'DFI' })
    await testing.generate(1)

    const pool = await container.call('getpoolpair', ['AMZN-DFI'])
    const amznPoolId = Number.parseInt(Object.keys(pool)[0])

    await providers.randomizeEllipticPair()
    await container.waitForWalletBalanceGTE(1)
    await providers.setupMocks()

    const address = await providers.getAddress()
    const script = fromAddress(address, 'regtest')?.script as Script
    await testing.token.mint({ symbol: 'PIG', amount: 10 })
    await testing.generate(1)
    await testing.token.send({ symbol: 'PIG', amount: 10, address })
    await testing.generate(1)

    // Fund 10 DFI UTXO, allow provider able to collect 1
    await fundEllipticPair(container, providers.ellipticPair, 10)

    // Perform SWAP
    const txn = await builder.dex.compositeSwap({
      poolSwap: {
        fromScript: script,
        fromTokenId: pairs.PIG.tokenId,
        fromAmount: new BigNumber('1'),
        toScript: script,
        toTokenId: amznId,
        maxPrice: new BigNumber('18446744073709551615.99999999') // max number possible for 16 bytes bignumber
      },
      pools: [
        { id: pairs.PIG.poolId },
        { id: amznPoolId }
      ]
    }, script)

    const promise = sendTransaction(container, txn)
    await expect(promise).rejects.toThrowError(DeFiDRpcError)
    await expect(promise).rejects.toThrowError('Lack of liquidity')
  })
})
