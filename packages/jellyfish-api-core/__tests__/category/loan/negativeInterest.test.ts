import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'
import { VaultActive } from '../../../src/category/loan'

const testing = Testing.create(new MasterNodeRegTestContainer())

let aliceAddr: string
let bobVaultId: string
let bobVaultAddr: string
let bobVault: VaultActive
let oracleId: string
let timestamp: number
const blocksPerDay = (60 * 60 * 24) / (10 * 60) // 144 in regtest
// High interest rate so the change will be significant
const interestRate = 5000
// 5K DUSD Loan
const dusdLoanAmount = 5000
// TSLA loan amount
const tslaLoanAmount = 2500
// AMZN loan amount
const amznLoanAmount = 1666.66

describe('takeLoan with negative interest success', () => {
  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await testing.container.stop()
  })
  async function setup (): Promise<void> {
    // token setup
    aliceAddr = await testing.container.getNewAddress()
    await testing.token.dfi({ address: aliceAddr, amount: 40000 })
    await testing.generate(1)

    // oracle setup
    const addr = await testing.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' }
    ]
    oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, {
      weightage: 1
    })
    await testing.generate(1)
    timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '1@DUSD', currency: 'USD' }
      ]
    })
    await testing.generate(1)

    // collateral token
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.generate(1)

    // loan token
    await testing.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await testing.generate(1)

    // loan scheme set up
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(interestRate),
      id: 'scheme'
    })
    await testing.generate(1)

    bobVaultAddr = await testing.generateAddress()
    bobVaultId = await testing.rpc.vault.createVault({
      ownerAddress: bobVaultAddr,
      loanSchemeId: 'scheme'
    })
    await testing.generate(1)

    // deposit on active vault
    await testing.rpc.vault.depositToVault({
      vaultId: bobVaultId,
      from: aliceAddr,
      amount: '10000@DFI'
    })
    await testing.generate(1)

    bobVault = (await testing.rpc.vault.getVault(bobVaultId)) as VaultActive
    expect(bobVault).toStrictEqual({
      collateralAmounts: ['10000.00000000@DFI'],
      collateralRatio: -1,
      collateralValue: new BigNumber('10000'),
      informativeRatio: new BigNumber('-1'),
      interestAmounts: [],
      interestValue: new BigNumber('0'),
      loanAmounts: [],
      loanSchemeId: 'scheme',
      loanValue: new BigNumber('0'),
      ownerAddress: bobVaultAddr,
      state: 'active',
      vaultId: bobVaultId
    })

    // set negative interest rate to cancel
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/token/1/loan_minting_interest': `-${interestRate}`
      }
    })
    await testing.generate(1)
    const txid = await testing.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${dusdLoanAmount}@DUSD`,
      to: aliceAddr
    })
    expect(typeof txid).toStrictEqual('string')
    await testing.generate(1)

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/token/1/loan_minting_interest': `-${interestRate * 2}`
      }
    })
    await testing.generate(1)
  }

  it('should takeLoan with negative interest and accrue DUSD', async () => {
    const dusdInterestPerBlock = new BigNumber(
      (-(interestRate / 100) * dusdLoanAmount) / (365 * blocksPerDay)
    ) //  netInterest * loanAmt / 365 * blocksPerDay
    const interest = await testing.container.call('getstoredinterest', [
      bobVaultId,
      'DUSD'
    ])
    const vaultAfter = (await testing.rpc.vault.getVault(
      bobVaultId
    )) as VaultActive
    const interestPerBlockBN = new BigNumber(interest.interestPerBlock)
    const interestPerBlock = interestPerBlockBN.toFixed(8, BigNumber.ROUND_CEIL)

    expect(dusdInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(
      interestPerBlock
    )
    expect(vaultAfter).toStrictEqual({
      collateralAmounts: ['10000.00000000@DFI'],
      collateralRatio: 200,
      collateralValue: new BigNumber('10000'),
      informativeRatio: new BigNumber('200.19043991'),
      interestAmounts: ['-4.75646879@DUSD'],
      interestValue: new BigNumber('-4.75646879'),
      loanAmounts: ['4995.24353121@DUSD'],
      loanSchemeId: 'scheme',
      loanValue: new BigNumber('4995.24353121'),
      ownerAddress: bobVaultAddr,
      state: 'active',
      vaultId: bobVaultId
    })

    // // check received loan via getTokenBalances while takeLoan without 'to'
    const tBalances = await testing.rpc.account.getTokenBalances()
    expect(tBalances).toStrictEqual(['30000.00000000@0', '5000.00000000@1']) // tokenId: 2 is DUSD
  })

  it('should fully pay back a vault with negative interest rate', async () => {
    const vaultBefore = (await testing.rpc.vault.getVault(
      bobVaultId
    )) as VaultActive
    const dusdInterestPerBlock = new BigNumber(
      (-(interestRate / 100) * dusdLoanAmount) / (365 * blocksPerDay)
    ) //  netInterest * loanAmt / 365 * blocksPerDay
    const interest = await testing.container.call('getstoredinterest', [
      bobVaultId,
      'DUSD'
    ])
    const interestPerBlockBN = new BigNumber(interest.interestPerBlock)
    const interestPerBlock = interestPerBlockBN.toFixed(8, BigNumber.ROUND_CEIL)
    const afterLoanValue = dusdInterestPerBlock
      .plus(dusdLoanAmount)
      .toFixed(8, BigNumber.ROUND_CEIL)
    const afterLoanAmount = `${afterLoanValue}@DUSD`

    expect(dusdInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(
      interestPerBlock
    )
    expect(vaultBefore).toStrictEqual({
      collateralAmounts: ['10000.00000000@DFI'],
      collateralRatio: 200,
      collateralValue: new BigNumber('10000'),
      informativeRatio: new BigNumber('200.19043991'),
      interestAmounts: ['-4.75646879@DUSD'],
      interestValue: new BigNumber('-4.75646879'),
      loanAmounts: ['4995.24353121@DUSD'],
      loanSchemeId: 'scheme',
      loanValue: new BigNumber('4995.24353121'),
      ownerAddress: bobVaultAddr,
      state: 'active',
      vaultId: bobVaultId
    })

    // payback loan
    await testing.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: afterLoanAmount,
      from: aliceAddr
    })

    // move the chain forward one block
    await testing.generate(1)

    // check that theres no interest and loan amount to pay back
    const vaultAfter = (await testing.rpc.vault.getVault(
      bobVaultId
    )) as VaultActive
    expect(dusdInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(
      interestPerBlock
    )
    expect(vaultAfter).toStrictEqual({
      collateralAmounts: ['10000.00000000@DFI'],
      collateralRatio: -1,
      collateralValue: new BigNumber('10000'),
      informativeRatio: new BigNumber('-1'),
      interestAmounts: [],
      interestValue: new BigNumber('0'),
      loanAmounts: [],
      loanSchemeId: 'scheme',
      loanValue: new BigNumber('0'),
      ownerAddress: bobVaultAddr,
      state: 'active',
      vaultId: bobVaultId
    })
  })

  it('should pay back a vault partially with negative interest rate', async () => {
    const vaultBefore = (await testing.rpc.vault.getVault(
      bobVaultId
    )) as VaultActive
    const dusdInterestPerBlock = new BigNumber(
      (-(interestRate / 100) * dusdLoanAmount) / (365 * blocksPerDay)
    ) //  netInterest * loanAmt / 365 * blocksPerDay
    const interest = await testing.container.call('getstoredinterest', [
      bobVaultId,
      'DUSD'
    ])
    const interestPerBlockBN = new BigNumber(interest.interestPerBlock)
    const interestPerBlock = interestPerBlockBN.toFixed(8, BigNumber.ROUND_CEIL)
    const beforeLoanValue = dusdInterestPerBlock.plus(dusdLoanAmount)
    const paybackLoanAmount = `${beforeLoanValue
      .dividedBy(2)
      .toFixed(8, BigNumber.ROUND_CEIL)}@DUSD`

    expect(dusdInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(
      interestPerBlock
    )
    expect(vaultBefore).toStrictEqual({
      collateralAmounts: ['10000.00000000@DFI'],
      collateralRatio: 200,
      collateralValue: new BigNumber('10000'),
      informativeRatio: new BigNumber('200.19043991'),
      interestAmounts: ['-4.75646879@DUSD'],
      interestValue: new BigNumber('-4.75646879'),
      loanAmounts: ['4995.24353121@DUSD'],
      loanSchemeId: 'scheme',
      loanValue: new BigNumber('4995.24353121'),
      ownerAddress: bobVaultAddr,
      state: 'active',
      vaultId: bobVaultId
    })

    // payback loan
    await testing.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: paybackLoanAmount,
      from: aliceAddr
    })
    // move the chain forward one block
    await testing.generate(1)

    // check that theres no interest and loan amount to pay back
    const vaultAfter = (await testing.rpc.vault.getVault(
      bobVaultId
    )) as VaultActive

    expect(dusdInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(
      interestPerBlock
    )
    expect(vaultAfter).toStrictEqual({
      collateralAmounts: ['10000.00000000@DFI'],
      collateralRatio: 401,
      collateralValue: new BigNumber('10000'),
      informativeRatio: new BigNumber('400.76212233'),
      interestAmounts: ['-2.37597199@DUSD'],
      interestValue: new BigNumber('-2.37597199'),
      loanAmounts: ['2495.24579361@DUSD'],
      loanSchemeId: 'scheme',
      loanValue: new BigNumber('2495.24579361'),
      ownerAddress: bobVaultAddr,
      state: 'active',
      vaultId: bobVaultId
    })
  })
})

describe('takeLoan (multiple) with negative interest success', () => {
  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await testing.container.stop()
  })
  async function setup (): Promise<void> {
    // token setup
    aliceAddr = await testing.container.getNewAddress()
    await testing.token.dfi({ address: aliceAddr, amount: 40000 })
    await testing.generate(1)

    // oracle setup
    const addr = await testing.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'AMZN', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' }
    ]
    oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, {
      weightage: 1
    })
    await testing.generate(1)
    timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '2@TSLA', currency: 'USD' },
        { tokenAmount: '3@AMZN', currency: 'USD' },
        { tokenAmount: '1@DUSD', currency: 'USD' }
      ]
    })
    await testing.generate(1)

    // collateral token
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.generate(1)

    // loan token
    await testing.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'AMZN',
      fixedIntervalPriceId: 'AMZN/USD'
    })
    await testing.generate(1)

    // loan scheme set up
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(interestRate),
      id: 'scheme'
    })
    await testing.generate(1)

    bobVaultAddr = await testing.generateAddress()
    bobVaultId = await testing.rpc.vault.createVault({
      ownerAddress: bobVaultAddr,
      loanSchemeId: 'scheme'
    })
    await testing.generate(1)

    // deposit on active vault
    await testing.rpc.vault.depositToVault({
      vaultId: bobVaultId,
      from: aliceAddr,
      amount: '30000@DFI'
    })
    await testing.generate(1)

    bobVault = (await testing.rpc.vault.getVault(bobVaultId)) as VaultActive
    expect(bobVault).toStrictEqual({
      collateralAmounts: ['30000.00000000@DFI'],
      collateralRatio: -1,
      collateralValue: new BigNumber('30000'),
      informativeRatio: new BigNumber('-1'),
      interestAmounts: [],
      interestValue: new BigNumber('0'),
      loanAmounts: [],
      loanSchemeId: 'scheme',
      loanValue: new BigNumber('0'),
      ownerAddress: bobVaultAddr,
      state: 'active',
      vaultId: bobVaultId
    })

    // set negative interest rate to cancel
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/token/1/loan_minting_interest': `-${interestRate}`
      }
    })
    await testing.generate(1)
    await testing.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${dusdLoanAmount}@DUSD`,
      to: aliceAddr
    })
    await testing.generate(1)
    await testing.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`,
      to: aliceAddr
    })
    await testing.generate(1)
    await testing.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${amznLoanAmount}@AMZN`,
      to: aliceAddr
    })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/token/1/loan_minting_interest': `-${interestRate * 2}`
      }
    })
    await testing.generate(1)
  }

  it('should fully pay back a vault with multiple loans including negative interest rate loan', async () => {
    const vaultBefore = (await testing.rpc.vault.getVault(
      bobVaultId
    )) as VaultActive
    const afterLoanValue = new BigNumber('4995.24353121') // DUSD value
    const afterLoanAmount = `${afterLoanValue.toFixed(
      8,
      BigNumber.ROUND_CEIL
    )}@DUSD`

    expect(vaultBefore).toStrictEqual({
      collateralAmounts: ['30000.00000000@DFI'],
      collateralRatio: 200,
      collateralValue: new BigNumber('30000'),
      informativeRatio: new BigNumber('199.74690951'),
      interestAmounts: [
        '-4.75646879@DUSD',
        '7.13470320@TSLA',
        '3.17096652@AMZN'
      ],
      interestValue: new BigNumber('19.02583717'),
      loanAmounts: [
        '4995.24353121@DUSD',
        '2507.13470320@TSLA',
        '1669.83096652@AMZN'
      ],
      loanSchemeId: 'scheme',
      loanValue: new BigNumber('15019.00583717'),
      ownerAddress: bobVaultAddr,
      state: 'active',
      vaultId: bobVaultId
    })

    // payback loan
    await testing.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: afterLoanAmount,
      from: aliceAddr
    })

    // move the chain forward one block
    await testing.generate(1)

    // check that theres no interest and loan amount to pay back
    const vaultAfter = (await testing.rpc.vault.getVault(
      bobVaultId
    )) as VaultActive
    expect(vaultAfter).toStrictEqual({
      collateralAmounts: ['30000.00000000@DFI'],
      collateralRatio: 299,
      collateralValue: new BigNumber('30000'),
      informativeRatio: new BigNumber('299.00505396'),
      interestAmounts: ['9.51293760@TSLA', '4.75644978@AMZN'],
      interestValue: new BigNumber('33.29522454'),
      loanAmounts: ['2509.51293760@TSLA', '1671.41644978@AMZN'],
      loanSchemeId: 'scheme',
      loanValue: new BigNumber('10033.27522454'),
      ownerAddress: bobVaultAddr,
      state: 'active',
      vaultId: bobVaultId
    })
  })

  it('should pay back a vault partially with multiple loans including negative interest rate loan', async () => {
    const vaultBefore = (await testing.rpc.vault.getVault(
      bobVaultId
    )) as VaultActive
    const paybackLoanAmount = '2995@DUSD'

    expect(vaultBefore).toStrictEqual({
      collateralAmounts: ['30000.00000000@DFI'],
      collateralRatio: 200,
      collateralValue: new BigNumber('30000'),
      informativeRatio: new BigNumber('199.74690951'),
      interestAmounts: [
        '-4.75646879@DUSD',
        '7.13470320@TSLA',
        '3.17096652@AMZN'
      ],
      interestValue: new BigNumber('19.02583717'),
      loanAmounts: [
        '4995.24353121@DUSD',
        '2507.13470320@TSLA',
        '1669.83096652@AMZN'
      ],
      loanSchemeId: 'scheme',
      loanValue: new BigNumber('15019.00583717'),
      ownerAddress: bobVaultAddr,
      state: 'active',
      vaultId: bobVaultId
    })

    // payback loan
    await testing.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: paybackLoanAmount,
      from: aliceAddr
    })
    // move the chain forward one block
    await testing.generate(1)

    // check that theres no interest and loan amount to pay back
    const vaultAfter = (await testing.rpc.vault.getVault(
      bobVaultId
    )) as VaultActive

    expect(vaultAfter).toStrictEqual({
      collateralAmounts: ['30000.00000000@DFI'],
      collateralRatio: 249,
      collateralValue: new BigNumber('30000'),
      informativeRatio: new BigNumber('249.34306545'),
      interestAmounts: [
        '-1.90281918@DUSD',
        '9.51293760@TSLA',
        '4.75644978@AMZN'
      ],
      interestValue: new BigNumber('31.39240536'),
      loanAmounts: [
        '1998.34071203@DUSD',
        '2509.51293760@TSLA',
        '1671.41644978@AMZN'
      ],
      loanSchemeId: 'scheme',
      loanValue: new BigNumber('12031.61593657'),
      ownerAddress: bobVaultAddr,
      state: 'active',
      vaultId: bobVaultId
    })
  })
})
