import BigNumber from 'bignumber.js'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { findOut, fundEllipticPair, sendTransaction } from '../test.utils'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTest } from '@defichain/jellyfish-network'
import { Testing } from '@defichain/jellyfish-testing'
import { P2WPKH } from '@defichain/jellyfish-address'
import { AccountToAccount, OP_CODES } from '@defichain/jellyfish-transaction'
import { Bech32, HASH160 } from '@defichain/jellyfish-crypto'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'

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
  PIG: {
    tokenId: Number.NaN,
    poolId: Number.NaN
  },
  CAT: {
    tokenId: Number.NaN,
    poolId: Number.NaN
  },
  DOG: {
    tokenId: Number.NaN,
    poolId: Number.NaN
  },
  GOAT: {
    tokenId: Number.NaN,
    poolId: Number.NaN
  }
}

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())

  providers = await getProviders(container)
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
  testing = Testing.create(container)

  for (let i = 0; i < 64; i++) {
    await testing.token.create({ symbol: `A${i}` })
    await testing.token.create({ symbol: `B${i}` })
    await testing.generate(1)
  }

  // creating DFI-* pool pairs and funding liquidity
  for (const symbol of Object.keys(pairs)) {
    await testing.token.create({ symbol })
    await testing.generate(1)

    const token = await testing.rpc.token.getToken(symbol)
    pairs[symbol].tokenId = Number.parseInt(Object.keys(token)[0])

    await testing.token.mint({
      symbol,
      amount: 10000
    })
    await testing.poolpair.create({
      tokenA: symbol,
      tokenB: 'DFI'
    })
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

it('should compositeSwap', async () => {
  await providers.randomizeEllipticPair()
  await container.waitForWalletBalanceGTE(1)

  await testing.poolpair.add({
    a: {
      symbol: 'PIG',
      amount: 10
    },
    b: {
      symbol: 'DFI',
      amount: 100
    }
  })
  await testing.poolpair.add({
    a: {
      symbol: 'DOG',
      amount: 50
    },
    b: {
      symbol: 'DFI',
      amount: 100
    }
  })
  await testing.generate(1)

  await providers.setupMocks() // required to move utxos

  const address = await providers.getAddress()

  const script = await providers.elliptic.script()

  await testing.token.mint({
    symbol: 'PIG',
    amount: 10
  })
  await testing.generate(1)
  await testing.token.send({
    symbol: 'PIG',
    amount: 10,
    address
  })
  await testing.generate(1)

  // Fund 10 DFI UTXO, allow provider able to collect 1
  await fundEllipticPair(container, providers.ellipticPair, 10)

  // simulate compositeSwap
  const intermediateDFISwapAmount = new BigNumber(100).minus(new BigNumber(100 * 10).dividedBy(new BigNumber(10 + 1))).multipliedBy(100000000).minus(1).dividedBy(100000000).decimalPlaces(8, BigNumber.ROUND_CEIL)
  const dogSwapAmount = new BigNumber(50).minus(new BigNumber(50 * 100).dividedBy(new BigNumber(100).plus(intermediateDFISwapAmount))).multipliedBy(100000000).minus(1).dividedBy(100000000).decimalPlaces(8, BigNumber.ROUND_CEIL)

  const pigReserveAfter = new BigNumber(10 + 1)
  const dogReserveAfter = new BigNumber(50).minus(dogSwapAmount)

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

  // Ensure your balance is correct
  const account = await jsonRpc.account.getAccount(address)
  expect(account.length).toStrictEqual(2)
  expect(account).toContain('9.00000000@PIG')
  expect(account).toContain(`${dogSwapAmount.toFixed(8)}@DOG`)

  // reflected on DEXes
  const pigPair = Object.values(await jsonRpc.poolpair.getPoolPair('PIG-DFI', true))
  expect(pigPair.length).toStrictEqual(1)
  expect(pigPair[0].reserveA).toStrictEqual(pigReserveAfter)

  const dogPair = Object.values(await jsonRpc.poolpair.getPoolPair('DOG-DFI', true))
  expect(dogPair.length).toStrictEqual(1)
  expect(dogPair[0].reserveA).toStrictEqual(dogReserveAfter)

  // Ensure you don't send all your balance away during poolswap
  const prevouts = await providers.prevout.all()
  expect(prevouts.length).toStrictEqual(1)
  expect(prevouts[0].value.toNumber()).toBeLessThan(10)
  expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)
})

