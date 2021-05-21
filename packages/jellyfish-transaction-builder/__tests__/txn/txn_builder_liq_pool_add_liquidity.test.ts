import BigNumber from 'bignumber.js'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createPoolPair, createToken, mintTokens, sendTokensToAddress, utxosToAccount } from '@defichain/testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import {
  findOut,
  fundEllipticPair,
  sendTransaction
} from '../test.utils'
import { Bech32, HASH160 } from '@defichain/jellyfish-crypto'
import { PoolAddLiquidity } from '@defichain/jellyfish-transaction/dist/script/defi/dftx_pool'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder
let jsonRpc: JsonRpcClient

let tokenId: number

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

  // Prep 1000 DFI UTXOS for testing (for utxos to account)
  await container.waitForWalletBalanceGTE(1001)
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await providers.randomizeEllipticPair()
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

  // Fund 100 DFI TOKEN
  await fundEllipticPair(container, providers.ellipticPair, 100)
  await providers.setupMocks() // required to move utxos
  await utxosToAccount(container, 100, { address: await providers.getAddress() })

  // Fund 1000 CAT TOKEN
  await sendTokensToAddress(container, await providers.getAddress(), 1000, 'CAT')
  await container.generate(1)

  // Ensure starting balance
  const account = await jsonRpc.account.getAccount(await providers.getAddress())
  expect(account).toContain('100.00000000@DFI')
  expect(account).toContain('1000.00000000@CAT')

  // Fund 1 DFI UTXOS for fee
  await fundEllipticPair(container, providers.ellipticPair, 1)
})

describe('liqPool.addLiquidity()', () => {
  it('should spend tokenA and tokenB, receive liquidity pair token', async () => {
    const destPubKey = await providers.ellipticPair.publicKey()
    const script = await providers.elliptic.script()

    const tokenAAmount = 2.34 // amount converted into utxos
    const tokenBAmount = 90.87 // amount converted into utxos
    const addLiquidity: PoolAddLiquidity = {
      from: [{
        script,
        balances: [{
          token: 0,
          amount: new BigNumber(tokenAAmount) // balance remaining in token
        }, {
          token: tokenId,
          amount: new BigNumber(tokenBAmount) // balance remaining in token
        }]
      }],
      shareAddress: script
    }

    const txn = await builder.liqPool.addLiquidity(addLiquidity, script)
    const outs = await sendTransaction(container, txn)

    expect(outs.length).toEqual(2)
    const encoded: string = OP_CODES.OP_DEFI_TX_POOL_ADD_LIQUIDITY(addLiquidity).asBuffer().toString('hex')
    // OP_RETURN + DfTx full buffer
    const expectedRedeemScript = `6a${encoded}`
    expect(outs[0].value).toEqual(0)
    expect(outs[0].scriptPubKey.hex).toEqual(expectedRedeemScript)

    // change
    const change = await findOut(outs, providers.elliptic.ellipticPair)
    expect(change.value).toBeLessThan(1)
    expect(change.value).toBeGreaterThan(1 - 0.001) // deducted fee
    expect(change.scriptPubKey.hex).toBe(`0014${HASH160(destPubKey).toString('hex')}`)
    expect(change.scriptPubKey.addresses[0]).toBe(Bech32.fromPubKey(destPubKey, 'bcrt'))

    // updated balance
    const account = await jsonRpc.account.getAccount(await providers.getAddress())
    expect(account.length).toStrictEqual(3)
    expect(account).toContain('97.66000000@DFI')
    expect(account).toContain('909.13000000@CAT')
    expect(account).toContain('@DFI-CAT') // amount subjected to rate
  })
})
