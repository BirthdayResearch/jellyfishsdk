import { MasterNodeRegTestContainer, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
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

describe('appoint oracle', () => {
  beforeEach(async () => {
    await container.waitForWalletBalanceGTE(1)
  })

  it('should appoint oracle(s)', async () => {
    // Fund 10 DFI UTXO
    await fundEllipticPair(container, providers.ellipticPair, 10)
    await providers.setupMocks() // required to move utxos

    // Appoint Oracle
    const script = await providers.elliptic.script()
    const txn = await builder.oracles.appointOracle({
      script: script,
      weightage: 1,
      priceFeeds: [
        {
          token: 'TEST',
          currency: 'USD'
        }
      ]
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

    // Ensure oracle is created and has correct values
    const listOraclesResult = await container.call('listoracles')
    expect(listOraclesResult.length).toBeGreaterThanOrEqual(1)

    const txid = calculateTxid(txn)
    const getOracleDataResult = await container.call('getoracledata', [txid])
    expect(getOracleDataResult.priceFeeds.length).toStrictEqual(1)
    expect(getOracleDataResult.priceFeeds[0].token).toStrictEqual('TEST')
    expect(getOracleDataResult.priceFeeds[0].currency).toStrictEqual('USD')
  })

  it('should appoint oracle with multiple currencies', async () => {
    // Fund 10 DFI UTXO
    await fundEllipticPair(container, providers.ellipticPair, 10)
    await providers.setupMocks() // required to move utxos

    // Appoint Oracle
    const script = await providers.elliptic.script()
    const txn = await builder.oracles.appointOracle({
      script: script,
      weightage: 1,
      priceFeeds: [
        {
          token: 'TEST',
          currency: 'USD'
        },
        {
          token: 'TEST',
          currency: 'EUR'
        },
        {
          token: 'TEST',
          currency: 'JPY'
        }
      ]
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

    // Ensure oracle is created and has correct values
    const listOraclesResult = await container.call('listoracles')
    expect(listOraclesResult.length).toBeGreaterThanOrEqual(1)

    const txid = calculateTxid(txn)
    const getOracleDataResult = await container.call('getoracledata', [txid])
    expect(getOracleDataResult.priceFeeds.length).toStrictEqual(3)
    expect(getOracleDataResult.priceFeeds[0].token).toStrictEqual('TEST')
    expect(getOracleDataResult.priceFeeds[0].currency).toStrictEqual('EUR')
  })

  it('should reject invalid appoint oracle arg - weightage over 100', async () => {
    // Appoint Oracle
    const script = await providers.elliptic.script()
    await expect(builder.oracles.appointOracle({
      script: script,
      weightage: 200,
      priceFeeds: [
        {
          token: 'TEST',
          currency: 'USD'
        }
      ]
    }, script)).rejects.toThrow('Conversion input `appointOracle.weightage` must be above `0` and below `101`')
  })
})
