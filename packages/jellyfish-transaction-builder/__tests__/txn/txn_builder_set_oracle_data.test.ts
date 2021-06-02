import { MasterNodeRegTestContainer, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'

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

describe('set oracle data', () => {
  beforeEach(async () => {
    await container.waitForWalletBalanceGTE(11)

    // Fund 10 DFI UTXO
    await fundEllipticPair(container, providers.ellipticPair, 10)
    await providers.setupMocks() // required to move utxos
  })

  it('should appoint and then set oracle data', async () => {
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

    // Set Oracle Data
    const setDataTxn = await builder.oracles.setOracleData({
      oracleId: oracleId,
      timestamp: new BigNumber('1621567932'),
      tokens: [
        {
          token: 'TEST',
          prices: [
            {
              currency: 'USD',
              amount: new BigNumber('1.0')
            }
          ]
        }
      ]
    }, script)

    // Ensure the created txn is correct.
    const outs = await sendTransaction(container, setDataTxn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away during set oracle data
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    // Ensure oracle is updated and has correct values
    const getOracleDataResult = await container.call('getoracledata', [oracleId])
    expect(getOracleDataResult.priceFeeds.length).toStrictEqual(1)
    expect(getOracleDataResult.priceFeeds[0].token).toStrictEqual('TEST')
    expect(getOracleDataResult.priceFeeds[0].currency).toStrictEqual('USD')
    expect(getOracleDataResult.tokenPrices[0].token).toStrictEqual('TEST')
    expect(getOracleDataResult.tokenPrices[0].currency).toStrictEqual('USD')
    expect(getOracleDataResult.tokenPrices[0].amount).toStrictEqual(1.0)
    expect(getOracleDataResult.tokenPrices[0].timestamp).toStrictEqual(1621567932)
  })
})
