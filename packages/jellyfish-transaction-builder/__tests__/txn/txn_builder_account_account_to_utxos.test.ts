import BigNumber from 'bignumber.js'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { AccountToUtxos } from '@defichain/jellyfish-transaction/dist/script/defi/dftx_account'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { utxosToAccount } from '@defichain/testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import {
  findOuts,
  fundEllipticPair,
  sendTransaction
} from '../test.utils'
import { Bech32, HASH160 } from '@defichain/jellyfish-crypto'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder
let jsonRpc: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())
  providers = await getProviders(container)

  // Prep 1000 DFI UTXOS for testing
  await container.waitForWalletBalanceGTE(1001)
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await providers.randomizeEllipticPair()
  await container.waitForWalletBalanceGTE(11.1)
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

  // Fund 10 DFI TOKEN
  await providers.setupMocks() // required to move utxos
  await utxosToAccount(container, 10, { address: await providers.getAddress() })

  // Ensure starting balance
  const account = await jsonRpc.account.getAccount(await providers.getAddress())
  expect(account).toContain('10.00000000@DFI')

  // Fund 1 DFI utxos for fee
  await fundEllipticPair(container, providers.ellipticPair, 1)
})

describe('account.accountToUtxos()', () => {
  it('should receive token and change', async () => {
    const destPubKey = await providers.ellipticPair.publicKey()
    const script = await providers.elliptic.script()

    const conversionAmount = 2.34 // amount converted into utxos
    const accountToUtxos: AccountToUtxos = {
      from: script,
      balances: [{
        token: 0,
        amount: new BigNumber(conversionAmount)
      }],
      mintingOutputsStart: 2
    }

    const txn = await builder.account.accountToUtxos(accountToUtxos, script)

    const outs = await sendTransaction(container, txn)

    expect(outs.length).toEqual(3)
    const encoded: string = OP_CODES.OP_DEFI_TX_ACCOUNT_TO_UTXOS(accountToUtxos).asBuffer().toString('hex')
    // OP_RETURN + DfTx full buffer
    const expectedRedeemScript = `6a${encoded}`
    expect(outs[0].value).toEqual(0)
    expect(outs[0].scriptPubKey.hex).toEqual(expectedRedeemScript)
    expect(outs[0].tokenId).toEqual(0)

    const txOuts = await findOuts(outs, providers.elliptic.ellipticPair)
    expect(txOuts.length).toStrictEqual(2)

    const [change, minted] = txOuts
    const expectedUtxosRedeemScript = `0014${HASH160(destPubKey).toString('hex')}`
    const expectedOutAddress = Bech32.fromPubKey(destPubKey, 'bcrt')

    // change returned
    expect(change.value).toBeLessThan(1)
    expect(change.value).toBeGreaterThan(1 - 0.001) // deducted fee
    expect(change.scriptPubKey.hex).toBe(expectedUtxosRedeemScript)
    expect(change.scriptPubKey.addresses[0]).toBe(expectedOutAddress)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(expectedOutAddress)

    // minted utxos
    expect(minted.value).toStrictEqual(conversionAmount)
    expect(minted.scriptPubKey.hex).toBe(expectedUtxosRedeemScript)
    expect(minted.scriptPubKey.addresses[0]).toBe(expectedOutAddress)
    expect(outs[2].scriptPubKey.addresses[0]).toStrictEqual(expectedOutAddress)

    // burnt token
    const account = await jsonRpc.account.getAccount(await providers.getAddress())
    expect(account).toContain('7.66000000@DFI')
  })

  it('should reject invalid accountToUtxos arg - more than 1 token in balance', async () => {
    const script = await providers.elliptic.script()
    await expect(builder.account.accountToUtxos({
      from: script,
      balances: [{
        token: 0,
        amount: new BigNumber(10)
      }, {
        token: 1,
        amount: new BigNumber(10)
      }],
      mintingOutputsStart: 2
    }, script)).rejects.toThrow('Conversion output `accountToUtxos.balances` array length must be one')
  })

  it('should reject invalid accountToUtxos arg - output token is not zero (DFI)', async () => {
    const script = await providers.elliptic.script()
    await expect(builder.account.accountToUtxos({
      from: script,
      balances: [{
        token: 1,
        amount: new BigNumber(10)
      }],
      mintingOutputsStart: 2
    }, script)).rejects.toThrow('`accountToUtxos.balances[0].token` must be 0x00, only DFI support')
  })

  it('should reject invalid accountToUtxos arg - `mintingOutputsStart` is not two', async () => {
    const script = await providers.elliptic.script()
    await expect(builder.account.accountToUtxos({
      from: script,
      balances: [{
        token: 0,
        amount: new BigNumber(10)
      }],
      mintingOutputsStart: 1
    }, script)).rejects.toThrow('`accountToUtxos.mintingOutputsStart` must be `2` for simplicity')
  })
})
