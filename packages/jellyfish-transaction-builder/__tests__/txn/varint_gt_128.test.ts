import BigNumber from 'bignumber.js'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, findOut, fundEllipticPair, sendTransaction } from '../test.utils'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTest, RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { Testing } from '@defichain/jellyfish-testing'
import { fromScript, P2WPKH } from '@defichain/jellyfish-address'
import { AccountToAccount, ICXCreateOrder, ICXOrderType, OP_CODES } from '@defichain/jellyfish-transaction'
import { Bech32, HASH160, WIF } from '@defichain/jellyfish-crypto'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ICXOrderInfo } from '@defichain/jellyfish-api-core/dist/category/icxorderbook'

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

beforeEach(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())

  providers = await getProviders(container)
  providers.setEllipticPair(
    WIF.asEllipticPair(RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.privKey)
  )

  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
  testing = Testing.create(container)

  // create a DCT token
  {
    const dctAddr = await testing.generateAddress()
    await testing.token.create({ symbol: 'FISH', isDAT: false, collateralAddress: dctAddr })
    await testing.generate(1)

    await testing.token.create({ symbol: 'FROG', isDAT: false, collateralAddress: dctAddr })
    await testing.generate(1)

    await testing.token.mint({
      symbol: 'FISH#128',
      amount: 10000
    })
    await testing.token.mint({
      symbol: 'FROG#129',
      amount: 10000
    })
    await testing.generate(1)

    await testing.poolpair.create({
      tokenA: 'FROG#129',
      tokenB: 'DFI'
    })
    await testing.generate(1)
  }

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
  await testing.rpc.masternode.setGov({
    ATTRIBUTES: {
      'v0/params/feature/icx': 'true'
    }
  })
  await testing.generate(1)
})

afterEach(async () => {
  await container.stop()
})

it('should createPoolPair and removeLiquidity', async () => {
  const script = await providers.elliptic.script()
  await fundEllipticPair(container, providers.ellipticPair, 10)
  await providers.setupMocks()

  const catId = Number(await testing.token.getTokenId('CAT'))

  // test DCT and >128 DAT token on create pool pair
  {
    const txn = await builder.liqPool.create({
      tokenA: 128,
      tokenB: catId,
      commission: new BigNumber(0.1),
      ownerAddress: script,
      status: true,
      pairSymbol: 'FISH-CAT',
      customRewards: [{ token: 0, amount: new BigNumber(1) }]
    }, script)

    // Ensure the created txn is correct.
    const outs = await sendTransaction(container, txn)
    expect(outs[0].value).toStrictEqual(0)

    const pair = await testing.poolpair.get('FISH-CAT')
    expect(pair).toBeDefined()
  }

  const addr = fromScript(script, 'regtest')!.address
  await testing.poolpair.add({
    a: {
      symbol: 'FISH#128',
      amount: 10
    },
    b: {
      symbol: 'CAT',
      amount: 100
    },
    address: addr
  })
  await testing.generate(1)

  // test >128 token id on remove liq
  {
    const pairBefore = await testing.rpc.poolpair.getPoolPair('FISH-CAT')
    const pairId = Number(Object.keys(pairBefore)[0])
    expect(pairId).toBeGreaterThan(128)

    const txn = await builder.liqPool.removeLiquidity({
      script: script,
      tokenId: pairId,
      amount: pairBefore[pairId].totalLiquidity.minus(1)
    }, script)
    const outs = await sendTransaction(container, txn)
    expect(outs[0].value).toStrictEqual(0)

    const pairAfter = await testing.poolpair.get('FISH-CAT')
    expect(pairBefore[pairId].totalLiquidity.toNumber()).toBeGreaterThan(pairAfter.totalLiquidity.toNumber())
  }
})

