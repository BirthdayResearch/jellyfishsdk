import BigNumber from 'bignumber.js'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTest } from '@defichain/jellyfish-network'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { P2WPKH } from '@defichain/jellyfish-address'
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
  await providers.setupMocks() // required to move utxos
  await utxosToAccount(container, 100, { address: await providers.getAddress() })

  // Fund 1000 CAT TOKEN
  await sendTokensToAddress(container, await providers.getAddress(), 1000, 'CAT')
  await container.generate(1)

  // Ensure starting balance
  const account = await jsonRpc.account.getAccount(await providers.getAddress())
  expect(account).toContain('100.00000000@DFI')
  expect(account).toContain('1000.00000000@CAT')

  // Ensure zero starting pool share balance with this round test subject (new elliptic pair)
  const address = await providers.getAddress()
  const poolShares = await jsonRpc.poolpair.listPoolShares()
  Object.values(poolShares).forEach((poolBal) => {
    expect(poolBal.owner).not.toStrictEqual(address)
  })

  // Fund 1 DFI UTXOS for fee
  await fundEllipticPair(container, providers.ellipticPair, 1)
})

describe('liqPool.addLiquidity()', () => {
  it('should spend tokenA and tokenB, receive liquidity pair token', async () => {
    const destPubKey = await providers.ellipticPair.publicKey()
    const script = await providers.elliptic.script()

    const tokenAAmount = 2.34
    const tokenBAmount = 90.87
    const addLiquidity: PoolAddLiquidity = {
      from: [{
        script,
        balances: [{
          token: 0,
          amount: new BigNumber(tokenAAmount)
        }, {
          token: tokenId,
          amount: new BigNumber(tokenBAmount)
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

    // minted LM token
    const lmTokenFound = account.find(tb => tb.split('@')[1] === 'DFI-CAT')
    expect(lmTokenFound).toBeTruthy()

    // found in pool share listing
    const poolShares = await jsonRpc.poolpair.listPoolShares()
    const accountPoolBal = poolShares[`2@${await providers.getAddress()}`]
    expect(accountPoolBal.owner).toStrictEqual(await providers.getAddress())
    expect(accountPoolBal.poolID).toStrictEqual('2') // 0 = DFI, 1 = CAT, 2 = DFI-CAT
    expect(accountPoolBal.amount.gt(0)).toBeTruthy()
  })

  it('should be able to store output shares in any p2wpkh address', async () => {
    const destPubKey = await providers.ellipticPair.publicKey()
    const script = await providers.elliptic.script()

    const shareDestAddress = await container.getNewAddress()
    const shareDest = P2WPKH.fromAddress(RegTest, shareDestAddress, P2WPKH)

    const tokenAAmount = 2.34
    const tokenBAmount = 90.87
    const addLiquidity: PoolAddLiquidity = {
      from: [{
        script,
        balances: [{
          token: 0,
          amount: new BigNumber(tokenAAmount)
        }, {
          token: tokenId,
          amount: new BigNumber(tokenBAmount)
        }]
      }],
      shareAddress: shareDest.getScript()
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
    expect(account.length).toStrictEqual(2)
    expect(account).toContain('97.66000000@DFI')
    expect(account).toContain('909.13000000@CAT')

    // minted LM token
    const shareDestAcc = await jsonRpc.account.getAccount(shareDestAddress)
    const lmTokenFound = shareDestAcc.find(tb => tb.split('@')[1] === 'DFI-CAT')
    expect(lmTokenFound).toBeTruthy()

    // found in pool share listing
    const poolShares = await jsonRpc.poolpair.listPoolShares()
    const accountPoolBal = poolShares[`2@${shareDestAddress}`]
    expect(accountPoolBal.owner).toStrictEqual(shareDestAddress)
    expect(accountPoolBal.poolID).toStrictEqual('2') // 0 = DFI, 1 = CAT, 2 = DFI-CAT
    expect(accountPoolBal.amount.gt(0)).toBeTruthy()
  })

  it('should reject invalid addLiquidity arg - more than 1 in `from`', async () => {
    const script = await providers.elliptic.script()
    await expect(builder.liqPool.addLiquidity({
      from: [{
        script,
        balances: [{
          token: 0,
          amount: new BigNumber(10)
        }]
      }, {
        script,
        balances: [{
          token: 1,
          amount: new BigNumber(10)
        }]
      }],
      shareAddress: script
    }, script)).rejects.toThrow('`addLiquidity.from` array length must be ONE')
  })

  it('should reject invalid addLiquidity arg - not 2 TokenBalance in `from.balances`', async () => {
    const script = await providers.elliptic.script()
    await expect(builder.liqPool.addLiquidity({
      from: [{
        script,
        balances: [{
          token: 0,
          amount: new BigNumber(10)
        }, {
          token: 0,
          amount: new BigNumber(10)
        }, {
          token: 1,
          amount: new BigNumber(10)
        }]
      }],
      shareAddress: script
    }, script)).rejects.toThrow('`addLiquidity.from[0].balances` array length must be TWO')
  })

  it('should reject invalid addLiquidity arg - `from.balances` is not a valid pair', async () => {
    const script = await providers.elliptic.script()
    await expect(builder.liqPool.addLiquidity({
      from: [{
        script,
        balances: [{
          token: 1,
          amount: new BigNumber(10)
        }, {
          token: 1,
          amount: new BigNumber(10)
        }]
      }],
      shareAddress: script
    }, script)).rejects.toThrow('`addLiquidity.from[0].balances` must consists of TWO different token')
  })
})
