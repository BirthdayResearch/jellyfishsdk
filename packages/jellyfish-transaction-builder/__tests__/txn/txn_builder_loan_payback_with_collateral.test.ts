import BigNumber from 'bignumber.js'
import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RegTestFoundationKeys, RegTest } from '@defichain/jellyfish-network'
import { WIF, Bech32 } from '@defichain/jellyfish-crypto'
import { Testing } from '@defichain/jellyfish-testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { VaultActive } from '@defichain/jellyfish-api-core/dist/category/vault'

describe('loan.paybackWithCollateral()', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let collateralAddress: string
  let mnAddress: string
  let vaultId: string

  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder

  const netInterest = (1 + 0) / 100 // (scheme.rate + loanToken.interest) / 100
  const blocksPerDay = (60 * 60 * 24) / (10 * 60) // 144 in regtest

  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[0].owner.privKey))
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    await setup()

    // Fund 100 DFI UTXO
    await fundEllipticPair(testing.container, providers.ellipticPair, 100)
    await providers.setupMocks() // Required to move utxos
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  async function setup (): Promise<void> {
    mnAddress = RegTestFoundationKeys[0].owner.address
    const pubKey = await providers.ellipticPair.publicKey()
    collateralAddress = Bech32.fromPubKey(pubKey, 'bcrt')
    await testing.token.dfi({ address: collateralAddress, amount: 200000 })

    // oracle setup
    const addr = await testing.container.getNewAddress('', 'legacy')
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' }
    ]
    const oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: '1@DFI', currency: 'USD' },
          { tokenAmount: '1@TSLA', currency: 'USD' },
          { tokenAmount: '1@DUSD', currency: 'USD' }
        ]
      }
    )
    await testing.generate(1)

    // loan scheme setup
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(1),
      id: 'LOAN001'
    })
    await testing.generate(1)

    // collateral token setup
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.generate(1)

    // DUSD token setup
    await testing.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.setCollateralToken({
      token: 'DUSD',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await testing.generate(1)

    // TSLA token setup
    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)

    // mint DUSD
    await testing.token.mint({ symbol: 'DUSD', amount: 20000 })
    await testing.generate(1)

    await testing.rpc.account.utxosToAccount({ [mnAddress]: '20000@DFI' })
    await testing.generate(1)

    // create DUSD-DFI
    await testing.poolpair.create({
      tokenA: 'DUSD',
      tokenB: 'DFI',
      ownerAddress: mnAddress
    })
    await testing.generate(1)

    // add pool liquidity
    await testing.rpc.poolpair.addPoolLiquidity({
      [mnAddress]: ['10000@DFI', '10000@DUSD']
    }, mnAddress)
    await testing.generate(1)

    await testing.rpc.account.accountToAccount(mnAddress, { [collateralAddress]: '5000@DFI' })
    await testing.rpc.account.accountToAccount(mnAddress, { [collateralAddress]: '5000@DUSD' })
    await testing.generate(1)

    // enable loan payback with collateral
    const idDUSD = await testing.token.getTokenId('DUSD')
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/token/${idDUSD}/loan_payback_collateral`]: 'true' } })
    await testing.generate(1)

    // vault setup
    vaultId = await testing.rpc.vault.createVault({
      ownerAddress: await providers.getAddress(),
      loanSchemeId: 'LOAN001'
    })
    await testing.generate(1)
  }

  it('should paybackLoanWithCollateral when collateral is greater than loan', async () => {
    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '2000@DFI'
    })
    await testing.generate(1)

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '2000@DUSD'
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '1000@DUSD'
    })
    await testing.generate(1)

    const idDUSD = await testing.token.getTokenId('DUSD')
    const mintedAmountBefore = (await testing.rpc.token.getToken('DUSD'))[idDUSD].minted

    const vaultBefore = await testing.rpc.vault.getVault(vaultId) as VaultActive
    const collateralAmountBefore = new BigNumber(vaultBefore.collateralAmounts[1].split('@')[0])
    const loanAmountBefore = new BigNumber(vaultBefore.loanAmounts[0].split('@')[0])

    expect(vaultBefore.loanAmounts.some(amt => amt.includes('DUSD'))).toBe(true)
    expect(vaultBefore.interestAmounts.some(amt => amt.includes('DUSD'))).toBe(true)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.paybackWithCollateral({
      vaultId
    }, script)

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(100)
    expect(outs[1].value).toBeGreaterThan(99.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const vaultAfter = await testing.rpc.vault.getVault(vaultId) as VaultActive

    const collateralAmountAfter = new BigNumber(vaultAfter.collateralAmounts[1].split('@')[0])

    expect(vaultAfter.loanAmounts.some(amt => amt.includes('DUSD'))).toBe(false) // paid back all DUSD loans
    expect(vaultAfter.interestAmounts.some(amt => amt.includes('DUSD'))).toBe(false) // paid back all DUSD interest
    expect(vaultAfter.collateralAmounts.some(amt => amt.includes('DUSD'))).toBe(true)
    expect(collateralAmountAfter).toStrictEqual(collateralAmountBefore.minus(loanAmountBefore))

    const storedInterest = await testing.container.call('getstoredinterest', [
      vaultId,
      idDUSD
    ])
    const interestPerBlock = new BigNumber(storedInterest.interestPerBlock).toFixed(8, BigNumber.ROUND_CEIL)
    const interestToHeight = new BigNumber(storedInterest.interestToHeight).toFixed(8, BigNumber.ROUND_CEIL)

    expect(interestPerBlock).toStrictEqual(new BigNumber(0).toFixed(8, BigNumber.ROUND_CEIL))
    expect(interestToHeight).toStrictEqual(new BigNumber(0).toFixed(8, BigNumber.ROUND_CEIL))

    const mintedAmountAfter = (await testing.rpc.token.getToken('DUSD'))[idDUSD].minted
    expect(mintedAmountBefore).toStrictEqual(mintedAmountAfter.plus(loanAmountBefore))
  })

  it('should paybackLoanWithCollateral when loan is greater than collateral', async () => {
    const collateralDUSDAmount = 1000

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '2000@DFI'
    })
    await testing.generate(1)

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: `${collateralDUSDAmount}@DUSD`
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '1100@DUSD'
    })
    await testing.generate(1)

    const idDUSD = await testing.token.getTokenId('DUSD')
    const mintedAmountBefore = (await testing.rpc.token.getToken('DUSD'))[idDUSD].minted

    const vaultBefore = await testing.rpc.vault.getVault(vaultId) as VaultActive
    const loanAmountBefore = new BigNumber(vaultBefore.loanAmounts[0].split('@')[0])

    expect(vaultBefore.collateralAmounts.some(amt => amt.includes('DUSD'))).toBe(true)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.paybackWithCollateral({
      vaultId
    }, script)

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(100)
    expect(outs[1].value).toBeGreaterThan(99.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const vaultAfter = await testing.rpc.vault.getVault(vaultId) as VaultActive

    const interestAmount = new BigNumber(vaultAfter.interestAmounts[0].split('@')[0])
    const loanAmountAfter = new BigNumber(vaultAfter.loanAmounts[0].split('@')[0])

    expect(vaultAfter.collateralAmounts.some(amt => amt.includes('DUSD'))).toBe(false) // used all DUSD collateral
    expect(loanAmountAfter).toStrictEqual(loanAmountBefore.minus(collateralDUSDAmount).plus(interestAmount))

    const storedInterest = await testing.container.call('getstoredinterest', [
      vaultId,
      idDUSD
    ])
    const interestPerBlock = new BigNumber(storedInterest.interestPerBlock).toFixed(8, BigNumber.ROUND_CEIL)
    const interestToHeight = new BigNumber(storedInterest.interestToHeight).toFixed(8, BigNumber.ROUND_CEIL)

    expect(interestAmount.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interestPerBlock)
    expect(interestToHeight).toStrictEqual(new BigNumber(0).toFixed(8, BigNumber.ROUND_CEIL))

    const mintedAmountAfter = (await testing.rpc.token.getToken('DUSD'))[idDUSD].minted
    expect(mintedAmountBefore).toStrictEqual(mintedAmountAfter.plus(collateralDUSDAmount))
  })

  it('should paybackLoanWithCollateral when loan is equal to collateral', async () => {
    const loanDUSDAmount = 1000
    const BN = BigNumber.clone({ DECIMAL_PLACES: 40 })
    const dusdInterestPerBlock = new BN(netInterest * loanDUSDAmount).dividedBy(new BN(365 * blocksPerDay)).toFixed(8, BigNumber.ROUND_CEIL)

    const collateralDUSDAmount = (new BigNumber(loanDUSDAmount).plus(dusdInterestPerBlock)).toNumber()

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '2000@DFI'
    })
    await testing.generate(1)

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: `${collateralDUSDAmount}@DUSD`
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: `${loanDUSDAmount}@DUSD`
    })
    await testing.generate(1)

    const idDUSD = await testing.token.getTokenId('DUSD')
    const mintedAmountBefore = (await testing.rpc.token.getToken('DUSD'))[idDUSD].minted

    const script = await providers.elliptic.script()
    const txn = await builder.loans.paybackWithCollateral({
      vaultId
    }, script)

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(100)
    expect(outs[1].value).toBeGreaterThan(99.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const vaultAfter = await testing.rpc.vault.getVault(vaultId) as VaultActive

    expect(vaultAfter.loanAmounts.some(amt => amt.includes('DUSD'))).toBe(false) // paid back all DUSD loans
    expect(vaultAfter.interestAmounts.some(amt => amt.includes('DUSD'))).toBe(false) // paid back all DUSD interest
    expect(vaultAfter.collateralAmounts.some(amt => amt.includes('DUSD'))).toBe(false) // used all DUSD collateral

    const storedInterest = await testing.container.call('getstoredinterest', [
      vaultId,
      idDUSD
    ])
    const interestPerBlock = new BigNumber(storedInterest.interestPerBlock).toFixed(8, BigNumber.ROUND_CEIL)
    const interestToHeight = new BigNumber(storedInterest.interestToHeight).toFixed(8, BigNumber.ROUND_CEIL)

    expect(interestPerBlock).toStrictEqual(new BigNumber(0).toFixed(8, BigNumber.ROUND_CEIL))
    expect(interestToHeight).toStrictEqual(new BigNumber(0).toFixed(8, BigNumber.ROUND_CEIL))

    const mintedAmountAfter = (await testing.rpc.token.getToken('DUSD'))[idDUSD].minted
    expect(mintedAmountBefore).toStrictEqual(mintedAmountAfter.plus(collateralDUSDAmount))
  })

  it('should paybackLoanWithCollateral when interest is greater than collateral', async () => {
    const collateralDUSDAmount = 0.000001
    const loanDUSDAmount = 1000

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '2000@DFI'
    })
    await testing.generate(1)

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: `${collateralDUSDAmount}@DUSD`
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: `${loanDUSDAmount}@DUSD`
    })
    await testing.generate(1)

    const idDUSD = await testing.token.getTokenId('DUSD')
    const mintedAmountBefore = (await testing.rpc.token.getToken('DUSD'))[idDUSD].minted

    const vaultBefore = await testing.rpc.vault.getVault(vaultId) as VaultActive

    expect(vaultBefore.collateralAmounts.some(amt => amt.includes('DUSD'))).toBe(true)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.paybackWithCollateral({
      vaultId
    }, script)

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(100)
    expect(outs[1].value).toBeGreaterThan(99.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const vaultAfter = await testing.rpc.vault.getVault(vaultId) as VaultActive
    const interestAmount = new BigNumber(vaultAfter.interestAmounts[0].split('@')[0])

    expect(vaultAfter.collateralAmounts.some(amt => amt.includes('DUSD'))).toBe(false) // used all DUSD collateral

    const storedInterest = await testing.container.call('getstoredinterest', [
      vaultId,
      idDUSD
    ])
    const interestPerBlock = new BigNumber(storedInterest.interestPerBlock)
    const mintedAmountAfter = (await testing.rpc.token.getToken('DUSD'))[idDUSD].minted

    expect(interestAmount.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interestPerBlock.times(2).minus(collateralDUSDAmount).toFixed(8, BigNumber.ROUND_CEIL))
    expect(mintedAmountBefore).toStrictEqual(mintedAmountAfter.plus(collateralDUSDAmount))
  })

  it('should paybackLoanWithCollateral when interest is equal to collateral', async () => {
    const loanDUSDAmount = 1000
    const BN = BigNumber.clone({ DECIMAL_PLACES: 40 })
    const dusdInterestPerBlock = new BN(netInterest * loanDUSDAmount).dividedBy(new BN(365 * blocksPerDay)).toFixed(8, BigNumber.ROUND_CEIL)

    const collateralDUSDAmount = dusdInterestPerBlock

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '2000@DFI'
    })
    await testing.generate(1)

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: `${collateralDUSDAmount}@DUSD`
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: `${loanDUSDAmount}@DUSD`
    })
    await testing.generate(1)

    const idDUSD = await testing.token.getTokenId('DUSD')
    const mintedAmountBefore = (await testing.rpc.token.getToken('DUSD'))[idDUSD].minted

    const vaultBefore = await testing.rpc.vault.getVault(vaultId) as VaultActive
    const loanAmountBefore = new BigNumber(vaultBefore.loanAmounts[0].split('@')[0])
    const interestAmountBefore = new BigNumber(vaultBefore.interestAmounts[0].split('@')[0])

    expect(vaultBefore.collateralAmounts.some(amt => amt.includes('DUSD'))).toBe(true)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.paybackWithCollateral({
      vaultId
    }, script)

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(100)
    expect(outs[1].value).toBeGreaterThan(99.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const vaultAfter = await testing.rpc.vault.getVault(vaultId) as VaultActive
    const loanAmountAfter = new BigNumber(vaultAfter.loanAmounts[0].split('@')[0])
    const interestAmountAfter = new BigNumber(vaultAfter.interestAmounts[0].split('@')[0])

    expect(vaultAfter.collateralAmounts.some(amt => amt.includes('DUSD'))).toBe(false) // used all DUSD collateral
    expect(loanAmountBefore).toStrictEqual(loanAmountAfter)
    expect(interestAmountBefore).toStrictEqual(interestAmountAfter)
    expect(vaultAfter.collateralValue).toStrictEqual(vaultBefore.collateralValue.minus(dusdInterestPerBlock))

    const mintedAmountAfter = (await testing.rpc.token.getToken('DUSD'))[idDUSD].minted

    expect(mintedAmountBefore).toStrictEqual(mintedAmountAfter.plus(collateralDUSDAmount))
  })

  it('should paybackLoanWithCollateral when negative interest collateral is greater than collateral', async () => {
    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '2000@DFI'
    })
    await testing.generate(1)

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '1000@DUSD'
    })
    await testing.generate(1)

    const idDUSD = await testing.token.getTokenId('DUSD')
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/token/${idDUSD}/loan_minting_interest`]: '-500' } })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '1000@DUSD'
    })
    await testing.generate(1)

    // accrue negative interest
    await testing.generate(5)

    const mintedAmountBefore = (await testing.rpc.token.getToken('DUSD'))[idDUSD].minted

    const vaultBefore = await testing.rpc.vault.getVault(vaultId) as VaultActive
    const loanAmountBefore = new BigNumber(vaultBefore.loanAmounts[0].split('@')[0])
    const interestAmount = new BigNumber(vaultBefore.interestAmounts[0].split('@')[0])
    expect(interestAmount.toNumber()).toBeLessThan(0)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.paybackWithCollateral({
      vaultId
    }, script)

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(100)
    expect(outs[1].value).toBeGreaterThan(99.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const vaultAfter = await testing.rpc.vault.getVault(vaultId) as VaultActive

    // collateral amount should be equal to the opposite of DUSD interest amount
    const collateralAmount = new BigNumber(vaultAfter.collateralAmounts[1].split('@')[0])
    expect(collateralAmount).toStrictEqual(interestAmount.multipliedBy(-1))

    expect(vaultAfter.loanAmounts.some(amt => amt.includes('DUSD'))).toBe(false) // paid back all DUSD loan
    expect(vaultAfter.interestAmounts.some(amt => amt.includes('DUSD'))).toBe(false) // paid back all DUSD interest

    const storedInterest = await testing.container.call('getstoredinterest', [
      vaultId,
      idDUSD
    ])
    const interestPerBlock = new BigNumber(storedInterest.interestPerBlock).toFixed(8, BigNumber.ROUND_CEIL)
    const interestToHeight = new BigNumber(storedInterest.interestToHeight).toFixed(8, BigNumber.ROUND_CEIL)

    expect(interestPerBlock).toStrictEqual(new BigNumber(0).toFixed(8, BigNumber.ROUND_CEIL))
    expect(interestToHeight).toStrictEqual(new BigNumber(0).toFixed(8, BigNumber.ROUND_CEIL))

    const mintedAmountAfter = (await testing.rpc.token.getToken('DUSD'))[idDUSD].minted
    expect(mintedAmountBefore).toStrictEqual(mintedAmountAfter.plus(loanAmountBefore))
  })

  it('should paybackLoanWithCollateral when negative interest loan is greater than collateral', async () => {
    const collateralDUSDAmount = 1000
    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '2000@DFI'
    })
    await testing.generate(1)

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: `${collateralDUSDAmount}@DUSD`
    })
    await testing.generate(1)

    const idDUSD = await testing.token.getTokenId('DUSD')
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/token/${idDUSD}/loan_minting_interest`]: '-500' } })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '1100@DUSD'
    })
    await testing.generate(1)

    // accrue negative interest
    await testing.generate(5)

    const mintedAmountBefore = (await testing.rpc.token.getToken('DUSD'))[idDUSD].minted

    const vaultBefore = await testing.rpc.vault.getVault(vaultId) as VaultActive
    const loanAmountBefore = new BigNumber(vaultBefore.loanAmounts[0].split('@')[0])
    const interestAmountBefore = new BigNumber(vaultBefore.interestAmounts[0].split('@')[0])
    expect(interestAmountBefore.toNumber()).toBeLessThan(0)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.paybackWithCollateral({
      vaultId
    }, script)

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(100)
    expect(outs[1].value).toBeGreaterThan(99.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const vaultAfter = await testing.rpc.vault.getVault(vaultId) as VaultActive
    const loanAmountAfter = new BigNumber(vaultAfter.loanAmounts[0].split('@')[0])
    const interestAmountAfter = new BigNumber(vaultAfter.interestAmounts[0].split('@')[0])

    expect(loanAmountAfter).toStrictEqual(loanAmountBefore.minus(collateralDUSDAmount).plus(interestAmountAfter))
    expect(vaultAfter.collateralAmounts.some(amt => amt.includes('DUSD'))).toBe(false) // used all DUSD collateral

    const mintedAmountAfter = (await testing.rpc.token.getToken('DUSD'))[idDUSD].minted
    expect(mintedAmountBefore).toStrictEqual(mintedAmountAfter.plus(collateralDUSDAmount))
  })

  it('should not paybackWithCollateral if vault id does not exist', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.paybackWithCollateral({
      vaultId: '0'.repeat(64)
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('PaybackWithCollateralTx: Vault <0000000000000000000000000000000000000000000000000000000000000000> not found (code 16)\', code: -26')
  })

  it('should not paybackWithCollateral if payback of loan with collateral is not active', async () => {
    const idDUSD = await testing.token.getTokenId('DUSD')
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/token/${idDUSD}/loan_payback_collateral`]: 'false' } })
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.paybackWithCollateral({
      vaultId
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'PaybackWithCollateralTx: Payback of DUSD loan with collateral is not currently active (code 16)\', code: -26')
  })

  it('should not paybackWithCollateral if vault has no collateral', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.paybackWithCollateral({
      vaultId
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'PaybackWithCollateralTx: Vault has no collaterals (code 16)\', code: -26')
  })

  it('should not paybackWithCollateral if vault has no DUSD collateral', async () => {
    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '100@DFI'
    })
    await testing.generate(1)
    const script = await providers.elliptic.script()
    const txn = await builder.loans.paybackWithCollateral({
      vaultId
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'PaybackWithCollateralTx: Vault does not have any DUSD collaterals (code 16)\', code: -26')
  })

  it('should not paybackWithCollateral if vault has no loans', async () => {
    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '1000@DUSD'
    })
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.paybackWithCollateral({
      vaultId
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'PaybackWithCollateralTx: Vault has no loans (code 16)\', code: -26')
  })

  it('should not paybackWithCollateral if vault has no DUSD loans', async () => {
    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '2000@DUSD'
    })
    await testing.generate(1)
    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '1000@TSLA'
    })
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.paybackWithCollateral({
      vaultId
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('PaybackWithCollateralTx: Vault does not have any DUSD loans (code 16)\', code: -26')
  })

  it('should throw error if vault does not have enough collateralization ratio defined by loan scheme', async () => {
    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '1500@DFI'
    })
    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '1500@DUSD'
    })
    await testing.generate(1)
    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '100@DUSD'
    })
    await testing.generate(1)
    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '900@TSLA'
    })
    await testing.generate(1)

    const idDUSD = await testing.token.getTokenId('DUSD')
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/token/${idDUSD}/loan_minting_interest`]: '50000000' } })
    await testing.generate(2) // accrue enough interest to drop below collateralization ratio

    const script = await providers.elliptic.script()
    const txn = await builder.loans.paybackWithCollateral({
      vaultId
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('PaybackWithCollateralTx: Vault does not have enough collateralization ratio defined by loan scheme - 107 < 150 (code 16)\', code: -26')
  })
})
