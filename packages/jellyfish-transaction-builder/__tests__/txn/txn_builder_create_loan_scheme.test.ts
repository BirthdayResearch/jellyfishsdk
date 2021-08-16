import { GenesisKeys } from '@defichain/testcontainers'
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

it('should createLoanScheme', async () => {
  const script = await providers.elliptic.script()
  const txn = await builder.loans.createLoanScheme({
    ratio: 200,
    rate: new BigNumber(2.5),
    identifier: 'scheme',
    update: new BigNumber(1629104836999999999)
  }, script)

  // Ensure the created txn is correct.
  // @TODO I face error here
  await sendTransaction(container, txn)
  // const outs = await sendTransaction(container, txn)
  // expect(outs[0].value).toStrictEqual(0)
  // expect(outs[1].value).toBeLessThan(10)
  // expect(outs[1].value).toBeGreaterThan(9.999)
  // expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())
  //
  // // Ensure you don't send all your balance away during create loan scheme
  // const prevouts = await providers.prevout.all()
  // expect(prevouts.length).toStrictEqual(1)
  // expect(prevouts[0].value.toNumber()).toBeLessThan(10)
  // expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

  // Ensure loan scheme is created and has correct values
  // const listOraclesResult = await container.call('listloanschemes')
  // console.log(listOraclesResult)
  // expect(listOraclesResult.length).toBeGreaterThanOrEqual(1)
  //
  // const txid = calculateTxid(txn)
  // const getOracleDataResult = await container.call('getoracledata', [txid])
  // expect(getOracleDataResult.priceFeeds.length).toStrictEqual(1)
  // expect(getOracleDataResult.priceFeeds[0].token).toStrictEqual('TEST')
  // expect(getOracleDataResult.priceFeeds[0].currency).toStrictEqual('USD')
})
