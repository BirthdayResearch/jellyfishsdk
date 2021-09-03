import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { OP_CODES, Script } from '@defichain/jellyfish-transaction'
import { getProviders, MockProviders } from '../provider.mock'
import { fundEllipticPair, randomEllipticPair } from '../test.utils'
import { P2WPKHTransactionBuilder } from '../../src'
import { RegTest } from '@defichain/jellyfish-network'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  providers = await getProviders(container)
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await providers.randomizeEllipticPair()
  await container.waitForWalletBalanceGTE(11)
  await fundEllipticPair(container, providers.ellipticPair, 10)
  await providers.setupMocks()
})

const script: Script = {
  stack: [
    OP_CODES.OP_HASH160,
    OP_CODES.OP_PUSHDATA_HEX_LE('0f9acb591b5089224c08e28705cd16908490bb08'),
    OP_CODES.OP_EQUAL
  ]
}

describe('FeeRateProvider', () => {
  it('should fail due to high fee: OVER_MAX_FEE_RATE', async () => {
    const feeProvider = {
      async estimate (): Promise<BigNumber> {
        return await Promise.resolve(new BigNumber('1'))
      }
    }

    const builder = new P2WPKHTransactionBuilder(feeProvider, providers.prevout, providers.elliptic, RegTest)
    await expect(builder.utxo.sendAll(script))
      .rejects.toThrow('attempting to use a fee rate higher than MAX_FEE_RATE of 0.001 is not allowed')
  })

  it('should fail due to invalid fee: INVALID_FEE_RATE', async () => {
    const feeProvider = {
      async estimate (): Promise<BigNumber> {
        return await Promise.resolve(new BigNumber(NaN))
      }
    }

    const builder = new P2WPKHTransactionBuilder(feeProvider, providers.prevout, providers.elliptic, RegTest)
    await expect(builder.utxo.sendAll(script))
      .rejects.toThrow('fee rate NaN is invalid')
  })
})

describe('PrevoutProvider', () => {
  it('should fail due to empty prevout in PrevoutProvider.all(): NO_PREVOUTS', async () => {
    await providers.randomizeEllipticPair()
    await providers.setupMocks()

    const builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
    await expect(builder.utxo.sendAll(script))
      .rejects.toThrow('no prevouts available to create a transaction')
  })

  it('should fail due to empty prevout in PrevoutProvider.collect(): NO_PREVOUTS', async () => {
    await providers.randomizeEllipticPair()
    await providers.setupMocks()

    const builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
    await expect(builder.utxo.sendAll(script))
      .rejects.toThrow('no prevouts available to create a transaction')
  })

  it('should fail balance not enough in PrevoutProvider.collect(): MIN_BALANCE_NOT_ENOUGH', async () => {
    const builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
    await expect(builder.utxo.send(new BigNumber(1000), script, script))
      .rejects.toThrow('not enough balance after combing all prevouts')
  })
})

describe('EllipticPairProvider', () => {
  it('should fail as provided EllipticPair cannot sign transaction: SIGN_TRANSACTION_ERROR', async () => {
    const builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
    providers.elliptic.ellipticPair = randomEllipticPair()

    await expect(builder.utxo.sendAll(script))
      .rejects.toThrow('invalid input option - attempting to sign a mismatch vout and publicKey is not allowed')
  })
})
