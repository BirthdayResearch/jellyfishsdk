import BigNumber from 'bignumber.js'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { AccountToAccount } from '@defichain/jellyfish-transaction/dist/script/defi/dftx_account'
import { P2WPKH } from '@defichain/jellyfish-address'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createToken, mintTokens, sendTokensToAddress, utxosToAccount } from '@defichain/testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import {
  findOut,
  fundEllipticPair,
  sendTransaction,
  sendTransactionNoGenerate
} from '../test.utils'
import { Bech32, HASH160 } from '@defichain/jellyfish-crypto'
import { RegTest } from '@defichain/jellyfish-network'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder
let jsonRpc: JsonRpcClient

let secondTokenId: number

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())

  providers = await getProviders(container)

  // Prep 1000 DFI Token for testing
  await container.waitForWalletBalanceGTE(1001)

  secondTokenId = await createToken(container, 'CAT')
  await mintTokens(container, 'CAT', { mintAmount: 10000 })

  // Ensure token created and minted can be sent
  await container.generate(1)
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

  // Fund 1000 CAT TOKEN
  await sendTokensToAddress(container, await providers.getAddress(), 1000, 'CAT')
  await container.generate(1)

  // Ensure starting balance
  const account = await jsonRpc.account.getAccount(await providers.getAddress())
  expect(account).toContain('10.00000000@DFI')
  expect(account).toContain('1000.00000000@CAT')

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

  it('should be able to transfer multiple token type', async () => {
    const newAddress = await container.getNewAddress()

    // output token address
    const newP2wpkh = P2WPKH.fromAddress(RegTest, newAddress, P2WPKH)

    const destPubKey = await providers.ellipticPair.publicKey()
    const script = await providers.elliptic.script()

    const dfiAmount = 2.34
    const catAmount = 63.48

    const accountToAccount: AccountToAccount = {
      from: script,
      to: [{
        script: newP2wpkh.getScript(),
        balances: [{
          token: 0,
          amount: new BigNumber(dfiAmount) // balance remaining in token
        }, {
          token: secondTokenId,
          amount: new BigNumber(catAmount) // balance remaining in token
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
    expect(account).toContain('936.52000000@CAT')

    // minted token
    const recipientAccount = await jsonRpc.account.getAccount(newAddress)
    expect(recipientAccount).toContain('2.34000000@DFI')
    expect(recipientAccount).toContain('63.48000000@CAT')
  })

  it('should be able to transfer to multiple destination address', async () => {
    const destOneAddress = await container.getNewAddress()
    const destTwoAddress = await container.getNewAddress()

    // output token addresses
    const destOneP2wpkh = P2WPKH.fromAddress(RegTest, destOneAddress, P2WPKH)
    const destTwoP2wpkh = P2WPKH.fromAddress(RegTest, destTwoAddress, P2WPKH)

    const destPubKey = await providers.ellipticPair.publicKey()
    const script = await providers.elliptic.script()

    const destOneAmount = 2.34
    const destOneCatAmount = 77.77
    const destTwoCatAmount = 63.48

    const accountToAccount: AccountToAccount = {
      from: script,
      to: [{
        script: destOneP2wpkh.getScript(),
        balances: [{
          token: 0,
          amount: new BigNumber(destOneAmount)
        }, {
          token: secondTokenId,
          amount: new BigNumber(destOneCatAmount)
        }]
      }, {
        script: destTwoP2wpkh.getScript(),
        balances: [{
          token: secondTokenId,
          amount: new BigNumber(destTwoCatAmount)
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
    expect(account).toContain('858.75000000@CAT')

    // minted token
    const recipientOneAccount = await jsonRpc.account.getAccount(destOneAddress)
    expect(recipientOneAccount.length).toStrictEqual(2)
    expect(recipientOneAccount).toContain('2.34000000@DFI')
    expect(recipientOneAccount).toContain('77.77000000@CAT')

    const recipientTwoAccount = await jsonRpc.account.getAccount(destTwoAddress)
    expect(recipientTwoAccount.length).toStrictEqual(1)
    expect(recipientTwoAccount).toContain('63.48000000@CAT')
  })

  it('should be able to send after exhausting Auth UTXOs', async () => {
    const newAddress = await container.getNewAddress()

    // output token address
    const newP2wpkh = P2WPKH.fromAddress(RegTest, newAddress, P2WPKH)

    const script = await providers.elliptic.script()

    const conversionAmount = 1.0
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

    // Send 3 Dftx within one block (Without generating a block in between transactions)
    await sendTransactionNoGenerate(container,
      await builder.account.accountToAccount(accountToAccount, script))

    await sendTransactionNoGenerate(container,
      await builder.account.accountToAccount(accountToAccount, script))

    await sendTransactionNoGenerate(container,
      await builder.account.accountToAccount(accountToAccount, script))

    // Generate the block
    await container.generate(1)

    // burnt token
    const account = await jsonRpc.account.getAccount(await providers.getAddress())
    expect(account).toContain('7.00000000@DFI')

    // minted token
    const recipientAccount = await jsonRpc.account.getAccount(newAddress)
    expect(recipientAccount).toContain('3.00000000@DFI')
  })
})
