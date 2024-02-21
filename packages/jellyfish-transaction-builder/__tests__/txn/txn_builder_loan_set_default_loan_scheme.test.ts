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
  await testing.container.call('createloanscheme', [100, new BigNumber(1.5), 'scheme1'])
  await testing.generate(1)

  await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme2'])
  await testing.generate(1)
})

afterAll(async () => {
  await testing.container.stop()
})

beforeEach(async () => {
  // Fund 10 DFI UTXO
  await fundEllipticPair(testing.container, providers.ellipticPair, 10)
  await providers.setupMocks() // Required to move utxos
})

afterEach(async () => {
  // Always set default scheme to scheme1
  const data = await testing.container.call('listloanschemes')
  const record = data.find((d: { default: string }) => d.default)
  if (record.id !== 'scheme1') {
    await testing.container.call('setdefaultloanscheme', ['scheme1'])
    await testing.generate(1)
  }
})

describe('loan.setDefaultLoanScheme()', () => {
  it('should setDefaultLoanScheme', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setDefaultLoanScheme({
      identifier: 'scheme2'
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

    const result = await testing.container.call('listloanschemes', [])
    expect(result).toStrictEqual(
      [
        { id: 'scheme1', mincolratio: 100, interestrate: 1.5, default: false },
        { id: 'scheme2', mincolratio: 200, interestrate: 2.5, default: true }
      ]
    )
  })

  it('should not setDefaultLoanScheme if identifier is an empty string', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setDefaultLoanScheme({
      identifier: ''
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DefaultLoanSchemeTx: id cannot be empty or more than 8 chars long\', code: -26')
  })

  it('should not setDefaultLoanScheme if identifier is more than 8 chars long', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setDefaultLoanScheme({
      identifier: '123456789'
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DefaultLoanSchemeTx: id cannot be empty or more than 8 chars long\', code: -26')
  })

  it('should not setDefaultLoanScheme if identifier does not exists', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setDefaultLoanScheme({
      identifier: 'scheme3'
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DefaultLoanSchemeTx: Cannot find existing loan scheme with id scheme3\', code: -26')
  })

  it('should not setDefaultLoanScheme if the identifier is a default scheme', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setDefaultLoanScheme({
      identifier: 'scheme1'
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DefaultLoanSchemeTx: Loan scheme with id scheme1 is already set as default\', code: -26')
  })

  it('should not setDefaultLoanScheme if the scheme is going to be deleted at future block', async () => {
    await testing.container.call('createloanscheme', [300, new BigNumber(3.5), 'scheme3'])
    await testing.generate(1)

    // Wait for block 110
    await testing.container.waitForBlockHeight(110)

    // To delete at block 120
    const loanSchemeId = await testing.container.call('destroyloanscheme', ['scheme3', 120])
    expect(typeof loanSchemeId).toStrictEqual('string')
    expect(loanSchemeId.length).toStrictEqual(64)
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.setDefaultLoanScheme({
      identifier: 'scheme3'
    }, script)

    const promise = sendTransaction(container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DefaultLoanSchemeTx: Cannot set scheme3 as default, set to destroyed on block 120\', code: -26')

    // Delete at block 120
    await testing.container.waitForBlockHeight(120)
  })
})