it('should poolSwap', async () => {
  providers.randomizeEllipticPair()
  await container.waitForWalletBalanceGTE(1)
  await testing.poolpair.add({
    a: {
      symbol: 'GOAT',
      amount: 10000
    },
    b: {
      symbol: 'DFI',
      amount: 20
    }
  })

  await providers.setupMocks()
  const address = await providers.getAddress()
  const script = await providers.elliptic.script()

  await testing.token.send({
    symbol: 'DFI',
    amount: 10,
    address
  })
  await testing.generate(1)
  await fundEllipticPair(container, providers.ellipticPair, 10)

  const txn = await builder.dex.poolSwap({
    fromScript: script,
    fromTokenId: 0,
    fromAmount: new BigNumber('0.01'),
    toScript: script,
    toTokenId: pairs.GOAT.tokenId,
    maxPrice: new BigNumber('10000000.25012506')
  }, script)
  const promise = sendTransaction(container, txn)
  await expect(promise).resolves.not.toThrow()

  // Ensure your balance is correct
  const account = await jsonRpc.account.getAccount(address)
  expect(account.length).toStrictEqual(2)
  expect(account).toContain('9.99000000@DFI')
  expect(account).toContain('4.99750124@GOAT')
})

it('should accountToAccount', async () => {
  providers.randomizeEllipticPair()
  const script = await providers.elliptic.script()
  await testing.token.send({
    symbol: 'PIG',
    amount: 110,
    address: await providers.getAddress()
  })
  await testing.generate(1)

  await providers.setupMocks()
  await fundEllipticPair(container, providers.ellipticPair, 1)

  const newAddress = await container.getNewAddress()
  const newP2wpkh = P2WPKH.fromAddress(RegTest, newAddress, P2WPKH)
  const accountToAccount: AccountToAccount = {
    from: await providers.elliptic.script(),
    to: [{
      script: newP2wpkh.getScript(),
      balances: [{
        token: pairs.PIG.tokenId,
        amount: new BigNumber(100.99)
      }]
    }]
  }

  const txn = await builder.account.accountToAccount(accountToAccount, script)
  const outs = await sendTransaction(container, txn)
  await testing.generate(1)

  expect(outs.length).toStrictEqual(2)
  const encoded: string = OP_CODES.OP_DEFI_TX_ACCOUNT_TO_ACCOUNT(accountToAccount).asBuffer().toString('hex')
  // OP_RETURN + DfTx full buffer
  const expectedRedeemScript = `6a${encoded}`
  expect(outs[0].value).toStrictEqual(0)
  expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
  expect(outs[0].tokenId).toStrictEqual(0)

  // change
  const change = await findOut(outs, providers.elliptic.ellipticPair)
  expect(change.value).toBeLessThan(1)
  expect(change.value).toBeGreaterThan(1 - 0.001) // deducted fee
  const destPubKey = await providers.ellipticPair.publicKey()
  expect(change.scriptPubKey.hex).toStrictEqual(`0014${HASH160(destPubKey).toString('hex')}`)
  expect(change.scriptPubKey.addresses[0]).toStrictEqual(Bech32.fromPubKey(destPubKey, 'bcrt'))

  const account = await jsonRpc.account.getAccount(await providers.getAddress())
  expect(account).toContain('9.01000000@PIG')

  const recipientAccount = await jsonRpc.account.getAccount(newAddress)
  expect(recipientAccount).toContain('100.99000000@PIG')
})
