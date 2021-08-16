import { DeFiDRpcError, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import { BigNumber } from '@defichain/jellyfish-json'
import { LoanMasterNodeRegTestContainer } from './loan_container'

const container = new LoanMasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()

  providers = await getProviders(container)
  providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[GenesisKeys.length - 1].owner.privKey))
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

  // Prep 1000 DFI Token for testing
  await container.waitForWalletBalanceGTE(1001)

  // NOTE(jingyi2811): default scheme
  await container.call('createloanscheme', [100, new BigNumber(1.5), 'default'])
  await container.generate(1)
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await container.waitForWalletBalanceGTE(11)

  // Fund 10 DFI UTXO
  await fundEllipticPair(container, providers.ellipticPair, 10)
  await providers.setupMocks() // required to move utxos
})

afterEach(async () => {
  const result = await container.call('listloanschemes')
  const data = result.filter((r: { default: boolean }) => !r.default)

  for (let i = 0; i < data.length; i += 1) {
    // NOTE(jingyi2811): Delete all schemes except default scheme
    await container.call('destroyloanscheme', [data[i].id])
    await container.generate(1)
  }
})

it('should createLoanScheme', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.createLoanScheme({
    ratio: 200,
    rate: new BigNumber(2.5),
    identifier: 'scheme',
    update: BigInt(0)
  }, script)

  // Ensure the created txn is correct.
  const outs = await sendTransaction(container, txn)
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
  const data = await container.call('listloanschemes')
  const result = data.filter((r: { id: string }) => r.id === 'scheme')

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
    update: BigInt(0)
  }, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('LoanSchemeTx: minimum collateral ratio cannot be less than 100 (code 16)\', code: -26')
})

it('should not createLoanScheme if rate is less than 0.01', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.createLoanScheme({
    ratio: 200,
    rate: new BigNumber(0.0099),
    identifier: 'scheme',
    update: BigInt(0)
  }, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('LoanSchemeTx: interest rate cannot be less than 0.01 (code 16)\', code: -26')
})

it('should not createLoanScheme if identifier is an empty string', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.createLoanScheme({
    ratio: 200,
    rate: new BigNumber(2.5),
    identifier: '',
    update: BigInt(0)
  }, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('LoanSchemeTx: id cannot be empty or more than 8 chars long (code 16)\', code: -26')
})

it('should not createLoanScheme if identifier is more than 8 chars', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.createLoanScheme({
    ratio: 200,
    rate: new BigNumber(2.5),
    identifier: '123456789',
    update: BigInt(0)
  }, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('LoanSchemeTx: id cannot be empty or more than 8 chars long (code 16)\', code: -26')
})
