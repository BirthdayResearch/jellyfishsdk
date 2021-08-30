import BigNumber from 'bignumber.js'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OP_CODES, PoolRemoveLiquidity } from '@defichain/jellyfish-transaction'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { addPoolLiquidity, createPoolPair, createToken, mintTokens } from '@defichain/testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import {
  findOut,
  fundEllipticPair,
  sendTransaction
} from '../test.utils'
import { Bech32, HASH160 } from '@defichain/jellyfish-crypto'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder
let jsonRpc: JsonRpcClient

let tokenId: number

let address: string
let amount: BigNumber

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())

  providers = await getProviders(container)

  await container.waitForWalletBalanceGTE(1)

  // Prep 10000 CAT Token for testing
  tokenId = await createToken(container, 'CAT')
  await mintTokens(container, 'CAT', { mintAmount: 10000 })
  await createPoolPair(container, 'DFI', 'CAT')

  // other wise the new DFI-CAT tokenId cannot be 2
  expect(tokenId).toStrictEqual(1)
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await providers.randomizeEllipticPair()
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

  await container.waitForWalletBalanceGTE(1)

  address = await providers.getAddress()
  amount = await addPoolLiquidity(container, {
    tokenA: 'DFI',
    amountA: 100,
    tokenB: 'CAT',
    amountB: 100,
    shareAddress: address
  })

  // Fund 1 DFI UTXOS for fee
  await fundEllipticPair(container, providers.ellipticPair, 1)
  await providers.setupMocks() // required to move utxos

  // Ensure starting balances
  await container.generate(1)
  const account = await jsonRpc.account.getAccount(await providers.getAddress())
  expect(account).toContain(`${amount.toFixed(8)}@DFI-CAT`)
})

describe('liqPool.removeLiquidity()', () => {
  it('should burn liquidity pair token, receive tokenA and tokenB', async () => {
    const destPubKey = await providers.ellipticPair.publicKey()
    const script = await providers.elliptic.script()

    const removeLiquidity: PoolRemoveLiquidity = {
      script,
      tokenId: 2,
      amount
    }

    const txn = await builder.liqPool.removeLiquidity(removeLiquidity, script)
    const outs = await sendTransaction(container, txn)
    expect(outs.length).toStrictEqual(2)

    const encoded: string = OP_CODES.OP_DEFI_TX_POOL_REMOVE_LIQUIDITY(removeLiquidity).asBuffer().toString('hex')
    // OP_RETURN + DfTx full buffer
    const expectedRedeemScript = `6a${encoded}`
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)

    // change
    const change = await findOut(outs, providers.elliptic.ellipticPair)
    expect(change.value).toBeLessThan(1)
    expect(change.value).toBeGreaterThan(1 - 0.001) // deducted fee
    expect(change.scriptPubKey.hex).toStrictEqual(`0014${HASH160(destPubKey).toString('hex')}`)
    expect(change.scriptPubKey.addresses[0]).toStrictEqual(Bech32.fromPubKey(destPubKey, 'bcrt'))

    // updated balance, receive invidual token
    const account = await jsonRpc.account.getAccount(await providers.getAddress())
    expect(account.length).toStrictEqual(2)

    const balances: Map<string, BigNumber> = new Map()
    account.forEach(tokenBalance => {
      const [bal, tokenSymbol] = tokenBalance.split('@')
      balances.set(tokenSymbol, new BigNumber(bal))
    })

    const dfiBal = balances.get('DFI')
    const catBal = balances.get('CAT')
    const lmBal = balances.get('DFI-CAT')

    expect(dfiBal?.gt(99.999)).toBeTruthy()
    expect(dfiBal?.lt(100)).toBeTruthy()
    expect(catBal?.gt(99.999)).toBeTruthy()
    expect(catBal?.lt(100)).toBeTruthy()
    expect(lmBal).toBeFalsy()
  })
})
