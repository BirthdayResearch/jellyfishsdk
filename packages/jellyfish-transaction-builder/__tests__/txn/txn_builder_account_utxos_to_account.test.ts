import BigNumber from 'bignumber.js'
import { Bech32, HASH160 } from '@defichain/jellyfish-crypto'
import { OP_CODES, UtxosToAccount } from '@defichain/jellyfish-transaction'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { findOut, fundEllipticPair, sendTransaction } from '../test.utils'
import { P2WPKH } from '@defichain/jellyfish-address'
import { RegTest } from '@defichain/jellyfish-network'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder
let jsonRpc: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  providers = await getProviders(container)
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
  jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await providers.randomizeEllipticPair()
  await container.waitForWalletBalanceGTE(101)

  // fund utxos balance
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 10) // 10
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 10) // 20

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

    expect(outs.length).toStrictEqual(2)
    const encoded: string = OP_CODES.OP_DEFI_TX_UTXOS_TO_ACCOUNT(utxosToAccount).asBuffer().toString('hex')
    // OP_RETURN + DfTx full buffer
    const expectedRedeemScript = `6a${encoded}`
    expect(outs[0].value).toStrictEqual(conversionAmount)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)

    expect(change.value).toBeLessThan(20 - conversionAmount)
    expect(change.value).toBeGreaterThan(20 - conversionAmount - 0.001)
    expect(change.scriptPubKey.hex).toStrictEqual(`0014${HASH160(destPubKey).toString('hex')}`)
    expect(change.scriptPubKey.addresses[0]).toStrictEqual(Bech32.fromPubKey(destPubKey, 'bcrt'))

    // minted token
    const account = await jsonRpc.account.getAccount(await providers.getAddress())
    expect(account.length).toStrictEqual(1)
    expect(account).toContain('12.34000000@DFI')
  })

  it('should be able to split output into multiple destination address', async () => {
    const destPubKey = await providers.ellipticPair.publicKey()
    const dest = await providers.elliptic.script()

    const dest1 = await container.getNewAddress()
    const dest1Addr = P2WPKH.fromAddress(RegTest, dest1, P2WPKH)
    const dest2 = await container.getNewAddress()
    const dest2Addr = P2WPKH.fromAddress(RegTest, dest2, P2WPKH)

    const conversionAmount = 12.34

    const utxosToAccount: UtxosToAccount = {
      to: [{
        balances: [{
          token: 0x00,
          amount: new BigNumber(10)
        }],
        script: dest1Addr.getScript()
      }, {
        balances: [{
          token: 0x00,
          amount: new BigNumber(2.34)
        }],
        script: dest2Addr.getScript()
      }]
    }

    const txn = await builder.account.utxosToAccount(utxosToAccount, dest)

    const outs = await sendTransaction(container, txn)
    const change = await findOut(outs, providers.elliptic.ellipticPair)

    expect(outs.length).toStrictEqual(2)
    const encoded: string = OP_CODES.OP_DEFI_TX_UTXOS_TO_ACCOUNT(utxosToAccount).asBuffer().toString('hex')
    // OP_RETURN + DfTx full buffer
    const expectedRedeemScript = `6a${encoded}`
    expect(outs[0].value).toStrictEqual(conversionAmount)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)

    expect(change.value).toBeLessThan(20 - conversionAmount)
    expect(change.value).toBeGreaterThan(20 - conversionAmount - 0.001)
    expect(change.scriptPubKey.hex).toStrictEqual(`0014${HASH160(destPubKey).toString('hex')}`)
    expect(change.scriptPubKey.addresses[0]).toStrictEqual(Bech32.fromPubKey(destPubKey, 'bcrt'))

    // minted token (dest 1)
    const account1 = await jsonRpc.account.getAccount(dest1)
    expect(account1.length).toStrictEqual(1)
    expect(account1).toContain('10.00000000@DFI')

    // minted token (dest 2)
    const account2 = await jsonRpc.account.getAccount(dest2)
    expect(account2.length).toStrictEqual(1)
    expect(account2).toContain('2.34000000@DFI')
  })

  it('should reject invalid utxosToAccount arg - less than 1 token in balance destination', async () => {
    const dest = await providers.elliptic.script()
    await expect(builder.account.utxosToAccount({
      to: []
    }, dest)).rejects.toThrow('Conversion output `utxosToAccount.to` array length must be greater than or equal to one')
  })

  it('should reject invalid utxosToAccount arg - more than 1 token balance object in single destination', async () => {
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
    }, dest)).rejects.toThrow('Each `utxosToAccount.to` array `balances` array length must be one')
  })

  it('should reject invalid utxosToAccount arg - any output token is not zero (DFI)', async () => {
    const dest = await providers.elliptic.script()
    await expect(builder.account.utxosToAccount({
      to: [{
        balances: [{
          token: 0x00, // valid dfi output
          amount: new BigNumber(10)
        }],
        script: dest
      }, {
        balances: [{
          token: 0x01, // non dfi output
          amount: new BigNumber(10)
        }],
        script: dest
      }]
    }, dest)).rejects.toThrow('Each `utxosToAccount.to` array `balances[0].token` must be 0x00, only DFI supported')
  })
})
