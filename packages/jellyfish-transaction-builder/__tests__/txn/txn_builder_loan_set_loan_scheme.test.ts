import { DeFiDRpcError, GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'
import { LoanTokenResult } from '@defichain/jellyfish-api-core/src/category/loan'
import { TokenInfo } from '@defichain/jellyfish-api-core/src/category/token'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)

let providers: MockProviders
let builder: P2WPKHTransactionBuilder

describe('loan.createLoanScheme()', () => {
  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[GenesisKeys.length - 1].owner.privKey))
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    // Default scheme
    await testing.container.call('createloanscheme', [100, new BigNumber(1.5), 'default'])
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  beforeEach(async () => {
    // Fund 10 DFI UTXO
    await fundEllipticPair(testing.container, providers.ellipticPair, 10)
    await providers.setupMocks() // required to move utxos
  })

  afterEach(async () => {
    const data = await testing.container.call('listloanschemes')
    const result = data.filter((d: { default: boolean }) => !d.default)

    for (let i = 0; i < result.length; i += 1) {
      // Delete all schemes except default scheme
      await testing.container.call('destroyloanscheme', [result[i].id])
      await testing.generate(1)
    }
  })

  it('should createLoanScheme', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanScheme({
      ratio: 200,
      rate: new BigNumber(2.5),
      identifier: 'scheme',
      update: new BigNumber(0)
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away during create loan scheme
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    // Ensure loan scheme is created and has correct values
    const data = await testing.container.call('listloanschemes')
    const result = data.filter((d: { id: string }) => d.id === 'scheme')
    expect(result.length).toStrictEqual(1)
    expect(result[0]).toStrictEqual(
      { id: 'scheme', mincolratio: 200, interestrate: 2.5, default: false }
    )
  })

  it('should not createLoanScheme if ratio is less than 100', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanScheme({
      ratio: 99,
      rate: new BigNumber(2.5),
      identifier: 'scheme',
      update: new BigNumber(0)
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('LoanSchemeTx: minimum collateral ratio cannot be less than 100 (code 16)\', code: -26')
  })

  it('should not createLoanScheme if rate is less than 0.01', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanScheme({
      ratio: 200,
      rate: new BigNumber(0.0099),
      identifier: 'scheme',
      update: new BigNumber(0)
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('LoanSchemeTx: interest rate cannot be less than 0.01 (code 16)\', code: -26')
  })

  it('should not createLoanScheme if same ratio and rate were created before', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanScheme({ // Failed because its ratio and rate are same as default
      ratio: 100,
      rate: new BigNumber(1.5),
      identifier: 'scheme',
      update: new BigNumber(0)
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('LoanSchemeTx: Loan scheme default with same interestrate and mincolratio already exists (code 16)\', code: -26')
  })

  it('should not createLoanScheme if same identifier was created before', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanScheme({
      ratio: 200,
      rate: new BigNumber(2.5),
      identifier: 'default',
      update: new BigNumber(0)
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('LoanSchemeTx: Loan scheme already exist with id default (code 16)\', code: -26')
  })

  it('should not createLoanScheme if identifier is an empty string', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanScheme({
      ratio: 200,
      rate: new BigNumber(2.5),
      identifier: '',
      update: new BigNumber(0)
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('LoanSchemeTx: id cannot be empty or more than 8 chars long (code 16)\', code: -26')
  })

  it('should not createLoanScheme if identifier is more than 8 chars long', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanScheme({
      ratio: 200,
      rate: new BigNumber(2.5),
      identifier: '123456789',
      update: new BigNumber(0)
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('LoanSchemeTx: id cannot be empty or more than 8 chars long (code 16)\', code: -26')
  })
})

describe('loan.updateLoanToken()', () => {
  let loanTokenId: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[GenesisKeys.length - 1].owner.privKey))
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    const oracleId1 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token1',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp1 = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId1, timestamp1, {
      prices: [{
        tokenAmount: '0.5@Token1',
        currency: 'USD'
      }]
    })
    await testing.generate(1)

    const oracleId2 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token2',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp2 = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId2, timestamp2, {
      prices: [{
        tokenAmount: '0.5@Token2',
        currency: 'USD'
      }]
    })
    await testing.generate(1)

    loanTokenId = await testing.container.call('setloantoken', [{
      symbol: 'Token1',
      name: 'Token1',
      fixedIntervalPriceId: 'Token1/USD',
      mintable: true,
      interest: new BigNumber(0.01)
    }, []])
    await testing.generate(1)
  })

  beforeEach(async () => {
    await fundEllipticPair(testing.container, providers.ellipticPair, 10) // Fund 10 DFI UTXO
    await providers.setupMocks() // Required to move utxos
  })

  afterEach(async () => {
    const data = await testing.container.call('listloantokens', [])
    const result = data.filter((d: LoanTokenResult) => d.fixedIntervalPriceId === 'Token2/USD')
    if (result.length > 0) {
      const token: TokenInfo = Object.values(result[0].token)[0] as TokenInfo
      if (token.symbol === 'Token2') { // If Token2, always update it back to Token1
        await testing.rpc.loan.updateLoanToken('Token2', {
          symbol: 'Token1',
          name: 'Token1',
          fixedIntervalPriceId: 'Token1/USD',
          mintable: true,
          interest: new BigNumber(0.01)
        })
      }
      await testing.generate(1)
    }
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should updateLoanToken', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: 'Token2',
      name: 'Token2',
      currencyPair: { token: 'Token2', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(0.01),
      tokenTx: loanTokenId
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away during set default loan scheme
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    const data = await testing.container.call('listloantokens', [])
    expect(data).toStrictEqual([{
      token: {
        1: {
          symbol: 'Token2',
          symbolKey: 'Token2',
          name: 'Token2',
          decimal: 8,
          limit: 0,
          mintable: true,
          tradeable: true,
          isDAT: true,
          isLPS: false,
          finalized: false,
          isLoanToken: true,
          minted: 0,
          creationTx: loanTokenId,
          creationHeight: expect.any(Number),
          destructionTx: '0000000000000000000000000000000000000000000000000000000000000000',
          destructionHeight: -1,
          collateralAddress: expect.any(String)
        }
      },
      fixedIntervalPriceId: 'Token2/USD',
      interest: 0.01
    }])
  })

  it('should updateLoanToken if symbol is more than 8 letters', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token3',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '0.5@Token3',
        currency: 'USD'
      }]
    })
    await testing.generate(1)

    const loanTokenId = await testing.container.call('setloantoken', [{
      symbol: 'Token3',
      name: 'Token3',
      fixedIntervalPriceId: 'Token3/USD',
      mintable: true,
      interest: new BigNumber(0.03)
    }, []])
    await testing.generate(1)

    await fundEllipticPair(testing.container, providers.ellipticPair, 10) // Fund 10 DFI UTXO
    await providers.setupMocks() // Required to move utxos

    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: 'x'.repeat(9), // 9 letters
      name: 'Token3',
      currencyPair: { token: 'Token3', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(0.04),
      tokenTx: loanTokenId
    }, script)
    await sendTransaction(testing.container, txn)

    const data = await testing.container.call('listloantokens', [])
    const result = data.filter((d: LoanTokenResult) => d.fixedIntervalPriceId === 'Token3/USD')
    const token: TokenInfo = Object.values(result[0].token)[0] as TokenInfo
    expect(token.symbol).toStrictEqual('x'.repeat(8)) // Only remain the first 8 letters
  })

  it('should not updateLoanToken if symbol is an empty string', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: '',
      name: 'Token2',
      currencyPair: { token: 'Token2', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(0.05),
      tokenTx: loanTokenId
    }, script)
    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'UpdateLoanTokenTx: token symbol should be non-empty and starts with a letter (code 16)\', code: -26')
  })

  it('should not updateLoanToken if the symbol is used in other token', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token4',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '0.5@Token4',
        currency: 'USD'
      }]
    })
    await testing.generate(1)

    const loanTokenId = await testing.container.call('setloantoken', [{
      symbol: 'Token4',
      name: 'Token4',
      fixedIntervalPriceId: 'Token4/USD',
      mintable: true,
      interest: new BigNumber(0.06)
    }, []])
    await testing.generate(1)

    await fundEllipticPair(testing.container, providers.ellipticPair, 10) // Fund 10 DFI UTXO
    await providers.setupMocks() // Required to move utxos

    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: 'Token1',
      name: 'Token4',
      currencyPair: { token: 'Token2', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(0.07),
      tokenTx: loanTokenId
    }, script)
    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'UpdateLoanTokenTx: token with key \'Token1\' already exists! (code 16)\', code: -26')
  })

  it('should updateLoanToken if name is more than 128 letters', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: 'Token2',
      name: 'x'.repeat(129), // 129 letters,
      currencyPair: { token: 'Token2', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(0.08),
      tokenTx: loanTokenId
    }, script)
    await sendTransaction(testing.container, txn)

    const data = await testing.container.call('listloantokens', [])
    const result = data.filter((d: LoanTokenResult) => d.fixedIntervalPriceId === 'Token2/USD')
    const token: TokenInfo = Object.values(result[0].token)[0] as TokenInfo
    expect(token.name).toStrictEqual('x'.repeat(128)) // Only remain the first 128 letters
  })

  it('should updateLoanToken if two loan tokens have the same name', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token5',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '0.5@Token5',
        currency: 'USD'
      }]
    })
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token5',
      name: 'Token5',
      fixedIntervalPriceId: 'Token5/USD'
    })
    await testing.generate(1)

    await fundEllipticPair(testing.container, providers.ellipticPair, 10) // Fund 10 DFI UTXO
    await providers.setupMocks() // Required to move utxos

    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: 'Token5',
      name: 'Token1', // Same name as Token1's name
      currencyPair: { token: 'Token1', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(0.08),
      tokenTx: loanTokenId
    }, script)
    await sendTransaction(testing.container, txn)

    const data = await testing.container.call('listloantokens', [])
    const result = data.filter((d: LoanTokenResult) => d.fixedIntervalPriceId === 'Token1/USD')
    const token: TokenInfo = Object.values(result[0].token)[0] as TokenInfo
    expect(token.name).toStrictEqual('Token1')
  })

  it('should not updateLoanToken if currencyPair does not belong to any oracle', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: 'Token2',
      name: 'Token2',
      currencyPair: { token: 'MFST', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(0.09),
      tokenTx: loanTokenId
    }, script)
    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'UpdateLoanTokenTx: Price feed MFST/USD does not belong to any oracle (code 16)\', code: -26')
  })

  it('should not updateLoanToken if tokenTx does not exist', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: 'Token2',
      name: 'Token2',
      currencyPair: { token: 'Token2', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(0.02),
      tokenTx: 'd6e157b66957dda2297947e31ac2a1d0c92eae515f35bc1ebad9478d06efa3c0'
    }, script)
    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'UpdateLoanTokenTx: Loan token (d6e157b66957dda2297947e31ac2a1d0c92eae515f35bc1ebad9478d06efa3c0) does not exist! (code 16)\', code: -26')
  })
})
