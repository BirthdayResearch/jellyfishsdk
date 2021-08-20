import { DeFiDRpcError, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'

const container = new LoanMasterNodeRegTestContainer()
const testing = Testing.create(container)

let providers: MockProviders
let builder: P2WPKHTransactionBuilder

beforeAll(async () => {
  await testing.container.start()
  await testing.container.waitForWalletCoinbaseMaturity()

  providers = await getProviders(testing.container)
  providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[GenesisKeys.length - 1].owner.privKey))
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

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
  await providers.setupMocks() // Required to move utxos

  await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme1'])
  await testing.generate(1)
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

describe('loan.updateLoanScheme()', () => {
  it('should updateLoanScheme', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanScheme({
      ratio: 300,
      rate: new BigNumber(3.5),
      identifier: 'scheme1'
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away during update loan scheme
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    const data = await testing.container.call('listloanschemes')
    const result = data.filter((d: { id: string }) => d.id === 'scheme1')
    expect(result.length).toStrictEqual(1)
    expect(result[0]).toStrictEqual(
      {
        default: false,
        id: 'scheme1',
        interestrate: 3.5,
        mincolratio: 300
      }
    )
  })

  it('should not updateLoanScheme if ratio is less than 100', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanScheme({
      ratio: 99,
      rate: new BigNumber(3.5),
      identifier: 'scheme1'
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('LoanSchemeTx: minimum collateral ratio cannot be less than 100 (code 16)\', code: -26')
  })

  it('should not updateLoanScheme if rate is less than 0.01', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanScheme({
      ratio: 300,
      rate: new BigNumber(0.00999),
      identifier: 'scheme1'
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('LoanSchemeTx: interest rate cannot be less than 0.01 (code 16)\', code: -26')
  })

  it('should not updateLoanScheme if same ratio and rate were created before', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanScheme({
      ratio: 100,
      rate: new BigNumber(1.5),
      identifier: 'scheme1'
    }, script)

    const promise = sendTransaction(testing.container, txn) // Failed because its minColRatio and interestRate are same as default
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('LoanSchemeTx: Loan scheme default with same interestrate and mincolratio already exists (code 16)\', code: -26')
  })

  it('should not updateLoanScheme if identifier does not exist', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanScheme({
      ratio: 300,
      rate: new BigNumber(3.5),
      identifier: 'scheme2'
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('LoanSchemeTx: Cannot find existing loan scheme with id scheme2 (code 16)\', code: -26')
  })

  it('should not updateLoanScheme if identifier is an empty string', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanScheme({
      ratio: 300,
      rate: new BigNumber(3.5),
      identifier: ''
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('LoanSchemeTx: id cannot be empty or more than 8 chars long (code 16)\', code: -26')
  })

  it('should not updateLoanScheme if identifier is more than 8 chars long', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanScheme({
      ratio: 300,
      rate: new BigNumber(3.5),
      identifier: '123456789'
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('LoanSchemeTx: id cannot be empty or more than 8 chars long (code 16)\', code: -26')
  })

  it('should updateLoanScheme at block 160', async () => {
    // Wait for block 150
    await testing.container.waitForBlockHeight(150)

    // To update at block 160
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanScheme({
      ratio: 300,
      rate: new BigNumber(3.5),
      identifier: 'scheme1',
      update: new BigNumber(160)
    }, script)

    await sendTransaction(testing.container, txn)

    // Shouldn't update at block 151
    {
      const data = await testing.container.call('listloanschemes')
      const result = data.filter((d: { id: string }) => d.id === 'scheme1')
      expect(result.length).toStrictEqual(1)
      expect(result[0]).toStrictEqual(
        {
          default: false,
          id: 'scheme1',
          interestrate: 2.5,
          mincolratio: 200
        }
      )
    }

    // Wait for block 160
    await testing.container.waitForBlockHeight(160)

    // Should update at block 160
    {
      const data = await testing.container.call('listloanschemes')
      const result = data.filter((d: { id: string }) => d.id === 'scheme1')
      expect(result.length).toStrictEqual(1)
      expect(result[0]).toStrictEqual(
        {
          default: false,
          id: 'scheme1',
          interestrate: 3.5,
          mincolratio: 300
        }
      )
    }
  })

  it('should not updateLoanScheme if update is less than current block', async () => {
    // Wait for block 170
    await testing.container.waitForBlockHeight(170)

    // Attempt to updateLoanScheme at block 169
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanScheme({
      ratio: 300,
      rate: new BigNumber(3.5),
      identifier: 'scheme1',
      update: new BigNumber(169)
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('LoanSchemeTx: Update height below current block height, set future height (code 16)\', code: -26')
  })

  it('should not updateLoanScheme if same ratio and rate pending loan scheme created before', async () => {
    // Wait for block 180
    await testing.container.waitForBlockHeight(180)

    await testing.container.call('createloanscheme', [400, new BigNumber(4.5), 'scheme2'])
    await testing.generate(1)

    // To update scheme at later block
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanScheme({
      ratio: 400,
      rate: new BigNumber(4.5),
      identifier: 'scheme1',
      update: new BigNumber(190)
    }, script)

    // Attempt to update same ratio and rate as the pending scheme
    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('LoanSchemeTx: Loan scheme scheme2 with same interestrate and mincolratio already exists (code 16)\', code: -26')

    await testing.container.waitForBlockHeight(190)
  })
})
