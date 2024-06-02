import { DeFiDRpcError, GenesisKeys, StartFlags } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'
import { DecodedAddress, fromAddress, fromScript } from '@defichain/jellyfish-address'
import { VaultActive, VaultLiquidation } from '@defichain/jellyfish-api-core/src/category/loan'
import { Script } from '@defichain/jellyfish-transaction/src/tx'

describe('loans.withdrawFromVault', () => {
  const tGroup = TestingGroup.create(3, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  let vaultId1: string // for normal use
  let dualCollateralVault: string // for DFI below 50% collateral
  let liquidatedVault: string // for liquidation

  let oracleId: string
  let collateralAddress: string
  let vaultOwnerScript: Script
  let vaultOwnerAddress: string

  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder

  beforeAll(async () => {
    await tGroup.start()
    await tGroup.get(0).container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(tGroup.get(0).container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey))
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    // Fund 30000 DFI UTXO to providers.getAddress() for funds
    await fundEllipticPair(tGroup.get(0).container, providers.ellipticPair, 30000)

    // do the setup
    await setup()

    // Fund 10 DFI UTXO to providers.getAddress() for fees after setup()
    await fundEllipticPair(tGroup.get(0).container, providers.ellipticPair, 10)
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  async function setup (): Promise<void> {
    // token setup
    collateralAddress = await providers.getAddress()
    await tGroup.get(0).token.dfi({ address: collateralAddress, amount: 30000 })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).token.create({ symbol: 'BTC', collateralAddress })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).token.mint({ symbol: 'BTC', amount: 20000 })
    await tGroup.get(0).generate(1)

    // oracle setup
    const addr = await tGroup.get(0).generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' }
    ]
    oracleId = await tGroup.get(0).rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await tGroup.get(0).generate(1)
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
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

    // loan scheme set up
    await tGroup.get(0).rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await tGroup.get(0).generate(1)

    {
      // container/vault 1: for success case, simple withdrawal
      vaultOwnerScript = await providers.elliptic.script()
      const vaultDecoded = fromScript(vaultOwnerScript, 'regtest') as DecodedAddress
      vaultOwnerAddress = vaultDecoded.address
      vaultId1 = await tGroup.get(0).rpc.loan.createVault({
        ownerAddress: vaultOwnerAddress,
        loanSchemeId: 'scheme'
      })
      await tGroup.get(0).generate(1)

      // keep price valid
      const ts = Math.floor(new Date().getTime() / 1000)
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, ts, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, ts, { prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }] })
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, ts, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
      await tGroup.get(0).generate(1)

      // deposit collateral to be withdrawn
      await tGroup.get(0).rpc.loan.depositToVault({
        vaultId: vaultId1, from: collateralAddress, amount: '10000@DFI'
      })
      await tGroup.get(0).generate(1)
    }

    // eslint-disable-next-line no-lone-blocks
    {
      // container/vault 2: loan taken, not liquidated, for certain fail cases
      dualCollateralVault = await tGroup.get(0).rpc.loan.createVault({
        ownerAddress: vaultOwnerAddress,
        loanSchemeId: 'scheme'
      })
      await tGroup.get(0).generate(1)

      // keep price valid
      const ts = Math.floor(new Date().getTime() / 1000)
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, ts, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, ts, { prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }] })
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, ts, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.loan.depositToVault({
        vaultId: dualCollateralVault, from: collateralAddress, amount: '10000@DFI'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.loan.depositToVault({
        vaultId: dualCollateralVault, from: collateralAddress, amount: '1@BTC'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.loan.takeLoan({
        vaultId: dualCollateralVault,
        amounts: '2000@TSLA'
      })
      await tGroup.get(0).generate(1)
    }

    // eslint-disable-next-line no-lone-blocks
    {
      // container/vault 2: loan taken and liquidated, for certain fail cases
      liquidatedVault = await tGroup.get(0).rpc.loan.createVault({
        ownerAddress: vaultOwnerAddress,
        loanSchemeId: 'scheme'
      })
      await tGroup.get(0).generate(1)

      // keep price valid
      const ts = Math.floor(new Date().getTime() / 1000)
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, ts, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, ts, { prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }] })
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, ts, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.loan.depositToVault({
        vaultId: liquidatedVault, from: collateralAddress, amount: '10000@DFI'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.loan.takeLoan({
        vaultId: liquidatedVault,
        amounts: '100@TSLA'
      })
      await tGroup.get(0).generate(1)
    }
  }

  describe('success cases', () => {
    it('should withdrawFromVault', async () => {
      const withdrawAmount = 1234.56
      const vaultBefore = await tGroup.get(0).rpc.loan.getVault(vaultId1) as VaultActive
      const destination = await tGroup.get(0).generateAddress()
      const decoded = fromAddress(destination, 'regtest')
      const script = decoded?.script as Script
      const txn = await builder.loans.withdrawFromVault({
        vaultId: vaultId1,
        to: script,
        tokenAmount: { token: 0, amount: new BigNumber(withdrawAmount) }
      }, vaultOwnerScript) // take back change to container elliptic pair, as prevout for next test

      // check utxos output
      const outs = await sendTransaction(tGroup.get(0).container, txn)
      expect(outs[0].value).toStrictEqual(0)
      expect(outs[1].value).toBeLessThan(10)
      expect(outs[1].value).toBeGreaterThan(9.999)
      expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(vaultOwnerAddress)

      await tGroup.get(0).generate(1)
      await tGroup.waitForSync()

      // check collateral balance
      const vaultAfter = await tGroup.get(0).rpc.loan.getVault(vaultId1) as VaultActive
      const withdrawnAmount = withdrawAmount * 1 * 1 // deposit 1234 DFI * priceFeed 1 USD * 1 factor
      expect(vaultBefore.collateralValue.minus(vaultAfter.collateralValue)).toStrictEqual(new BigNumber(withdrawnAmount))

      // check received token
      const account = await tGroup.get(0).rpc.account.getAccount(destination)
      expect(account.length).toStrictEqual(1)
      const [amount, tokenSymbol] = account[0].split('@')
      expect(tokenSymbol).toStrictEqual('DFI')
      expect(amount).toStrictEqual('1234.56000000')
    })

    it('should be able to withdrawFromVault to any address (not mine)', async () => {
      const withdrawAmount = 555
      const vaultBefore = await tGroup.get(0).rpc.loan.getVault(vaultId1) as VaultActive

      const destination = await tGroup.get(1).generateAddress() // another MN's address
      const decoded = fromAddress(destination, 'regtest')
      const script = decoded?.script as Script
      const txn = await builder.loans.withdrawFromVault({
        vaultId: vaultId1,
        to: script,
        tokenAmount: { token: 0, amount: new BigNumber(withdrawAmount) }
      }, vaultOwnerScript) // take back change to container elliptic pair, as prevout for next test

      // check utxos output
      const outs = await sendTransaction(tGroup.get(0).container, txn)
      expect(outs[0].value).toStrictEqual(0)
      expect(outs[1].value).toBeLessThan(10)
      expect(outs[1].value).toBeGreaterThan(9.999)
      expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(vaultOwnerAddress)

      await tGroup.get(0).generate(1)
      await tGroup.waitForSync()

      // check collateral balance
      const vaultAfter = await tGroup.get(0).rpc.loan.getVault(vaultId1) as VaultActive
      const withdrawnAmount = withdrawAmount * 1 * 1 // deposit 555 DFI * priceFeed 1 USD * 1 factor
      expect(vaultBefore.collateralValue?.minus(vaultAfter.collateralValue)).toStrictEqual(new BigNumber(withdrawnAmount))

      // check received token
      const account = await tGroup.get(0).rpc.account.getAccount(destination)
      expect(account.length).toStrictEqual(1)
      const [amount, tokenSymbol] = account[0].split('@')
      expect(tokenSymbol).toStrictEqual('DFI')
      expect(amount).toStrictEqual('555.00000000')
    })
  })

  describe('fail cases', () => {
    it('should fail with invalid vaultId', async () => {
      const destination = await tGroup.get(0).generateAddress()
      const decoded = fromAddress(destination, 'regtest')
      const script = decoded?.script as Script

      const txn = await builder.loans.withdrawFromVault({
        vaultId: '0'.repeat(64),
        to: script,
        tokenAmount: { token: 1, amount: new BigNumber(1) }
      }, script)

      const promise = sendTransaction(tGroup.get(0).container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('')
    })

    it('should failed as insufficient collateral token', async () => {
      const script = await providers.elliptic.script()
      const txn = await builder.loans.withdrawFromVault({
        vaultId: vaultId1,
        to: script,
        tokenAmount: { token: 0, amount: new BigNumber(99999) }
      }, vaultOwnerScript)

      const promise = sendTransaction(tGroup.get(0).container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('')
    })

    it('should failed without valid auth (not my vault)', async () => {
      const anotherMnProviders = await getProviders(tGroup.get(1).container)
      anotherMnProviders.setEllipticPair(WIF.asEllipticPair(GenesisKeys[1].owner.privKey))
      await fundEllipticPair(tGroup.get(1).container, anotherMnProviders.ellipticPair, 10)

      // MN 2 sign a withdrawal and withdraw from MN1's vault
      const anotherMnBuilder = new P2WPKHTransactionBuilder(anotherMnProviders.fee, anotherMnProviders.prevout, anotherMnProviders.elliptic, RegTest)
      const destination = await tGroup.get(1).generateAddress() // another MN's address
      const decoded = fromAddress(destination, 'regtest')
      const script = decoded?.script as Script

      const txn = await anotherMnBuilder.loans.withdrawFromVault({
        vaultId: vaultId1, // belongs to MN 1
        to: script,
        tokenAmount: { token: 0, amount: new BigNumber(1) }
      }, vaultOwnerScript)

      const promise = sendTransaction(tGroup.get(1).container, txn)
      await expect(promise).rejects.toThrow('tx must have at least one input from token owner')
    })

    it('should failed as DFI collateral value must contain min 50% of the minimum required collateral', async () => {
      const destination = await tGroup.get(0).generateAddress()
      const decoded = fromAddress(destination, 'regtest')
      const script = decoded?.script as Script

      // set oracle price above spent the utxos and change go into b58 address
      // causing no prevout at address derived directly from elliptic pair, fund for utxo again
      await fundEllipticPair(tGroup.get(0).container, providers.ellipticPair, 10)

      // loan value 4000usd + interest
      // 10,000 - 7000 < (4000+interest) * 1.5 /2
      const txn = await builder.loans.withdrawFromVault({
        vaultId: dualCollateralVault,
        to: script,
        tokenAmount: { token: 0, amount: new BigNumber(7000) }
      }, vaultOwnerScript)

      const promise = sendTransaction(tGroup.get(0).container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'WithdrawFromVaultTx: At least 50% of the minimum required collateral must be in DFI or DUSD\', code: -26')
    })

    it('should not withdraw from liquidated vault', async () => {
      // liquidated: true
      const ts = Math.floor(new Date().getTime() / 1000)
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, ts, { prices: [{ tokenAmount: '100000@TSLA', currency: 'USD' }] })
      await tGroup.get(0).generate(12)

      const liqVault = await tGroup.get(0).rpc.loan.getVault(liquidatedVault) as VaultLiquidation
      expect(liqVault.state).toStrictEqual('inLiquidation')

      // set oracle price above spent the utxos and change go into different address
      // causing no prevout at address derived directly from elliptic pair, fund for utxo again
      await fundEllipticPair(tGroup.get(0).container, providers.ellipticPair, 10)

      const script = await providers.elliptic.script()
      const txn = await builder.loans.withdrawFromVault({
        vaultId: liquidatedVault,
        to: script,
        tokenAmount: { token: 0, amount: new BigNumber(1000) }
      }, vaultOwnerScript)

      const promise = sendTransaction(tGroup.get(0).container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('Cannot withdraw from vault under liquidation')

      // liquidated: false, revert, if more test case below
      const ts2 = Math.floor(new Date().getTime() / 1000)
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, ts2, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
      await tGroup.get(0).generate(12)
    })
  })
})

describe('withdrawFromVault with 50% DUSD or DFI collaterals', () => {
  const tGroup = TestingGroup.create(2)
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)
  let aliceAddr: string
  let bobVaultId: string
  let bobVaultAddr: string
  let bobVault: VaultActive
  let oracleId: string
  let timestamp: number
  const fortCanningRoadHeight = 128

  let bobVaultScript: Script

  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder

  beforeEach(async () => {
    const startFlags: StartFlags[] = [{ name: 'fortcanningroadheight', value: fortCanningRoadHeight }]
    await tGroup.start({ startFlags: startFlags })
    await alice.container.waitForWalletCoinbaseMaturity()
    await bob.container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(bob.container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[1].owner.privKey))
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    await setup()

    // Fund 10 DFI UTXO to providers.getAddress() for funds
    await fundEllipticPair(alice.container, providers.ellipticPair, 10)
    await fundEllipticPair(bob.container, providers.ellipticPair, 10)
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  async function setup (): Promise<void> {
    // token setup
    aliceAddr = await alice.container.getNewAddress()
    await alice.token.dfi({ address: aliceAddr, amount: 40000 })
    await alice.generate(1)

    // oracle setup
    const addr = await alice.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' }
    ]
    oracleId = await alice.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await alice.generate(1)
    timestamp = Math.floor(new Date().getTime() / 1000)
    await alice.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: '1@DFI', currency: 'USD' },
          { tokenAmount: '1@DUSD', currency: 'USD' },
          { tokenAmount: '10000@BTC', currency: 'USD' },
          { tokenAmount: '2@TSLA', currency: 'USD' }
        ]
      })
    await alice.generate(1)

    // collateral token
    await alice.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await alice.generate(1)

    await takeDusdTokensToPayback()

    await alice.rpc.loan.setCollateralToken({
      token: 'DUSD',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await alice.generate(1)

    await alice.token.create({ symbol: 'BTC', collateralAddress: aliceAddr })
    await alice.generate(1)

    await alice.token.mint({ symbol: 'BTC', amount: 4 })
    await alice.generate(1)

    await alice.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await alice.generate(1)

    // loan scheme set up
    await alice.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    // container/vault 1: for success case, simple withdrawal
    bobVaultScript = await providers.elliptic.script()
    const vaultDecoded = fromScript(bobVaultScript, 'regtest') as DecodedAddress
    bobVaultAddr = vaultDecoded.address
    bobVaultId = await bob.rpc.loan.createVault({
      ownerAddress: bobVaultAddr,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    // deposit on active vault
    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '5000@DFI' // collateral value = 5000 USD
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '5000@DUSD' // collateral value = 5000 USD
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '1@BTC' // collateral value = 1 x 10000 x 0.5 = 5000 USD
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    // loan token
    await bob.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await bob.generate(1)

    bobVault = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(bobVault.loanSchemeId).toStrictEqual('scheme')
    expect(bobVault.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(bobVault.state).toStrictEqual('active')
    expect(bobVault.collateralAmounts).toStrictEqual(['5000.00000000@DFI', '5000.00000000@DUSD', '1.00000000@BTC'])
    expect(bobVault.collateralValue).toStrictEqual(new BigNumber(15000))
    expect(bobVault.loanAmounts).toStrictEqual([])
    expect(bobVault.loanValue).toStrictEqual(new BigNumber(0))
    expect(bobVault.interestAmounts).toStrictEqual([])
    expect(bobVault.interestValue).toStrictEqual(new BigNumber(0))
    expect(bobVault.collateralRatio).toStrictEqual(-1) // empty loan
    expect(bobVault.informativeRatio).toStrictEqual(new BigNumber(-1)) // empty loan
  }

  // this will borrow dusd tokens and will give to aliceAddr
  async function takeDusdTokensToPayback (): Promise<void> {
    await alice.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await alice.generate(1)

    const tokenProviderSchemeId = 'LoanDusd'
    await alice.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(0.01),
      id: tokenProviderSchemeId
    })
    await alice.generate(1)

    const tokenProviderVaultAddress = await alice.generateAddress()
    const tokenProviderVaultId = await alice.rpc.loan.createVault({
      ownerAddress: tokenProviderVaultAddress,
      loanSchemeId: tokenProviderSchemeId
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: tokenProviderVaultId,
      from: aliceAddr,
      amount: '10000@DFI'
    })
    await alice.generate(1)

    await alice.rpc.loan.takeLoan({
      vaultId: tokenProviderVaultId,
      amounts: '10000@DUSD',
      to: tokenProviderVaultAddress
    })
    await alice.generate(1)

    await alice.rpc.account.accountToAccount(tokenProviderVaultAddress, { [aliceAddr]: '10000@DUSD' })
  }

  it('should withdrawFromVault - If there is no loan, everything can be withdrawn', async () => {
    const destinationAddress = await alice.generateAddress()
    const accountBalancesBefore = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesBefore.length).toStrictEqual(0)

    // remove dfi collateral, new total collateral = 10000 USD
    const decoded = fromAddress(destinationAddress, 'regtest')
    const script = decoded?.script as Script
    let txn = await builder.loans.withdrawFromVault({
      vaultId: bobVaultId,
      to: script,
      tokenAmount: { token: 0, amount: new BigNumber(5000) }
    }, bobVaultScript)
    let outs = await sendTransaction(bob.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(bobVaultAddr)

    // remove dusd collateral, new total collateral = 5000 USD
    txn = await builder.loans.withdrawFromVault({
      vaultId: bobVaultId,
      to: script,
      tokenAmount: { token: 1, amount: new BigNumber(5000) }
    }, bobVaultScript)
    outs = await sendTransaction(bob.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(bobVaultAddr)

    // remove btc collateral, new total collateral = 0 USD
    txn = await builder.loans.withdrawFromVault({
      vaultId: bobVaultId,
      to: script,
      tokenAmount: { token: 2, amount: new BigNumber(1) }
    }, bobVaultScript)
    outs = await sendTransaction(bob.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(bobVaultAddr)

    await tGroup.waitForSync()

    const accountBalancesAfter = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesAfter.length).toStrictEqual(3)
    expect(accountBalancesAfter).toStrictEqual(['5000.00000000@DFI', '5000.00000000@DUSD', '1.00000000@BTC'])

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.collateralAmounts).toStrictEqual([])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(0))
  })

  it('should withdrawFromVault with 50% DUSD collateral', async () => {
    // must wait until block count reaches fort canning road height
    const blockCount = await bob.container.getBlockCount()
    await bob.generate(fortCanningRoadHeight - blockCount)
    await tGroup.waitForSync()

    const destinationAddress = await alice.generateAddress()
    const accountBalancesBefore = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesBefore.length).toStrictEqual(0)

    const tslaLoanAmount = 2500 // loan amount = 5000 USD
    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })

    const decoded = fromAddress(destinationAddress, 'regtest')
    const script = decoded?.script as Script
    const txn = await builder.loans.withdrawFromVault({
      vaultId: bobVaultId,
      to: script,
      tokenAmount: { token: 0, amount: new BigNumber(5000) }
    }, bobVaultScript)
    const outs = await sendTransaction(bob.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(bobVaultAddr)

    await bob.generate(1)
    await tGroup.waitForSync()

    const accountBalancesAfter = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesAfter.length).toStrictEqual(1)
    expect(accountBalancesAfter[0]).toStrictEqual('5000.00000000@DFI')

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.collateralAmounts).toStrictEqual(['5000.00000000@DUSD', '1.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(10000))
  })

  // TODO(jingyi2811): Temporarily skip failed flaky test. See issue 1474.
  it.skip('should withdrawFromVault with 50% DUSD of minimum required collateral', async () => {
    // add btc collateral, new total collateral = 20000 USD
    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '1@BTC' // collateral value = 1 x 10000 x 0.5 = 5000 USD
    })
    await alice.generate(1)

    // must wait until block count reaches fort canning road height
    const blockCount = await bob.container.getBlockCount()
    await bob.generate(fortCanningRoadHeight - blockCount)
    await tGroup.waitForSync()

    const destinationAddress = await alice.generateAddress()
    const accountBalancesBefore = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesBefore.length).toStrictEqual(0)

    const tslaLoanAmount = 2500 // loan amount = 5000 USD
    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })

    const decoded = fromAddress(destinationAddress, 'regtest')
    const script = decoded?.script as Script
    const txn = await builder.loans.withdrawFromVault({
      vaultId: bobVaultId,
      to: script,
      tokenAmount: { token: 0, amount: new BigNumber(5000) }
    }, bobVaultScript)
    const outs = await sendTransaction(bob.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(bobVaultAddr)

    await bob.generate(1)
    await tGroup.waitForSync()

    const accountBalancesAfter = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesAfter.length).toStrictEqual(1)
    expect(accountBalancesAfter[0]).toStrictEqual('5000.00000000@DFI')

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.collateralAmounts).toStrictEqual(['5000.00000000@DUSD', '2.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(15000))
  })

  it('should withdrawFromVault with 25% DFI + 25% DUSD collateral', async () => {
    // must wait until block count reaches fort canning road height
    const blockCount = await bob.container.getBlockCount()
    await bob.generate(fortCanningRoadHeight - blockCount)
    await tGroup.waitForSync()

    const destinationAddress = await alice.generateAddress()
    const accountBalancesBefore = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesBefore.length).toStrictEqual(0)

    // remove dfi collateral, new total collateral = 12500 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: destinationAddress, amount: '2500@DFI'
    })

    await fundEllipticPair(bob.container, providers.ellipticPair, 10)

    const tslaLoanAmount = 2500 // loan amount = 5000 USD
    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })

    // remove dusd collateral, new total collateral = 10000 USD
    const decoded = fromAddress(destinationAddress, 'regtest')
    const script = decoded?.script as Script
    const txn = await builder.loans.withdrawFromVault({
      vaultId: bobVaultId,
      to: script,
      tokenAmount: { token: 1, amount: new BigNumber(2500) }
    }, bobVaultScript)
    const outs = await sendTransaction(bob.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(bobVaultAddr)

    await tGroup.waitForSync()

    const accountBalancesAfter = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesAfter.length).toStrictEqual(2)
    expect(accountBalancesAfter[0]).toStrictEqual('2500.00000000@DFI')
    expect(accountBalancesAfter[1]).toStrictEqual('2500.00000000@DUSD')

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.collateralAmounts).toStrictEqual(['2500.00000000@DFI', '2500.00000000@DUSD', '1.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(10000))
  })

  it('should not withdrawFromVault with 50% DUSD collateral before reaching fort canning road height', async () => {
    const destinationAddress = await alice.generateAddress()
    const accountBalancesBefore = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesBefore.length).toStrictEqual(0)

    const tslaLoanAmount = 2500 // loan amount = 5000 USD
    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })

    // remove dfi collateral, new total collateral = 10000 USD
    const decoded = fromAddress(destinationAddress, 'regtest')
    const script = decoded?.script as Script
    const txn = await builder.loans.withdrawFromVault({
      vaultId: bobVaultId,
      to: script,
      tokenAmount: { token: 0, amount: new BigNumber(5000) }
    }, bobVaultScript)
    const outs = sendTransaction(bob.container, txn)
    await expect(outs).rejects.toThrow(DeFiDRpcError)
    await expect(outs).rejects.toThrow('At least 50% of the minimum required collateral must be in DFI')
  })

  // TODO(jingyi2811): Temporarily skip failed flaky test. See issue 1474.
  it.skip('should not takeLoan with 33.33% DUSD collateral', async () => {
    // add btc collateral, new total collateral = 20000 USD
    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '1@BTC' // collateral value = 1 x 10000 x 0.5 = 5000 USD
    })
    await alice.generate(1)

    // must wait until block count reaches fort canning road height
    const blockCount = await bob.container.getBlockCount()
    await bob.generate(fortCanningRoadHeight - blockCount)
    await tGroup.waitForSync()

    const destinationAddress = await alice.generateAddress()
    const accountBalancesBefore = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesBefore.length).toStrictEqual(0)

    const tslaLoanAmount = 3750 // loan amount = 7500 USD
    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    // remove dfi collateral, new total collateral = 15000 USD
    const decoded = fromAddress(destinationAddress, 'regtest')
    const script = decoded?.script as Script
    const txn = await builder.loans.withdrawFromVault({
      vaultId: bobVaultId,
      to: script,
      tokenAmount: { token: 0, amount: new BigNumber(5000) }
    }, bobVaultScript)
    const outs = sendTransaction(bob.container, txn)
    await expect(outs).rejects.toThrow(DeFiDRpcError)
    await expect(outs).rejects.toThrow('At least 50% of the minimum required collateral must be in DFI or DUSD')
  })
})
