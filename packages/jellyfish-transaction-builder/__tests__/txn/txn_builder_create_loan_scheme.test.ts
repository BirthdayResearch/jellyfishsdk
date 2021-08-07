import { GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, TxOut } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import { BigNumber } from '@defichain/jellyfish-json'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { CTransactionSegWit, TransactionSegWit } from '@defichain/jellyfish-transaction'
import { SmartBuffer } from 'smart-buffer'

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

it('should create loan scheme', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.createLoanScheme({
    minColRatio: 200,
    interestRate: new BigNumber('200'),
    id: 'default'
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

  const result = await container.call('listloanschemes')
  const data = result.filter((r: { id: string }) => r.id === 'default')

  expect(data.length).toStrictEqual(1)
  expect(data[0]).toStrictEqual(
    { id: 'default', mincolratio: 200, interestrate: new BigNumber(200), default: true }
  )
})

export async function sendTransaction (container: LoanMasterNodeRegTestContainer, transaction: TransactionSegWit): Promise<TxOut[]> {
  const buffer = new SmartBuffer()
  new CTransactionSegWit(transaction).toBuffer(buffer)
  const hex = buffer.toBuffer().toString('hex')

  const txid = await container.call('sendrawtransaction', [hex])
  await container.generate(1)

  const tx = await container.call('getrawtransaction', [txid, true])
  return tx.vout as TxOut[]
}
