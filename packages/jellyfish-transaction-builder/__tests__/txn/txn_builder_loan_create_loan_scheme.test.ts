import { DeFiDRpcError, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'

const container = new LoanMasterNodeRegTestContainer()
const testing = Testing.create(container)

let providers: MockProviders
let builder: P2WPKHTransactionBuilder

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

describe('loan.createLoanScheme()', () => {
  it('should createLoanScheme', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.createLoanScheme({
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
    const txn = await builder.loans.createLoanScheme({
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
    const txn = await builder.loans.createLoanScheme({
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
    const txn = await builder.loans.createLoanScheme({ // Failed because its ratio and rate are same as default
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
    const txn = await builder.loans.createLoanScheme({
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
    const txn = await builder.loans.createLoanScheme({
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
    const txn = await builder.loans.createLoanScheme({
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
