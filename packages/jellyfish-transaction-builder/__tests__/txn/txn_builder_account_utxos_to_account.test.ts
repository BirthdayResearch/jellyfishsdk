import BigNumber from 'bignumber.js'
import { Bech32, HASH160 } from '@defichain/jellyfish-crypto'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { UtxosToAccount } from '@defichain/jellyfish-transaction/src/script/defi/dftx_account'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import {
  findOut,
  fundEllipticPair,
  sendTransaction
} from '../test.utils'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder
let jsonRpc: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  providers = await getProviders(container)
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)
  jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await providers.randomizeEllipticPair()
  await container.waitForWalletBalanceGTE(101)

  // fund utxos balance
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 1.1) // 1.1
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 5.5) // 6.6
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 10.566) // 17.166
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 15.51345) // 32.67945
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 20) // 52.67945
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 37.98) // 90.65945
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 9.34055) // 100

  await providers.setupMocks()
})

describe('account.utxosToAccount()', () => {
  it('should receive token and change', async () => {
    const destPubKey = await providers.ellipticPair.publicKey()
    const dest = await providers.elliptic.script()

    const conversionAmount = 12.34

    const utxosToAccount: UtxosToAccount = {
      to: [{
        balances: [{
          token: 0x00,
          amount: new BigNumber(conversionAmount)
        }],
        script: dest
      }]
    }

    const txn = await builder.account.utxosToAccount(utxosToAccount, dest)

    const outs = await sendTransaction(container, txn)
    const change = await findOut(outs, providers.elliptic.ellipticPair)

    expect(outs.length).toEqual(2)
    const encoded: string = OP_CODES.OP_DEFI_TX_UTXOS_TO_ACCOUNT(utxosToAccount).asBuffer().toString('hex')
    // OP_RETURN + utxos full buffer
    const expectedRedeemScript = `6a${encoded}`
    expect(outs[0].value).toEqual(conversionAmount)
    expect(outs[0].scriptPubKey.hex).toEqual(expectedRedeemScript)

    expect(change.value).toBeLessThan(100 - conversionAmount)
    expect(change.value).toBeGreaterThan(100 - conversionAmount - 0.001)
    expect(change.scriptPubKey.hex).toBe(`0014${HASH160(destPubKey).toString('hex')}`)
    expect(change.scriptPubKey.addresses[0]).toBe(Bech32.fromPubKey(destPubKey, 'bcrt'))

    // minted token
    const account = await jsonRpc.account.getAccount(await providers.getAddress())
    expect(account.length).toStrictEqual(1)
    expect(account).toContain('12.34000000@DFI')
  })

  it('should reject invalid utxosToAccount arg - more than 1 token balances object', async () => {
    const dest = await providers.elliptic.script()
    await expect(builder.account.utxosToAccount({
      to: [{
        balances: [{
          token: 0x00,
          amount: new BigNumber(10)
        }],
        script: dest
      }, {
        balances: [{
          token: 0x00,
          amount: new BigNumber(10)
        }],
        script: dest
      }]
    }, dest)).rejects.toThrow('Conversion output `utxosToAccount.to` array length must be one')
  })

  // TODO: support multiple TokenBalance in `utxosToAccount.to` https://github.com/DeFiCh/jellyfish/issues/270
  it('should reject invalid utxosToAccount arg - more than 1 token in balance', async () => {
    const dest = await providers.elliptic.script()
    await expect(builder.account.utxosToAccount({
      to: [{
        balances: [{
          token: 0x00,
          amount: new BigNumber(10)
        }, {
          token: 0x00,
          amount: new BigNumber(10)
        }],
        script: dest
      }]
    }, dest)).rejects.toThrow('Conversion output `utxosToAccount.to[0].balances` array length must be one')
  })

  it('should reject invalid utxosToAccount arg - output token is not zero (DFI)', async () => {
    const dest = await providers.elliptic.script()
    await expect(builder.account.utxosToAccount({
      to: [{
        balances: [{
          token: 0x01,
          amount: new BigNumber(10)
        }],
        script: dest
      }]
    }, dest)).rejects.toThrow('`utxosToAccount.to[0].balances[0].token` must be 0x00, only DFI support')
  })
})