it('should compositeSwap', async () => {
  await providers.randomizeEllipticPair()
  await container.waitForWalletBalanceGTE(1)

  {
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
  }

  // test DCT on composite swap, >128 DAT to DCT
  {
    expect(pairs.CAT.tokenId).toBeGreaterThan(128)

    await testing.poolpair.add({
      a: {
        symbol: 'CAT',
        amount: 10
      },
      b: {
        symbol: 'DFI',
        amount: 100
      }
    })
    await testing.poolpair.add({
      a: {
        symbol: 'FROG#129',
        amount: 50
      },
      b: {
        symbol: 'DFI',
        amount: 100
      }
    })
    await testing.generate(1)

    await fundEllipticPair(container, providers.ellipticPair, 10)

    // simulate compositeSwap
    const intermediateDFISwapAmount = new BigNumber(100)
      .minus(new BigNumber(100 * 10).dividedBy(new BigNumber(10 + 1)))
      .multipliedBy(100000000)
      .minus(1)
      .dividedBy(100000000)
      .decimalPlaces(8, BigNumber.ROUND_CEIL)

    const frogSwapAmount = new BigNumber(50)
      .minus(new BigNumber(50 * 100)
        .dividedBy(new BigNumber(100)
          .plus(intermediateDFISwapAmount)))
      .multipliedBy(100000000)
      .minus(1)
      .dividedBy(100000000)
      .decimalPlaces(8, BigNumber.ROUND_CEIL)

    const catReserveAfter = new BigNumber(10 + 1)
    const frogReserveAfter = new BigNumber(50).minus(frogSwapAmount)

    const addr = await providers.getAddress()

    await testing.rpc.account.sendTokensToAddress(
      {},
      {
        [addr]: ['10@CAT']
      }
    )
    await testing.generate(1)

    const frogPairId = Number(Object.keys(await testing.rpc.poolpair.getPoolPair('FROG-DFI'))[0])

    const script = await providers.elliptic.script()
    const txn = await builder.dex.compositeSwap({
      poolSwap: {
        fromScript: script,
        fromTokenId: pairs.CAT.tokenId,
        fromAmount: new BigNumber('1'),
        toScript: script,
        toTokenId: 129,
        maxPrice: new BigNumber('18446744073709551615.99999999') // max number possible for 16 bytes bignumber
      },
      pools: [
        { id: pairs.CAT.poolId },
        { id: frogPairId }
      ]
    }, script)

    // Ensure the created txn is correct.
    const outs = await sendTransaction(container, txn)
    expect(outs[0].value).toStrictEqual(0)

    // Ensure your balance is correct
    const account = await jsonRpc.account.getAccount(addr)
    expect(account).toContain('9.00000000@CAT')
    expect(account).toContain(`${frogSwapAmount.toFixed(8)}@FROG#129`)

    // reflected on DEXes
    const catPair = Object.values(await jsonRpc.poolpair.getPoolPair('CAT-DFI', true))
    expect(catPair.length).toStrictEqual(1)
    expect(catPair[0].reserveA).toStrictEqual(catReserveAfter)

    const frogPair = Object.values(await jsonRpc.poolpair.getPoolPair('FROG-DFI', true))
    expect(frogPair.length).toStrictEqual(1)
    expect(frogPair[0].reserveA).toStrictEqual(frogReserveAfter)

    // Ensure you don't send all your balance away during poolswap
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)
  }
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

  // >128 DAT token
  {
    const tokenId = Number(await testing.token.getTokenId('PIG'))
    expect(tokenId).toBeGreaterThan(128)

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
  }

  // DCT token
  {
    const fishId = Number(await testing.token.getTokenId('FISH#128'))
    expect(fishId).toBeGreaterThanOrEqual(128)

    await testing.token.send({
      symbol: 'FISH#128',
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
          token: fishId,
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
    expect(account).toContain('9.01000000@FISH#128')

    const recipientAccount = await jsonRpc.account.getAccount(newAddress)
    expect(recipientAccount).toContain('100.99000000@FISH#128')
  }
})

it('should setCollateralToken, takeLoan and paybackLoan', async () => {
  const oracleId = await testing.rpc.oracle.appointOracle(
    await testing.generateAddress(),
    [
      { token: 'DFI', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' },
      { token: 'FISH#128', currency: 'USD' },
      { token: 'FROG#129', currency: 'USD' },
      { token: 'PIG', currency: 'USD' },
      { token: 'CAT', currency: 'USD' },
      { token: 'DOG', currency: 'USD' },
      { token: 'GOAT', currency: 'USD' },
      { token: 'FOX', currency: 'USD' }
    ],
    { weightage: 1 }
  )
  await testing.generate(1)

  await testing.rpc.oracle.setOracleData(
    oracleId,
    Math.floor(new Date().getTime() / 1000),
    {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '1@DUSD', currency: 'USD' },
        { tokenAmount: '1@FISH#128', currency: 'USD' },
        { tokenAmount: '1@FROG#129', currency: 'USD' },
        { tokenAmount: '1@PIG', currency: 'USD' },
        { tokenAmount: '1@DOG', currency: 'USD' },
        { tokenAmount: '1@GOAT', currency: 'USD' },
        { tokenAmount: '1@FOX', currency: 'USD' }
      ]
    }
  )
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })
  await testing.generate(1)

  // Set up DUSD token for loan ops
  await testing.rpc.loan.setLoanToken({
    symbol: 'DUSD',
    fixedIntervalPriceId: 'DUSD/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setLoanToken({
    symbol: 'FOX',
    fixedIntervalPriceId: 'FOX/USD'
  })
  await testing.generate(1)

  await providers.setupMocks()
  const script = await providers.elliptic.script()

  // not allowed for non-DAT token
  // test DCT token on `setCollateralToken`
  // {
  //   await fundEllipticPair(container, providers.ellipticPair, 10)

  //   const txn = await builder.loans.setCollateralToken({
  //     token: 128,
  //     factor: new BigNumber(1),
  //     currencyPair: { token: 'FISH#128', currency: 'USD' },
  //     activateAfterBlock: 0
  //   }, script)

  //   // Ensure the created txn is correct.
  //   const outs = await sendTransaction(container, txn)
  //   expect(outs[0].value).toStrictEqual(0)

  //   const col = await testing.rpc.loan.getCollateralToken('FISH#128')
  //   expect(col).toStrictEqual({
  //     token: 'FISH#128',
  //     tokenId: expect.stringMatching(/[0-f]{64}/),
  //     factor: new BigNumber(1),
  //     fixedIntervalPriceId: 'FISH#128/USD'
  //   })
  // }

  // not allowed for non-DAT token
  // test >128 DAT token on `setCollateralToken`
  // {
  //   await fundEllipticPair(container, providers.ellipticPair, 10)

  //   const catId = Number(await testing.token.getTokenId('CAT'))
  //   expect(catId).toBeGreaterThan(128)

  //   const txn = await builder.loans.setCollateralToken({
  //     token: catId,
  //     factor: new BigNumber(1),
  //     currencyPair: { token: 'CAT', currency: 'USD' },
  //     activateAfterBlock: 0
  //   }, script)

  //   // Ensure the created txn is correct.
  //   const outs = await sendTransaction(container, txn)
  //   expect(outs[0].value).toStrictEqual(0)

  //   const col = await testing.rpc.loan.getCollateralToken('CAT')
  //   expect(col).toStrictEqual({
  //     token: 'CAT',
  //     tokenId: expect.stringMatching(/[0-f]{64}/),
  //     factor: new BigNumber(1),
  //     fixedIntervalPriceId: 'CAT/USD'
  //   })
  // }

  await testing.rpc.loan.createLoanScheme({
    minColRatio: 150,
    interestRate: new BigNumber(3),
    id: 'default'
  })
  await testing.generate(1)

  const vaultId = await testing.rpc.vault.createVault({
    ownerAddress: await providers.getAddress(),
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.token.send({
    symbol: 'DFI',
    amount: 800,
    address: await providers.getAddress()
  })
  await testing.generate(1)

  await testing.rpc.vault.depositToVault({
    vaultId: vaultId, from: await providers.getAddress(), amount: '800@DFI'
  })
  await testing.generate(1)

  const vault = await container.call('getvault', [vaultId])
  expect(vault.loanAmounts).toStrictEqual([])

  // test >128 DAT on `takeLoan`
  const foxId = Number(await testing.token.getTokenId('FOX'))
  expect(foxId).toBeGreaterThan(128)
  const dusdId = Number(await testing.token.getTokenId('DUSD'))
  {
    await fundEllipticPair(container, providers.ellipticPair, 10)

    const txn = await builder.loans.takeLoan({
      vaultId: vaultId,
      to: script,
      tokenAmounts: [
        { token: foxId, amount: new BigNumber(150) },
        { token: dusdId, amount: new BigNumber(200) }
      ]
    }, script)

    // Ensure the created txn is correct.
    const outs = await sendTransaction(container, txn)
    expect(outs[0].value).toStrictEqual(0)

    const vault = await container.call('getvault', [vaultId])
    expect(vault.loanAmounts).toContain('150.00008562@FOX')

    const addr = fromScript(script, 'regtest')!.address
    const acc = await testing.rpc.account.getAccount(addr)
    expect(acc).toContain('150.00000000@FOX')
  }

  await testing.poolpair.create({
    tokenA: 'DUSD',
    tokenB: 'DFI'
  })
  await testing.generate(1)

  await testing.poolpair.add({
    a: { symbol: 'DUSD', amount: 100 },
    b: { symbol: 'DFI', amount: 100 }
  })
  await testing.generate(1)

  await testing.poolpair.create({
    tokenA: 'FOX',
    tokenB: 'DUSD'
  })
  await testing.generate(1)

  await testing.poolpair.add({
    a: { symbol: 'FOX', amount: 100 },
    b: { symbol: 'DUSD', amount: 100 }
  })
  await testing.generate(1)

  // test >128 DAT on `payback`
  {
    await fundEllipticPair(container, providers.ellipticPair, 10)

    const txn = await builder.loans.paybackLoan({
      vaultId: vaultId,
      from: script,
      tokenAmounts: [{ token: foxId, amount: new BigNumber(1) }]
    }, script)

    // Ensure the created txn is correct.
    const outs = await sendTransaction(container, txn)
    expect(outs[0].value).toStrictEqual(0)

    const vault = await container.call('getvault', [vaultId])
    expect(vault.loanAmounts).toContain('149.00068437@FOX')

    const addr = fromScript(script, 'regtest')!.address
    const acc = await testing.rpc.account.getAccount(addr)
    expect(acc).toContain('49.00000000@FOX')
  }
})

