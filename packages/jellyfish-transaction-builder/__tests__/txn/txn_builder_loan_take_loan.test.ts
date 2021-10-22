import { DeFiDRpcError, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'
import { P2WPKH } from '@defichain/jellyfish-address'

describe('loans.takeLoan', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  let vaultId: string
  let vaultAddress: string
  let collateralAddress: string
  let liqVaultId: string

  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder

  beforeAll(async () => {
    await tGroup.start()
    await tGroup.get(0).container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(tGroup.get(0).container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey))
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    // do the setup
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  async function fundForFeesIfUTXONotAvailable (amount: number): Promise<void> {
    const prevouts = await providers.prevout.all()
    if (prevouts.length === 0) {
      // Fund 10 DFI UTXO to providers.getAddress() for fees
      await fundEllipticPair(tGroup.get(0).container, providers.ellipticPair, 10)
    }
  }

  async function setup (): Promise<void> {
    // token setup
    collateralAddress = await tGroup.get(0).container.getNewAddress()
    await tGroup.get(0).token.dfi({ address: collateralAddress, amount: 70000 })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).token.create({ symbol: 'BTC', collateralAddress })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).token.mint({ symbol: 'BTC', amount: 30000 })
    await tGroup.get(0).generate(1)

    // oracle setup
    const addr = await tGroup.get(0).generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'AMZN', currency: 'USD' },
      { token: 'UBER', currency: 'USD' },
      { token: 'CAT', currency: 'USD' },
      { token: 'XYZ', currency: 'USD' }
    ]
    const oracleId = await tGroup.get(0).rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await tGroup.get(0).generate(1)
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '4@AMZN', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '4@UBER', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '2@CAT', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '4@XYZ', currency: 'USD' }] })

    await tGroup.get(0).generate(1)

    // collateral token
    await tGroup.get(0).rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await tGroup.get(0).generate(1)

    // loan token
    await tGroup.get(0).rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.setLoanToken({
      symbol: 'AMZN',
      fixedIntervalPriceId: 'AMZN/USD'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.setLoanToken({
      symbol: 'UBER',
      fixedIntervalPriceId: 'UBER/USD'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.setLoanToken({
      symbol: 'CAT',
      fixedIntervalPriceId: 'CAT/USD'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.setLoanToken({
      symbol: 'XYZ',
      fixedIntervalPriceId: 'XYZ/USD'
    })
    await tGroup.get(0).generate(1)

    // loan scheme set up
    await tGroup.get(0).rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await tGroup.get(0).generate(1)

    vaultAddress = await providers.getAddress()
    vaultId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: vaultAddress,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '10000@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '1@BTC'
    })
    await tGroup.get(0).generate(1)

    // createVault for liquidation
    const liqVaultAddress = await tGroup.get(0).generateAddress()
    liqVaultId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: liqVaultAddress,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: liqVaultId, from: collateralAddress, amount: '10000@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: liqVaultId,
      amounts: '1000@XYZ'
    })
    await tGroup.get(0).generate(1)

    // liquidated: true
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '100000@XYZ', currency: 'USD' }] })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
  }

  it('should takeLoan', async () => {
    const vaultAddress = await providers.getAddress()
    const vaultId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: vaultAddress,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '10000@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '1@BTC'
    })
    await tGroup.get(0).generate(1)

    // fund if UTXO is not available for fees
    await fundForFeesIfUTXONotAvailable(10)

    const vaultBefore = await tGroup.get(0).rpc.loan.getVault(vaultId)
    const script = await providers.elliptic.script()
    const txn = await builder.loans.takeLoan({
      vaultId: vaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 2, amount: new BigNumber(40) }] // 40@TSLA
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(tGroup.get(0).container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    const vaultAfter = await tGroup.get(0).rpc.loan.getVault(vaultId)
    const interestAfter = await tGroup.get(0).rpc.loan.getInterest('scheme', 'TSLA')

    const vaultBeforeLoanTSLAAcc = vaultBefore.loanAmounts?.find((amt: string) => amt.split('@')[1] === 'TSLA')
    const vaultBeforeLoanTSLAAmount = vaultBeforeLoanTSLAAcc !== undefined ? Number(vaultBeforeLoanTSLAAcc?.split('@')[0]) : 0
    const vaultAfterLoanTSLAAcc = vaultAfter.loanAmounts?.find((amt: string) => amt.split('@')[1] === 'TSLA')
    const vaultAfterLoanTSLAAmount = Number(vaultAfterLoanTSLAAcc?.split('@')[0])

    const interestAfterTSLA = interestAfter.find((interest: { 'token': string }) => interest.token === 'TSLA')

    expect(new BigNumber(vaultAfterLoanTSLAAmount - vaultBeforeLoanTSLAAmount)).toStrictEqual(new BigNumber(40).plus(interestAfterTSLA?.totalInterest as BigNumber))
    // check the account of the vault address
    expect(await tGroup.get(0).rpc.account.getAccount(await providers.getAddress())).toStrictEqual(['40.00000000@TSLA'])
  })

  it('should takeLoan to a given address', async () => {
    const vaultAddress = await providers.getAddress()
    const vaultId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: vaultAddress,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '10000@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '1@BTC'
    })
    await tGroup.get(0).generate(1)

    // fund if UTXO is not available for fees
    await fundForFeesIfUTXONotAvailable(10)

    const vaultBefore = await tGroup.get(0).rpc.loan.getVault(vaultId)
    const script = await providers.elliptic.script()
    const toAddress = await tGroup.get(1).generateAddress()
    const txn = await builder.loans.takeLoan({
      vaultId: vaultId,
      to: P2WPKH.fromAddress(RegTest, toAddress, P2WPKH).getScript(),
      tokenAmounts: [{ token: 5, amount: new BigNumber(40) }]
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(tGroup.get(0).container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    const vaultAfter = await tGroup.get(0).rpc.loan.getVault(vaultId)
    const interestAfter = await tGroup.get(0).rpc.loan.getInterest('scheme', 'CAT')

    const vaultBeforeLoanTSLAAcc = vaultBefore.loanAmounts?.find((amt: string) => amt.split('@')[1] === 'CAT')
    const vaultBeforeLoanTSLAAmount = vaultBeforeLoanTSLAAcc !== undefined ? Number(vaultBeforeLoanTSLAAcc?.split('@')[0]) : 0
    const vaultAfterLoanTSLAAcc = vaultAfter.loanAmounts?.find((amt: string) => amt.split('@')[1] === 'CAT')
    const vaultAfterLoanTSLAAmount = Number(vaultAfterLoanTSLAAcc?.split('@')[0])

    const interestAfterTSLA = interestAfter.find((interest: { 'token': string }) => interest.token === 'CAT')
    const interestAccuredTSLA = interestAfterTSLA?.totalInterest

    expect(new BigNumber(vaultAfterLoanTSLAAmount - vaultBeforeLoanTSLAAmount)).toStrictEqual(new BigNumber(40).plus(interestAccuredTSLA as BigNumber))
    // check toAddress account
    expect(await tGroup.get(1).rpc.account.getAccount(toAddress)).toStrictEqual(['40.00000000@CAT'])
  })

  it('should takeLoan multiple tokens', async () => {
    const vaultAddress = await providers.getAddress()
    const vaultId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: vaultAddress,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '10000@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '1@BTC'
    })
    await tGroup.get(0).generate(1)

    // fund if UTXO is not available for fees
    await fundForFeesIfUTXONotAvailable(10)

    const vaultBefore = await tGroup.get(0).rpc.loan.getVault(vaultId)
    const script = await providers.elliptic.script()
    const txn = await builder.loans.takeLoan({
      vaultId: vaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 3, amount: new BigNumber(40) }, { token: 4, amount: new BigNumber(30) }] // 40@AMZN, 30@UBER
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(tGroup.get(0).container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    const vaultAfter = await tGroup.get(0).rpc.loan.getVault(vaultId)
    const interestAfter = await tGroup.get(0).rpc.loan.getInterest('scheme')

    const vaultBeforeLoanAMZNAcc = vaultBefore.loanAmounts?.find((amt: string) => amt.split('@')[1] === 'AMZN')
    const vaultBeforeLoanAMZNAmount = vaultBeforeLoanAMZNAcc !== undefined ? Number(vaultBeforeLoanAMZNAcc?.split('@')[0]) : 0
    const vaultBeforeLoanUBERAcc = vaultBefore.loanAmounts?.find((amt: string) => amt.split('@')[1] === 'UBER')
    const vaultBeforeLoanUBERAmount = vaultBeforeLoanUBERAcc !== undefined ? Number(vaultBeforeLoanUBERAcc?.split('@')[0]) : 0

    const vaultAfterLoanAMZNAcc = vaultAfter.loanAmounts?.find((amt: string) => amt.split('@')[1] === 'AMZN')
    const vaultAfterLoanAMZNAmount = Number(vaultAfterLoanAMZNAcc?.split('@')[0])
    const vaultAfterLoanUBERAcc = vaultAfter.loanAmounts?.find((amt: string) => amt.split('@')[1] === 'UBER')
    const vaultAfterLoanUBERAmount = Number(vaultAfterLoanUBERAcc?.split('@')[0])

    const interestAfterAMZN = interestAfter.find((interest: { 'token': string }) => interest.token === 'AMZN')
    const interestAfterUBER = interestAfter.find((interest: { 'token': string }) => interest.token === 'UBER')

    expect(new BigNumber(vaultAfterLoanAMZNAmount - vaultBeforeLoanAMZNAmount)).toStrictEqual(new BigNumber(40).plus(interestAfterAMZN?.totalInterest as BigNumber))
    expect(new BigNumber(vaultAfterLoanUBERAmount - vaultBeforeLoanUBERAmount)).toStrictEqual(new BigNumber(30).plus(interestAfterUBER?.totalInterest as BigNumber))

    // check the account of the vault address
    expect(await tGroup.get(0).rpc.account.getAccount(await providers.getAddress())).toStrictEqual(expect.arrayContaining(['40.00000000@AMZN', '30.00000000@UBER']))
  })

  it('should not takeLoan on nonexistent vault', async () => {
    // fund if UTXO is not available for fees
    await fundForFeesIfUTXONotAvailable(10)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.takeLoan({
      vaultId: '0'.repeat(64),
      to: { stack: [] },
      tokenAmounts: [{ token: 2, amount: new BigNumber(40) }]
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
  })

  it('should not takeLoan on nonexistent loan token', async () => {
    // fund if UTXO is not available for fees
    await fundForFeesIfUTXONotAvailable(10)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.takeLoan({
      vaultId: vaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 1, amount: new BigNumber(40) }] // BTC(1) is not a loan token
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Loan token with id (1) does not exist!')
  })

  it('should not takeLoan by other than the vault owner', async () => {
    // node1 tries to take a loan from node0's vault
    const newProviders = await getProviders(tGroup.get(1).container)
    newProviders.setEllipticPair(WIF.asEllipticPair(GenesisKeys[1].owner.privKey))
    const newBuilder = new P2WPKHTransactionBuilder(newProviders.fee, newProviders.prevout, newProviders.elliptic, RegTest)
    const newScript = await newProviders.elliptic.script()

    // Fund 10 DFI UTXO to newProviders.getAddress() for fees
    await fundEllipticPair(tGroup.get(1).container, newProviders.ellipticPair, 10)

    const txn = await newBuilder.loans.takeLoan({
      vaultId: vaultId,
      to: P2WPKH.fromAddress(RegTest, await newProviders.getAddress(), P2WPKH).getScript(),
      tokenAmounts: [{ token: 2, amount: new BigNumber(40) }]
    }, newScript)

    const promise = sendTransaction(tGroup.get(1).container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('tx must have at least one input from vault owner')
  })

  it('should not takeLoan while exceed vault collateralization ratio', async () => {
    // fund if UTXO is not available for fees
    await fundForFeesIfUTXONotAvailable(10)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.takeLoan({
      vaultId: vaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 2, amount: new BigNumber(300000) }]
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Vault does not have enough collateralization ratio defined by loan scheme')
  })

  it('should not takeLoan on mintable:false token', async () => {
    await tGroup.get(0).container.call('updateloantoken', ['TSLA', { mintable: false }])
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    // fund if UTXO is not available for fees
    await fundForFeesIfUTXONotAvailable(10)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.takeLoan({
      vaultId: vaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 2, amount: new BigNumber(30) }]
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Loan cannot be taken on token with id (2) as "mintable" is currently false')

    await tGroup.get(0).container.call('updateloantoken', ['TSLA', { mintable: true }])
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
  })

  it('should not takeLoan on liquidation vault', async () => {
    const liqVault = await tGroup.get(0).rpc.loan.getVault(liqVaultId)
    expect(liqVault.isUnderLiquidation).toStrictEqual(true)

    // fund if UTXO is not available for fees
    await fundForFeesIfUTXONotAvailable(10)
    const script = await providers.elliptic.script()

    const txn = await builder.loans.takeLoan({
      vaultId: liqVaultId,
      to: { stack: [] },
      tokenAmounts: [{ token: 4, amount: new BigNumber(30) }]
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Cannot take loan on vault under liquidation')
  })
})
