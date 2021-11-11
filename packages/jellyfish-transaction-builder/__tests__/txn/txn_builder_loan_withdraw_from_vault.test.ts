import { DeFiDRpcError, GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'
import { DecodedAddress, fromAddress, fromScript } from '@defichain/jellyfish-address'
import { Script } from 'packages/jellyfish-transaction/src/tx'
import { VaultActive, VaultLiquidation, VaultState } from 'packages/jellyfish-api-core/src/category/loan'

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
        amounts: '100@TSLA'
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

    it('should failed as vault must contain min 50% of DFI', async () => {
      const destination = await tGroup.get(0).generateAddress()
      const decoded = fromAddress(destination, 'regtest')
      const script = decoded?.script as Script

      // set oracle price above spent the utxos and change go into b58 address
      // causing no prevout at address derived directly from elliptic pair, fund for utxo again
      await fundEllipticPair(tGroup.get(0).container, providers.ellipticPair, 10)

      const txn = await builder.loans.withdrawFromVault({
        vaultId: dualCollateralVault,
        to: script,
        // DFI (USD value) remaining will become less than 50%
        // $4000 DFI vs $5000 BTC
        tokenAmount: { token: 0, amount: new BigNumber(6000) }
      }, vaultOwnerScript)

      const promise = sendTransaction(tGroup.get(0).container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('At least 50% of the vault must be in DFI')
    })

    it('should not withdraw from liquidated vault', async () => {
      // liquidated: true
      const ts = Math.floor(new Date().getTime() / 1000)
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, ts, { prices: [{ tokenAmount: '100000@TSLA', currency: 'USD' }] })
      await tGroup.get(0).generate(12)

      const liqVault = await tGroup.get(0).rpc.loan.getVault(liquidatedVault) as VaultLiquidation
      expect(liqVault.state).toStrictEqual(VaultState.IN_LIQUIDATION)

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
