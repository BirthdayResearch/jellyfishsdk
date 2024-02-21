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
import { VaultActive } from '@defichain/jellyfish-api-core/src/category/vault'

describe('vault.depositToVault', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  let vaultId: string
  let liqVaultId: string
  let collateralAddress: string

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
    const oracleId = await tGroup.get(0).rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await tGroup.get(0).generate(1)
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '1@DFI',
        currency: 'USD'
      }]
    })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '10000@BTC',
        currency: 'USD'
      }]
    })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@TSLA',
        currency: 'USD'
      }]
    })
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

    const vaultAddress = await tGroup.get(0).generateAddress()
    vaultId = await tGroup.get(0).rpc.vault.createVault({
      ownerAddress: vaultAddress,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    // set up liquidated vault here
    liqVaultId = await tGroup.get(0).rpc.vault.createVault({
      ownerAddress: await tGroup.get(0).generateAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.vault.depositToVault({
      vaultId: liqVaultId, from: collateralAddress, amount: '10000@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.vault.depositToVault({
      vaultId: liqVaultId, from: collateralAddress, amount: '1@BTC'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: liqVaultId,
      amounts: '100@TSLA'
    })
    await tGroup.get(0).generate(1)

    // liquidated: true
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '100000@TSLA',
        currency: 'USD'
      }]
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
  }

  it('should depositToVault', async () => {
    {
      const vaultBefore = await tGroup.get(0).rpc.vault.getVault(vaultId) as VaultActive
      const script = await providers.elliptic.script()
      const txn = await builder.vault.depositToVault({
        vaultId: vaultId,
        from: script,
        tokenAmount: { token: 0, amount: new BigNumber(10000) }
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

      const vaultAfter = await tGroup.get(0).rpc.vault.getVault(vaultId) as VaultActive
      // check the changes after deposit
      // calculate DFI collateral value with factor
      const dfiDeposit = 10000 * 1 * 1 // deposit 10000 DFI * priceFeed 1 USD * 1 factor
      expect(vaultAfter.collateralValue.minus(vaultBefore.collateralValue)).toStrictEqual(new BigNumber(dfiDeposit))
    }

    {
      const vaultBefore = await tGroup.get(0).rpc.vault.getVault(vaultId) as VaultActive
      const script = await providers.elliptic.script()
      const txn = await builder.vault.depositToVault({
        vaultId: vaultId,
        from: script,
        tokenAmount: { token: 1, amount: new BigNumber(1) }
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

      const vaultAfter = await tGroup.get(0).rpc.vault.getVault(vaultId) as VaultActive
      // check the changes after deposit
      // calculate BTC collateral value with factor
      const btcDeposit = 1 * 10000 * 0.5 // deposit 1 BTC * priceFeed 10000 USD * 0.5 factor
      expect(vaultAfter.collateralValue.minus(vaultBefore.collateralValue)).toStrictEqual(new BigNumber(btcDeposit))
    }
  })

  it('should be able to depositToVault by anyone', async () => {
    const vaultBefore = await tGroup.get(0).rpc.vault.getVault(vaultId) as VaultActive

    // test node1 deposits to vault
    const newProviders = await getProviders(tGroup.get(1).container)
    newProviders.setEllipticPair(WIF.asEllipticPair(GenesisKeys[1].owner.privKey))
    const newBuilder = new P2WPKHTransactionBuilder(newProviders.fee, newProviders.prevout, newProviders.elliptic, RegTest)
    const newScript = await newProviders.elliptic.script()

    // fund elliptic pair with 10 DFI for funds
    await fundEllipticPair(tGroup.get(1).container, newProviders.ellipticPair, 10)
    // 2 DFI utxo to account
    await tGroup.get(1).token.dfi({ address: await newProviders.getAddress(), amount: 2 })
    await tGroup.get(1).generate(1) // NOTE(surangap): mempool problem?

    // fund elliptic pair with 10 DFI for fees
    await fundEllipticPair(tGroup.get(1).container, newProviders.ellipticPair, 10)

    const txn = await newBuilder.vault.depositToVault({
      vaultId: vaultId,
      from: newScript,
      tokenAmount: { token: 0, amount: new BigNumber(2) }
    }, newScript)

    const outs = await sendTransaction(tGroup.get(1).container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await newProviders.getAddress())

    // Ensure you don't send all your balance away
    const prevouts = await newProviders.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    await tGroup.get(1).generate(1)
    await tGroup.waitForSync()

    const vaultAfter = await tGroup.get(0).rpc.vault.getVault(vaultId) as VaultActive
    // check the changes after deposit
    // calculate DFI collateral value with factor
    const dfiDeposit = 2 * 1 * 1 // deposit 2 DFI * priceFeed 1 USD * 1 factor
    expect(vaultAfter.collateralValue.minus(vaultBefore.collateralValue)).toStrictEqual(new BigNumber(dfiDeposit))
  })

  // TODO: Logic moved to take loan (need to test it on take loan side instead)
  it.skip('should be failed as first deposit must be DFI', async () => {
    const vaultId = await tGroup.get(0).rpc.vault.createVault({
      ownerAddress: await tGroup.get(0).generateAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)
    // Fund 10 DFI UTXO to providers.getAddress() for fees
    await fundEllipticPair(tGroup.get(0).container, providers.ellipticPair, 10)

    const script = await providers.elliptic.script()
    const txn = await builder.vault.depositToVault({
      vaultId: vaultId,
      from: script,
      tokenAmount: { token: 1, amount: new BigNumber(1) }
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('At least 50% of the vault must be in DFI thus first deposit must be DFI')
  })

  it('should be failed as insufficient fund', async () => {
    // take current balance in account providers.getAddress()
    const AccountBalanceStart = await tGroup.get(0).rpc.account.getAccount(await providers.getAddress())
    const AccountBalanceDFIStart = AccountBalanceStart.find((amt: string) => amt.split('@')[1] === 'DFI')

    const script = await providers.elliptic.script()
    const txn = await builder.vault.depositToVault({
      vaultId: vaultId,
      from: script,
      tokenAmount: { token: 0, amount: new BigNumber(99999) }
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`Insufficient funds: can't subtract balance of ${collateralAddress}: amount ${(AccountBalanceDFIStart as string).split('@')[0]} is less than 99999.00000000`)
  })

  it('should be failed as different auth address', async () => {
    const script = await providers.elliptic.script()
    const newAddress = await tGroup.get(1).generateAddress()
    const fromScript = P2WPKH.fromAddress(RegTest, newAddress, P2WPKH).getScript()

    const txn = await builder.vault.depositToVault({
      vaultId: vaultId,
      from: fromScript,
      tokenAmount: { token: 0, amount: new BigNumber(1) }
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DepositToVaultTx: tx must have at least one input from token owner\', code: -26')
  })

  it('should be failed as vault is not exists', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.vault.depositToVault({
      vaultId: '0'.repeat(64),
      from: script,
      tokenAmount: { token: 0, amount: new BigNumber(99999) }
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
  })

  // TODO: Logic moved to take loan (need to test it on take loan side instead)
  it.skip('should be failed as vault must contain min 50% of DFI', async () => {
    const vaultId = await tGroup.get(0).rpc.vault.createVault({
      ownerAddress: await tGroup.get(0).generateAddress(),
      loanSchemeId: 'scheme'
    })

    await tGroup.get(0).generate(1)
    // Fund 10 DFI UTXO to providers.getAddress() for fees
    await fundEllipticPair(tGroup.get(0).container, providers.ellipticPair, 10)

    await tGroup.get(0).rpc.vault.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '1000@DFI'
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    // deposit * factor >= collateralValue / 2
    const script = await providers.elliptic.script()
    const txn = await builder.vault.depositToVault({
      vaultId: vaultId,
      from: script,
      tokenAmount: { token: 1, amount: new BigNumber(0.22) }
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('At least 50% of the vault must be in DFI')
  })

  it('should not deposit to liquidated vault', async () => {
    await tGroup.get(0).generate(6)

    const liqVault = await tGroup.get(0).rpc.vault.getVault(liqVaultId)
    expect(liqVault.state).toStrictEqual('inLiquidation')

    const script = await providers.elliptic.script()
    const txn = await builder.vault.depositToVault({
      vaultId: liqVaultId,
      from: script,
      tokenAmount: { token: 0, amount: new BigNumber(1000) }
    }, script)

    const promise = sendTransaction(tGroup.get(0).container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('Cannot deposit to vault under liquidation')
  })
})
