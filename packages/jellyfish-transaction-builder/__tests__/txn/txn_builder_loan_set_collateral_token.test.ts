import { GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'

describe('loan.setCollateralToken()', () => {
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
    await testing.container.call('createloanscheme', [100, new BigNumber(1.5), 'default'])
    await testing.generate(1)

    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@AAPL', currency: 'USD' }] })
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should setCollateralToken', async () => {
    // Fund 10 DFI UTXO
    await fundEllipticPair(testing.container, providers.ellipticPair, 10)
    await providers.setupMocks() // Required to move utxos

    const script = await providers.elliptic.script()
    const txn = await builder.loans.setCollateralToken({
      token: 1,
      factor: new BigNumber(0.5),
      currencyPair: { token: 'AAPL', currency: 'USD' },
      activateAfterBlock: 0
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away during create loan scheme
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    const collateralTokenId = calculateTxid(txn)
    const data = await testing.container.call('getcollateraltoken', ['AAPL'])
    expect(data).toStrictEqual({
      token: 'AAPL',
      factor: 0.5,
      fixedIntervalPriceId: 'AAPL/USD',
      activateAfterBlock: await testing.container.getBlockCount(),
      tokenId: collateralTokenId
    })
  })

  it('should not setCollateralToken if token does not exist', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setCollateralToken({
      token: 2,
      factor: new BigNumber(0.5),
      currencyPair: { token: 'AAPL', currency: 'USD' },
      activateAfterBlock: 0
    }, script)
    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'LoanSetCollateralTokenTx: token 2 does not exist! (code 16)\', code: -26')
  })

  it('should not setCollateralToken if factor is greater than 1', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setCollateralToken({
      token: 1,
      factor: new BigNumber(1.01),
      currencyPair: { token: 'AAPL', currency: 'USD' },
      activateAfterBlock: 0
    }, script)
    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'LoanSetCollateralTokenTx: setCollateralToken factor must be lower or equal than 1.00000000! (code 16)\', code: -26')
  })

  it('should not setCollateralToken if currencyPair does not belong to any oracle', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setCollateralToken({
      token: 1,
      factor: new BigNumber(0.5),
      currencyPair: { token: 'MFST', currency: 'USD' },
      activateAfterBlock: 0
    }, script)
    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'LoanSetCollateralTokenTx: Price feed MFST/USD does not belong to any oracle (code 16)\', code: -26')
  })
})

describe('loan.setCollateralToken() with activateAfterBlock', () => {
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
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should setCollateralToken', async () => {
    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@AAPL', currency: 'USD' }] })
    await testing.generate(1)

    // Fund 10 DFI UTXO
    await fundEllipticPair(testing.container, providers.ellipticPair, 10)
    await providers.setupMocks() // Required to move utxos

    // To setCollateralToken at block 160
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setCollateralToken({
      token: 1,
      factor: new BigNumber(0.5),
      currencyPair: { token: 'AAPL', currency: 'USD' },
      activateAfterBlock: 160
    }, script)
    await sendTransaction(testing.container, txn)
    const collateralTokenId = calculateTxid(txn)
    const data = await testing.rpc.loan.listCollateralTokens({ all: true })
    expect(data).toStrictEqual([{
      token: 'AAPL',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'AAPL/USD',
      activateAfterBlock: new BigNumber(160),
      tokenId: collateralTokenId
    }]
    )
  })
})

describe('loan.setCollateralToken() with activateAfterBlock below current height', () => {
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
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should not setCollateralToken', async () => {
    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    // Fund 10 DFI UTXO
    await fundEllipticPair(testing.container, providers.ellipticPair, 10)
    await providers.setupMocks() // Required to move utxos

    // Wait for block 150
    await testing.container.waitForBlockHeight(150)

    // To setCollateralToken at block 149
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setCollateralToken({
      token: 1,
      factor: new BigNumber(0.5),
      currencyPair: { token: 'AAPL', currency: 'USD' },
      activateAfterBlock: 149
    }, script)
    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'LoanSetCollateralTokenTx: activateAfterBlock cannot be less than current height! (code 16)\', code: -26')
  })
})
