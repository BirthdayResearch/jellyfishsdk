import { MasterNodeRegTestContainer, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder

let oracleId: string

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

describe('update oracle', () => {
  beforeEach(async () => {
    await container.waitForWalletBalanceGTE(1)
  })

  it('should appoint and then update oracle', async () => {
    // Fund 10 DFI UTXO
    await fundEllipticPair(container, providers.ellipticPair, 10)
    await providers.setupMocks() // required to move utxos

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

    oracleId = calculateTxid(appointTxn)
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
  })

  it('should reject invalid update oracle arg - weightage over 100', async () => {
    // Update Oracle
    const script = await providers.elliptic.script()
    await expect(builder.oracles.updateOracle({
      oracleId: oracleId,
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

// TODO(monstrobishi): test account state once RPC calls are in place
