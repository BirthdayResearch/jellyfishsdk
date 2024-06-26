import { DeFiDRpcError, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'
import { OP_CODES } from '@defichain/jellyfish-transaction'

describe('loans.createVault', () => {
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

    // Fund 10 DFI UTXO
    await fundEllipticPair(testing.container, providers.ellipticPair, 10)
    await providers.setupMocks() // Required to move utxos

    // Default scheme
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(1.5),
      id: 'default'
    })
    await testing.generate(1)

    await testing.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(2.5),
      id: 'scheme'
    })
    await testing.generate(1)

    await testing.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(3.5),
      id: 'scheme2'
    })
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should createVault', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.createVault({
      ownerAddress: script,
      schemeId: 'scheme'
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(1)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)

    const txid = calculateTxid(txn)
    const data = await testing.rpc.loan.getVault(txid)
    expect(data).toStrictEqual({
      vaultId: txid,
      loanSchemeId: 'scheme',
      ownerAddress: await providers.getAddress(),
      state: 'active',
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: [],
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      interestValue: expect.any(BigNumber),
      collateralRatio: expect.any(Number),
      informativeRatio: expect.any(BigNumber)
    })
  })

  it('should createVault with the default scheme if the given schemeId is empty', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.createVault({
      ownerAddress: script,
      schemeId: ''
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(1)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)

    const txid = calculateTxid(txn)
    const data = await testing.rpc.loan.getVault(txid)
    expect(data).toStrictEqual({
      vaultId: txid,
      loanSchemeId: 'default',
      ownerAddress: await providers.getAddress(),
      state: 'active',
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: [],
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      interestValue: expect.any(BigNumber),
      collateralRatio: expect.any(Number),
      informativeRatio: expect.any(BigNumber)
    })
  })

  it('should createVault and then again createVault with the same parameters', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.createVault({
      ownerAddress: script,
      schemeId: 'scheme2'
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(1)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)

    const txid = calculateTxid(txn)
    const data = await testing.rpc.loan.getVault(txid)
    expect(data).toStrictEqual({
      vaultId: txid,
      loanSchemeId: 'scheme2',
      ownerAddress: await providers.getAddress(),
      state: 'active',
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: [],
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      interestValue: expect.any(BigNumber),
      collateralRatio: expect.any(Number),
      informativeRatio: expect.any(BigNumber)
    })

    await testing.generate(1)

    const txn2 = await builder.loans.createVault({
      ownerAddress: script,
      schemeId: 'scheme2'
    }, script)

    // Ensure the created txn is correct
    const outs2 = await sendTransaction(testing.container, txn2)
    expect(outs2[0].value).toStrictEqual(1)
    expect(outs2[1].value).toBeLessThan(10)
    expect(outs2[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away
    const prevouts2 = await providers.prevout.all()
    expect(prevouts2.length).toStrictEqual(1)
    expect(prevouts2[0].value.toNumber()).toBeLessThan(10)

    const txid2 = calculateTxid(txn2)
    const data2 = await testing.rpc.loan.getVault(txid2)
    expect(data2).toStrictEqual({
      vaultId: txid2,
      loanSchemeId: 'scheme2',
      ownerAddress: await providers.getAddress(),
      state: 'active',
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: [],
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      interestValue: expect.any(BigNumber),
      collateralRatio: expect.any(Number),
      informativeRatio: expect.any(BigNumber)
    })

    // Still it should be two different vaults
    expect(txid2).not.toStrictEqual(txid)
  })

  it('should createVault for any address', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.createVault({
      ownerAddress: {
        stack: [
          OP_CODES.OP_0,
          OP_CODES.OP_PUSHDATA_HEX_LE('7f3b2ccdb32982c3fa5380112dffad8a6792bba9')
        ]
      },
      schemeId: 'scheme'
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(1)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)

    const txid = calculateTxid(txn)
    const data = await testing.rpc.loan.getVault(txid)
    expect(data).toStrictEqual({
      vaultId: txid,
      loanSchemeId: 'scheme',
      ownerAddress: 'bcrt1q0uajendn9xpv87jnsqgjmlad3fne9waf9sxckc',
      state: 'active',
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: [],
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      interestValue: expect.any(BigNumber),
      collateralRatio: expect.any(Number),
      informativeRatio: expect.any(BigNumber)
    })
  })

  it('should not createVault if loanSchemeId is invalid', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.createVault({
      ownerAddress: script,
      schemeId: 'scheme3'
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('VaultTx: Cannot find existing loan scheme with id scheme3\', code: -26')
  })

  it('should not createVault with scheme set to be destroyed', async () => {
    // create another scheme "scheme4"
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(4.5),
      id: 'scheme4'
    })
    await testing.generate(1)

    // To delete at block 150
    await testing.rpc.loan.destroyLoanScheme({ id: 'scheme4', activateAfterBlock: 150 })
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.createVault({
      ownerAddress: script,
      schemeId: 'scheme4'
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('VaultTx: Cannot set scheme4 as loan scheme, set to be destroyed on block 150\', code: -26')
  })
})

describe('loans.createVault when no default scheme and the given schemeId is empty', () => {
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

  beforeEach(async () => {
    // Fund 10 DFI UTXO
    await fundEllipticPair(testing.container, providers.ellipticPair, 10)
    await providers.setupMocks() // Required to move utxos
  })

  it('should not createVault when no default scheme and given schemeId is empty', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.createVault({
      ownerAddress: script,
      schemeId: ''
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'VaultTx: There is no default loan scheme\', code: -26')
  })
})
