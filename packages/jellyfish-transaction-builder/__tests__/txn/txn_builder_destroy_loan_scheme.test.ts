import { DeFiDRpcError, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'

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
    await container.call('destroyloanscheme', [data[i].id])
    await container.generate(1)
  }
})

it('should destroyLoanScheme', async () => {
  await container.call('createloanscheme', [200, 2, 'scheme'])
  await container.generate(1)

  // NOTE(jingyi2811): Wait for block 100
  await container.waitForBlockHeight(100)

  const script = await providers.elliptic.script()
  const txn = await builder.loans.destroyLoanScheme({
    identifier: 'scheme',
    height: BigInt(150)
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

  // NOTE(jingyi2811): before delete
  {
    const result = await container.call('listloanschemes')
    const data = result.filter((r: { id: string }) => r.id === 'scheme')
    expect(data.length).toStrictEqual(1)
  }
  // NOTE(jingyi2811): Wait for block 150
  await container.waitForBlockHeight(150)

  // NOTE(jingyi2811): after delete
  {
    const result = await container.call('listloanschemes')
    const data = result.filter((r: { id: string }) => r.id === 'scheme')
    expect(data.length).toStrictEqual(0)
  }
})

it('should not destroyLoanScheme if identifier is an empty string', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.destroyLoanScheme({
    identifier: '',
    height: BigInt(150)
  }, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('DestroyLoanSchemeTx: id cannot be empty or more than 8 chars long (code 16)\', code: -26')
})

it('should not destroyLoanScheme if identifier is more than 8 chars', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.destroyLoanScheme({
    identifier: '123456789',
    height: BigInt(150)
  }, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('DestroyLoanSchemeTx: id cannot be empty or more than 8 chars long (code 16)\', code: -26')
})

it('should not destroyLoanScheme if identifier is not exists', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.destroyLoanScheme({
    identifier: 'scheme2',
    height: BigInt(150)
  }, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('DestroyLoanSchemeTx: Cannot find existing loan scheme with id scheme2 (code 16)\', code: -26')
})

it('should not destroyLoanScheme if identifier is a default scheme', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.destroyLoanScheme({
    identifier: 'default',
    height: BigInt(150)
  }, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('DestroyLoanSchemeTx: Cannot destroy default loan scheme, set new default first (code 16)\', code: -26')
})

it('should not destroyLoanScheme if height is lesser than current height', async () => {
  await container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
  await container.generate(1)

  // NOTE(jingyi2811): Wait for block 200
  await container.waitForBlockHeight(200)

  // NOTE(jingyi2811): To delete at block 199, which should failed
  const script = await providers.elliptic.script()
  const txn = await builder.loans.destroyLoanScheme({
    identifier: 'scheme2',
    height: BigInt(199)
  }, script)

  const promise = sendTransaction(container, txn)
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow('DestroyLoanSchemeTx: Cannot find existing loan scheme with id scheme2 (code 16)\', code: -26')
})
