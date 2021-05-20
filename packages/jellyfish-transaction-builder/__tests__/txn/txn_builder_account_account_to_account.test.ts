import BigNumber from 'bignumber.js'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { AccountToAccount } from '@defichain/jellyfish-transaction/dist/script/defi/dftx_account'
import { P2WPKH } from '@defichain/jellyfish-address'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { utxosToAccount } from '@defichain/testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import {
  findOut,
  fundEllipticPair,
  sendTransaction
} from '../test.utils'
import { Bech32, HASH160 } from '@defichain/jellyfish-crypto'
import { RegTest } from '@defichain/jellyfish-network'

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

  // Prep 1000 DFI Token for testing
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
  await fundEllipticPair(container, providers.ellipticPair, 10)
  await providers.setupMocks() // required to move utxos
  await utxosToAccount(container, 10, { address: await providers.getAddress() })

  // Ensure starting balance
  const account = await jsonRpc.account.getAccount(await providers.getAddress())
  expect(account).toContain('10.00000000@DFI')

  // Fund 1 more DFI utxos for fee
  await fundEllipticPair(container, providers.ellipticPair, 1)
  await container.waitForWalletBalanceGTE(1)
})

describe('account.accountToAccount()', () => {
  it('should receive token and change', async () => {
    const newAddress = await container.getNewAddress()

    // output token address
    const newP2wpkh = P2WPKH.fromAddress(RegTest, newAddress, P2WPKH)

    const destPubKey = await providers.ellipticPair.publicKey()
    const script = await providers.elliptic.script()

    const conversionAmount = 2.34 // amount converted into utxos
    const accountToAccount: AccountToAccount = {
      from: script,
      to: [{
        script: newP2wpkh.getScript(),
        balances: [{
          token: 0,
          amount: new BigNumber(conversionAmount) // balance remaining in token
        }]
      }]
    }

    const txn = await builder.account.accountToAccount(accountToAccount, script)
    const outs = await sendTransaction(container, txn)

    expect(outs.length).toEqual(2)
    const encoded: string = OP_CODES.OP_DEFI_TX_ACCOUNT_TO_ACCOUNT(accountToAccount).asBuffer().toString('hex')
    // OP_RETURN + DfTx full buffer
    const expectedRedeemScript = `6a${encoded}`
    expect(outs[0].value).toEqual(0)
    expect(outs[0].scriptPubKey.hex).toEqual(expectedRedeemScript)
    expect(outs[0].tokenId).toEqual(0)

    // change
    const change = await findOut(outs, providers.elliptic.ellipticPair)
    expect(change.value).toBeLessThan(1)
    expect(change.value).toBeGreaterThan(1 - 0.001) // deducted fee
    expect(change.scriptPubKey.hex).toBe(`0014${HASH160(destPubKey).toString('hex')}`)
    expect(change.scriptPubKey.addresses[0]).toBe(Bech32.fromPubKey(destPubKey, 'bcrt'))

    // burnt token
    const account = await jsonRpc.account.getAccount(await providers.getAddress())
    expect(account).toContain('7.66000000@DFI')

    // minted token
    const recipientAccount = await jsonRpc.account.getAccount(newAddress)
    expect(recipientAccount).toContain('2.34000000@DFI')
  })
})
