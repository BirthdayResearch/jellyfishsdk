import { GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'

const container = new LoanMasterNodeRegTestContainer()
const testing = Testing.create(container)

let providers: MockProviders
let builder: P2WPKHTransactionBuilder

let priceFeedId: string

beforeAll(async () => {
  await testing.container.start()
  await testing.container.waitForWalletCoinbaseMaturity()

  providers = await getProviders(testing.container)
  providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[GenesisKeys.length - 1].owner.privKey))
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

  // Default scheme
  await testing.container.call('createloanscheme', [100, new BigNumber(1.5), 'default'])
  await testing.generate(1)

  await testing.token.create({ symbol: 'AAPL' })
  priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
    token: 'AAPL',
    currency: 'EUR'
  }], 1])
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

describe('loan.createLoanScheme()', () => {
  it('should setCollateralToken', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setCollateralToken({
      token: 1,
      factor: new BigNumber(0.5),
      priceFeedId
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
    const data = await testing.container.call('getcollateraltoken', [{ token: 'AAPL' }])
    expect(data).toStrictEqual({
      [collateralTokenId]: {
        token: 'AAPL',
        factor: 0.5,
        priceFeedId,
        activateAfterBlock: expect.any(Number)
      }
    })
  })

  it('should not setCollateralToken if token does not exist', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.loans.setCollateralToken({
      token: 1,
      factor: new BigNumber(0.5),
      priceFeedId
    }, script)
    await expect(promise).rejects.toThrow('RpcApiError: \'Token TSLA does not exist!\', code: -8, method: setcollateraltoken')
  })

  it('should not setCollateralToken if factor is greater than 1', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.loans.setCollateralToken({
      token: 1,
      factor: new BigNumber(1.01),
      priceFeedId
    }, script)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetCollateralTokenTx execution failed:\nsetCollateralToken factor must be lower or equal than 1.00000000!\', code: -32600, method: setcollateraltoken')
  })

  it('should not setCollateralToken if factor is lesser than 0', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.loans.setCollateralToken({
      token: 1,
      factor: new BigNumber(-0.01),
      priceFeedId
    }, script)
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: setcollateraltoken')
  })

  it('should not setCollateralToken if oracleId does not exist', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.loans.setCollateralToken({
      token: 1,
      factor: new BigNumber(0.5),
      priceFeedId: '944d7ce67a0bd6d18e7ba7cbd3ec12ac81a13aa92876cb697ec0b33bf50652f5'
    }, script)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetCollateralTokenTx execution failed:\noracle (944d7ce67a0bd6d18e7ba7cbd3ec12ac81a13aa92876cb697ec0b33bf50652f5) does not exist!\', code: -32600, method: setcollateraltoken')
  })
})

describe('loan.setCollateralToken() with height', () => {
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

    // Fund 10 DFI UTXO
    await fundEllipticPair(testing.container, providers.ellipticPair, 10)
    await providers.setupMocks() // Required to move utxos
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should destroyLoanScheme', async () => {
    const script = await providers.elliptic.script()
    // To setCollateralToken at block 160
    const txn = await builder.loans.setCollateralToken({
      token: 1,
      factor: new BigNumber(0.5),
      priceFeedId,
      activateAfterBlock: 160
    }, script)
    const collateralTokenId = calculateTxid(txn)

    expect(typeof collateralTokenId).toStrictEqual('string')
    expect(collateralTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.container.call('getcollateraltoken', [{ token: 'AAPL', height: 160 }])
    expect(data).toStrictEqual({
      [collateralTokenId]: {
        token: 1,
        factor: 0.5,
        priceFeedId,
        activateAfterBlock: 160
      }
    })

    // Update at block 160
    await testing.container.waitForBlockHeight(160)
  })
})

describe('loan.setCollateralToken() with height lesser than current height', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let providers: MockProviders
  // let builder: P2WPKHTransactionBuilder

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[GenesisKeys.length - 1].owner.privKey))
    // new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

    // Fund 10 DFI UTXO
    await fundEllipticPair(testing.container, providers.ellipticPair, 10)
    await providers.setupMocks() // Required to move utxos
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should not setCollateralToken', async () => {
    await testing.container.waitForBlockHeight(170)

    // To setCollateralToken at block 169
    const promise = testing.rpc.loan.setCollateralToken({
      token: 1,
      factor: new BigNumber(0.5),
      priceFeedId,
      activateAfterBlock: 169
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetCollateralTokenTx execution failed:\nactivateAfterBlock cannot be less than current height!\', code: -32600, method: setcollateraltoken')
  })
})
