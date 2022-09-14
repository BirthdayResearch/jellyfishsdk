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

    bobVault = await testing.rpc.vault.getVault(bobVaultId) as VaultActive
    expect(bobVault.loanSchemeId).toStrictEqual('scheme')
    expect(bobVault.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(bobVault.state).toStrictEqual('active')
    expect(bobVault.collateralAmounts).toStrictEqual(['10000.00000000@DFI'])
    expect(bobVault.collateralValue).toStrictEqual(new BigNumber(10000))
    expect(bobVault.loanAmounts).toStrictEqual([])
    expect(bobVault.loanValue).toStrictEqual(new BigNumber(0))
    expect(bobVault.interestAmounts).toStrictEqual([])
    expect(bobVault.interestValue).toStrictEqual(new BigNumber(0))
    expect(bobVault.collateralRatio).toStrictEqual(-1) // empty loan
    expect(bobVault.informativeRatio).toStrictEqual(new BigNumber(-1)) // empty loan

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
    const dusdInterestPerBlock = new BigNumber((-(interestRate / 100) * dusdLoanAmount) / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    const interest = await testing.container.call('getstoredinterest', [bobVaultId, 'DUSD'])
    const vaultAfter = await testing.rpc.vault.getVault(bobVaultId) as VaultActive
    const interestPerBlockBN = new BigNumber(interest.interestPerBlock)
    const interestPerBlock = interestPerBlockBN.toFixed(8, BigNumber.ROUND_CEIL)
    const afterLoanValue = dusdInterestPerBlock.plus(dusdLoanAmount).toFixed(8, BigNumber.ROUND_CEIL)
    const afterLoanAmount = `${afterLoanValue}@DUSD`

    expect(dusdInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interestPerBlock)
    expect(vaultAfter.loanSchemeId).toStrictEqual('scheme')
    expect(vaultAfter.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(vaultAfter.state).toStrictEqual('active')
    expect(vaultAfter.collateralAmounts).toStrictEqual(['10000.00000000@DFI'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(10000))
    expect(vaultAfter.loanValue.toFixed(8, BigNumber.ROUND_CEIL))
      .toStrictEqual(afterLoanValue)
    expect(vaultAfter.loanAmounts[0])
      .toStrictEqual(afterLoanAmount)
    expect(vaultAfter.interestAmounts).toStrictEqual([`${interestPerBlock}@DUSD`])
    expect(vaultAfter.interestValue).toStrictEqual(new BigNumber(0))
    expect(vaultAfter.collateralRatio).toStrictEqual(200)
    expect(vaultAfter.informativeRatio).toStrictEqual(new BigNumber('200.19043991000000'))

    // // check received loan via getTokenBalances while takeLoan without 'to'
    const tBalances = await testing.rpc.account.getTokenBalances()
    expect(tBalances).toStrictEqual(['30000.00000000@0', '5000.00000000@1']) // tokenId: 2 is DUSD
  })

  it('should fully pay back a vault with negative interest rate', async () => {
    const vaultBefore = await testing.rpc.vault.getVault(bobVaultId) as VaultActive
    const dusdInterestPerBlock = new BigNumber((-(interestRate / 100) * dusdLoanAmount) / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    const interest = await testing.container.call('getstoredinterest', [bobVaultId, 'DUSD'])
    const interestPerBlockBN = new BigNumber(interest.interestPerBlock)
    const interestPerBlock = interestPerBlockBN.toFixed(8, BigNumber.ROUND_CEIL)
    const afterLoanValue = dusdInterestPerBlock.plus(dusdLoanAmount).toFixed(8, BigNumber.ROUND_CEIL)
    const afterLoanAmount = `${afterLoanValue}@DUSD`

    expect(dusdInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interestPerBlock)
    expect(vaultBefore.loanSchemeId).toStrictEqual('scheme')
    expect(vaultBefore.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(vaultBefore.state).toStrictEqual('active')
    expect(vaultBefore.collateralAmounts).toStrictEqual(['10000.00000000@DFI'])
    expect(vaultBefore.collateralValue).toStrictEqual(new BigNumber(10000))
    expect(vaultBefore.loanValue.toFixed(8, BigNumber.ROUND_CEIL))
      .toStrictEqual(afterLoanValue)
    expect(vaultBefore.loanAmounts[0])
      .toStrictEqual(afterLoanAmount)
    expect(vaultBefore.interestAmounts).toStrictEqual([`${interestPerBlock}@DUSD`])
    expect(vaultBefore.interestValue).toStrictEqual(new BigNumber(0))
    expect(vaultBefore.collateralRatio).toStrictEqual(200)
    expect(vaultBefore.informativeRatio).toStrictEqual(new BigNumber('200.19043991000000'))

    // payback loan
    await testing.rpc.loan.paybackLoan({
      vaultId: bobVaultId,
      amounts: afterLoanAmount,
      from: aliceAddr
    })

    // move the chain forward one block
    await testing.generate(1)

    // check that theres no interest and loan amount to pay back
    const vaultAfter = await testing.rpc.vault.getVault(bobVaultId) as VaultActive
    expect(dusdInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interestPerBlock)
    expect(vaultAfter.loanSchemeId).toStrictEqual('scheme')
    expect(vaultAfter.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(vaultAfter.state).toStrictEqual('active')
    expect(vaultAfter.collateralAmounts).toStrictEqual(['10000.00000000@DFI'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(10000))
    expect(vaultAfter.loanValue).toStrictEqual(new BigNumber(0))
    expect(vaultAfter.loanAmounts).toStrictEqual([])
    expect(vaultAfter.interestAmounts).toStrictEqual([])
    expect(vaultAfter.interestValue).toStrictEqual(new BigNumber(0))
    expect(vaultAfter.collateralRatio).toStrictEqual(-1)
    expect(vaultAfter.informativeRatio).toStrictEqual(new BigNumber(-1))
  })
})
