import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import { RegTest } from '@defichain/jellyfish-network'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  providers = await getProviders(container)
  providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[GenesisKeys.length - 1].owner.privKey))
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

  // Prep 1000 DFI Token for testing
  await container.waitForWalletBalanceGTE(1001)
})

afterAll(async () => {
  await container.stop()
})

describe('update oracle', () => {
  beforeEach(async () => {
    await container.waitForWalletBalanceGTE(11)

    // Fund 10 DFI UTXO
    await fundEllipticPair(container, providers.ellipticPair, 10)
    await providers.setupMocks() // required to move utxos
  })

  it('should appoint and then update oracle', async () => {
    // Appoint Oracle
    const script = await providers.elliptic.script()
    const appointTxn = await builder.oracles.appointOracle({
      script: script,
      weightage: 1,
      priceFeeds: [
        {
          token: 'TEST',
          currency: 'USD'
        }
      ]
    }, script)

    const oracleId = calculateTxid(appointTxn)
    await sendTransaction(container, appointTxn)

    // Update Oracle
    const updateTxn = await builder.oracles.updateOracle({
      oracleId: oracleId,
      script: script,
      weightage: 100,
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
    const outs = await sendTransaction(container, updateTxn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away during update oracle
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    // Ensure oracle is updated and has correct values
    const getOracleDataResult = await container.call('getoracledata', [oracleId])
    expect(getOracleDataResult.priceFeeds.length).toStrictEqual(3)
    expect(getOracleDataResult.priceFeeds[0].token).toStrictEqual('TEST')
    expect(getOracleDataResult.priceFeeds[0].currency).toStrictEqual('EUR')
  })

  it('should update to new owner', async () => {
    // Appoint Oracle
    const script = await providers.elliptic.script()
    const appointTxn = await builder.oracles.appointOracle({
      script: script,
      weightage: 1,
      priceFeeds: [
        {
          token: 'TEST',
          currency: 'USD'
        }
      ]
    }, script)

    const oracleId = calculateTxid(appointTxn)
    await sendTransaction(container, appointTxn)

    const newProviders = await getProviders(container)
    const newScript = await newProviders.elliptic.script()

    // Fund 10 DFI UTXO
    await fundEllipticPair(container, providers.ellipticPair, 10)
    await providers.setupMocks() // required to move utxos

    // Store old address
    const oldOracleAddress = (await container.call('getoracledata', [oracleId])).address

    // Update Oracle
    const updateTxn = await builder.oracles.updateOracle({
      oracleId: oracleId,
      script: newScript,
      weightage: 100,
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
    }, newScript)
    await sendTransaction(container, updateTxn)

    // Ensure oracle is updated and has correct values
    const getOracleDataResult = await container.call('getoracledata', [oracleId])
    expect(getOracleDataResult.address).not.toStrictEqual(oldOracleAddress)
  })

  it('should reject invalid update oracle arg - weightage over 100', async () => {
    // Update Oracle
    const script = await providers.elliptic.script()
    await expect(builder.oracles.updateOracle({
      oracleId: '80efea267c9901ab37ee5a57045ee61fc86c988a207b8b4c7bab4e59e4b1b71b',
      script: script,
      weightage: 200,
      priceFeeds: [
        {
          token: 'TEST',
          currency: 'USD'
        }
      ]
    }, script)).rejects.toThrow('Conversion input `updateOracle.weightage` must be above `0` and below `101`')
  })
})