it('should createICXOrder', async () => {
  await testing.rpc.account.sendTokensToAddress(
    {},
    {
      [await providers.getAddress()]: ['5@CAT', '5@FISH#128']
    }
  )

  const script = await providers.elliptic.script()
  await fundEllipticPair(container, providers.ellipticPair, 10)
  await providers.setupMocks()

  // test DCT token
  {
    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.INTERNAL,
      tokenId: 128, // FISH#128
      ownerAddress: script,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(5),
      amountToFill: new BigNumber(5),
      orderPrice: new BigNumber(0.01),
      expiry: 2880
    }

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_CREATE_ORDER(icxOrder).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const txn = await builder.icxorderbook.createOrder(icxOrder, script)
    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)

    const orders = await testing.rpc.icxorderbook.listOrders()
    const txid = calculateTxid(txn)
    const order = orders[txid] as ICXOrderInfo
    expect(order.tokenFrom).toStrictEqual('FISH#128')
  }

  // test >128 DAT token
  {
    const catId = Number(await testing.token.getTokenId('CAT'))
    expect(catId).toBeGreaterThan(128)

    const icxOrder: ICXCreateOrder = {
      orderType: ICXOrderType.EXTERNAL,
      tokenId: catId, // > 128 DAT token
      ownerAddress: script,
      receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
      amountFrom: new BigNumber(5),
      amountToFill: new BigNumber(5),
      orderPrice: new BigNumber(0.01),
      expiry: 2880
    }

    const encoded: string = OP_CODES.OP_DEFI_TX_ICX_CREATE_ORDER(icxOrder).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const txn = await builder.icxorderbook.createOrder(icxOrder, script)
    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)

    const orders = await testing.rpc.icxorderbook.listOrders()
    const txid = calculateTxid(txn)
    const order = orders[txid] as ICXOrderInfo
    expect(order.tokenTo).toStrictEqual('CAT')
  }
})
