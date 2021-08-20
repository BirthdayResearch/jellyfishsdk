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

describe('loan.destroyLoanScheme()', () => {
  it('should destroyLoanScheme', async () => {
    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await testing.generate(1)

    // Before delete
    {
      const data = await testing.container.call('listloanschemes')
      const result = data.filter((d: { id: string }) => d.id === 'scheme')
      expect(result.length).toStrictEqual(1)
    }

    const script = await providers.elliptic.script()
    const txn = await builder.loans.destroyLoanScheme({
      identifier: 'scheme'
    }, script)

    // Ensure the created txn is correct.
    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away during destroy loan scheme
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    // After delete
    {
      const data = await testing.container.call('listloanschemes')
      const result = data.filter((d: { id: string }) => d.id === 'scheme')
      expect(result.length).toStrictEqual(0)
    }
  })

  it('should not destroyLoanScheme if identifier is an empty string', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.destroyLoanScheme({
      identifier: ''
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DestroyLoanSchemeTx: id cannot be empty or more than 8 chars long (code 16)\', code: -26')
  })

  it('should not destroyLoanScheme if identifier is more than 8 chars long', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.destroyLoanScheme({
      identifier: '123456789'
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DestroyLoanSchemeTx: id cannot be empty or more than 8 chars long (code 16)\', code: -26')
  })

  it('should not destroyLoanScheme if identifier does not exists', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.destroyLoanScheme({
      identifier: 'scheme2'
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DestroyLoanSchemeTx: Cannot find existing loan scheme with id scheme2 (code 16)\', code: -26')
  })

  it('should not destroyLoanScheme if identifier is a default scheme', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.destroyLoanScheme({
      identifier: 'default'
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'DestroyLoanSchemeTx: Cannot destroy default loan scheme, set new default first (code 16)\', code: -26')
  })

  it('should destroyLoanScheme with height', async () => {
    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await testing.generate(1)

    // Wait for block 110
    await testing.container.waitForBlockHeight(110)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.destroyLoanScheme({
      identifier: 'scheme',
      height: new BigNumber(120)
    }, script)

    await sendTransaction(testing.container, txn)

    // Shouldn't delete at block 111
    {
      const data = await testing.container.call('listloanschemes')
      const result = data.filter((d: { id: string }) => d.id === 'scheme')
      expect(result.length).toStrictEqual(1)
    }

    // Wait for block 120
    await testing.container.waitForBlockHeight(120)

    // Should delete at block 120
    {
      const data = await testing.container.call('listloanschemes')
      const result = data.filter((d: { id: string }) => d.id === 'scheme')
      expect(result.length).toStrictEqual(0)
    }
  })

  it('should not destroyLoanScheme if height is lesser than current height', async () => {
    await testing.container.call('createloanscheme', [200, new BigNumber(2.5), 'scheme'])
    await testing.generate(1)

    // Wait for block 130
    await testing.container.waitForBlockHeight(130)

    // To delete at block 129, which should fail
    const script = await providers.elliptic.script()
    const txn = await builder.loans.destroyLoanScheme({
      identifier: 'scheme',
      height: new BigNumber(129)
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'DestroyLoanSchemeTx: Destruction height below current block height, set future height (code 16)\', code: -26')
  })
})
