import { DeFiDRpcError, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
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

  await container.call('createloanscheme', [100, new BigNumber(1.5), 'scheme1'])
  await container.generate(1)

  await container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme2'])
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
  // NOTE(jingyi2811): Always set default scheme to scheme1
  const data = await container.call('listloanschemes')
  const record = data.find((d: { default: string }) => d.default)
  if (record.id !== 'scheme1') {
    await container.call('setdefaultloanscheme', ['scheme1'])
    await container.generate(1)
  }
})

it('should setDefaultLoanScheme', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.setDefaultLoanScheme({
    identifier: 'scheme2'
  }, script)

  // Ensure the created txn is correct.
  const outs = await sendTransaction(container, txn)
  expect(outs[0].value).toStrictEqual(0)
  expect(outs[1].value).toBeLessThan(10)
  expect(outs[1].value).toBeGreaterThan(9.999)
  expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

  // Ensure you don't send all your balance away during appoint oracle
  const prevouts = await providers.prevout.all()
  expect(prevouts.length).toStrictEqual(1)
  expect(prevouts[0].value.toNumber()).toBeLessThan(10)
  expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

  const result = await container.call('listloanschemes', [])
  expect(result).toStrictEqual(
    [
      { id: 'scheme1', mincolratio: 100, interestrate: 1.5, default: false },
      { id: 'scheme2', mincolratio: 200, interestrate: 2.5, default: true }
    ]
  )
})

it('should not setDefaultLoanScheme if the identifier is already a default', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.setDefaultLoanScheme({
    identifier: 'scheme1'
  }, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('DefaultLoanSchemeTx: Loan scheme with id scheme1 is already set as default (code 16)\', code: -26')
})

it('should not setDefaultLoanScheme if identifier does not exists', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.setDefaultLoanScheme({
    identifier: 'scheme3'
  }, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('DefaultLoanSchemeTx: Cannot find existing loan scheme with id scheme3 (code 16)\', code: -26')
})

it('should not setDefaultLoanScheme if identifier is more than 8 chars long', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.setDefaultLoanScheme({
    identifier: '123456789'
  }, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('DefaultLoanSchemeTx: id cannot be empty or more than 8 chars long (code 16)\', code: -26')
})

it('should not setDefaultLoanScheme if identifier is an empty string', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.setDefaultLoanScheme({
    identifier: ''
  }, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('DefaultLoanSchemeTx: id cannot be empty or more than 8 chars long (code 16)\', code: -26')
})
