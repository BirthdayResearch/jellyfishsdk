import BigNumber from 'bignumber.js'
import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTest } from '@defichain/jellyfish-network'
import { Testing } from '@defichain/jellyfish-testing'

const container = new MasterNodeRegTestContainer()
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
  DOG: { tokenId: Number.NaN, poolId: Number.NaN }
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

    await testing.token.mint({ symbol, amount: 1000000 })
    await testing.poolpair.create({ tokenA: symbol, tokenB: 'DFI', commission: 0.002 })
    await testing.generate(1)

    const pool = await container.call('getpoolpair', [`${symbol}-DFI`])
    pairs[symbol].poolId = Number.parseInt(Object.keys(pool)[0])

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/poolpairs/${pairs[symbol].poolId}/token_b_fee_pct`]: '0.15',
        [`v0/poolpairs/${pairs[symbol].poolId}/token_b_fee_direction`]: 'both'
      }
    })
    await container.generate(1)
  }

  // Prep 1000 DFI Token for testing
  await testing.token.dfi({ amount: 300000 })
  await testing.generate(1)
})

afterAll(async () => {
  await container.stop()
})

it('should not compositeSwap with maxPrice accounting for commission and dexFees', async () => {
  await providers.randomizeEllipticPair()
  await container.waitForWalletBalanceGTE(1)

  await testing.poolpair.add({
    a: { symbol: 'PIG', amount: 100000 },
    b: { symbol: 'DFI', amount: 100000 }
  })
  await testing.poolpair.add({
    a: { symbol: 'CAT', amount: 100000 },
    b: { symbol: 'DFI', amount: 100000 }
  })
  await testing.generate(1)

  await providers.setupMocks() // required to move utxos

  const address = await providers.getAddress()
  const script = await providers.elliptic.script()

  await testing.token.send({ symbol: 'PIG', amount: 1, address })
  await testing.generate(1)

  // Fund 10 DFI UTXO, allow provider able to collect 1
  await fundEllipticPair(container, providers.ellipticPair, 10)

   const inputPIGAmount = new BigNumber(1);
  const txn = await builder.dex.compositeSwap({
    poolSwap: {
      fromScript: script,
      fromTokenId: pairs.PIG.tokenId,
      fromAmount: inputPIGAmount,
      toScript: script,
      toTokenId: pairs.CAT.tokenId,
      maxPrice: new BigNumber('1.2')
    },
    pools: [
      { id: pairs.PIG.poolId },
      { id: pairs.CAT.poolId }
    ]
  }, script)

  // manual calculations and verify
  // PIG -> DFI
  const inputPIGAfterFeeIn = inputPIGAmount
  // (PIG 1000: DFI 1000)
  const ammSwappedAmountInDFI = new BigNumber(1000).minus(new BigNumber(1000 * 1000).dividedBy(new BigNumber(inputPIGAfterFeeIn).plus(1000))).multipliedBy(100000000).minus(1).dividedBy(100000000).decimalPlaces(8, BigNumber.ROUND_CEIL)
  const intermediateSwappedAmountAfterFeeOut = ammSwappedAmountInDFI.minus(ammSwappedAmountInDFI.multipliedBy(0.15))

  // DFI -> CAT
  const inputDFIAfterFeeIn = intermediateSwappedAmountAfterFeeOut.minus(intermediateSwappedAmountAfterFeeOut.multipliedBy(0.15))
  const ammSwappedAmountInCAT = new BigNumber(1000).minus(new BigNumber(1000 * 1000).dividedBy(new BigNumber(inputDFIAfterFeeIn).plus(1000))).multipliedBy(100000000).minus(1).dividedBy(100000000).decimalPlaces(8, BigNumber.ROUND_CEIL)
  const finalSwappedAmountAfterFeeOut = ammSwappedAmountInCAT;
  expect(inputPIGAmount.dividedBy(finalSwappedAmountAfterFeeOut).gt(1.2)).toBeTruthy()

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrowError(DeFiDRpcError)
  await expect(promise).rejects.toThrowError('PoolSwapTx: Price is higher than indicated')

  // Ensure your balance is correct
  const account = await jsonRpc.account.getAccount(address)
  expect(account).toStrictEqual(['1.00000000@PIG'])
})
