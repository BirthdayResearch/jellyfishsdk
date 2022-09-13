
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
// import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
// import { GenesisKeys, StartFlags } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'
// import { TestingGroup } from '@defichain/jellyfish-testing'
// import { RpcApiError } from '@defichain/jellyfish-api-core'
// import { VaultActive, VaultLiquidation } from '../../../src/category/loan'

// const tGroup = TestingGroup.create(2, i => new MasterNodeRegTestContainer(RegTestFoundationKeys[i]))
const testing = Testing.create(new MasterNodeRegTestContainer())

let aliceAddr: string
let bobVaultId: string
let bobVaultAddr: string
// let bobVault: VaultActive
let oracleId: string
let timestamp: number
// const netInterest = (-3 + 0) / 100 // (scheme.rate + loanToken.interest) / 100
// const blocksPerDay = (60 * 60 * 24) / (10 * 60) // 144 in regtest

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
    oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await testing.generate(1)
    timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
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
    const tokens = await testing.rpc.token.listTokens()
    console.log(tokens)
    // loan token
    await testing.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await testing.generate(1)

    // loan scheme set up
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(5),
      id: 'scheme'
    })
    await testing.generate(1)

    bobVaultAddr = await testing.generateAddress()
    bobVaultId = await testing.rpc.loan.createVault({
      ownerAddress: bobVaultAddr,
      loanSchemeId: 'scheme'
    })
    await testing.generate(1)

    // deposit on active vault
    await testing.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '10000@DFI'
    })
    await testing.generate(1)
    // await alice.rpc.masternode.setGov({
    //   ATTRIBUTES: {
    //     'v0/token/1/fixed_interval_price_id': 'DUSD/USD',
    //     'v0/token/1/loan_minting_enabled': 'true',
    //   }
    // })
    // await alice.generate(1)
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/token/1/loan_minting_interest': '-5'
      }
    })
    await testing.generate(1)
    await testing.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '1@DUSD'
    })
    await testing.generate(1)

    // bobVault = await testing.rpc.loan.getVault(bobVaultId) as VaultActive
    // expect(bobVault.loanSchemeId).toStrictEqual('scheme')
    // expect(bobVault.ownerAddress).toStrictEqual(bobVaultAddr)
    // expect(bobVault.state).toStrictEqual('active')
    // expect(bobVault.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@BTC'])
    // expect(bobVault.collateralValue).toStrictEqual(new BigNumber(15000))
    // expect(bobVault.loanAmounts).toStrictEqual([])
    // expect(bobVault.loanValue).toStrictEqual(new BigNumber(0))
    // expect(bobVault.interestAmounts).toStrictEqual([])
    // expect(bobVault.interestValue).toStrictEqual(new BigNumber(0))
    // expect(bobVault.collateralRatio).toStrictEqual(-1) // empty loan
    // expect(bobVault.informativeRatio).toStrictEqual(new BigNumber(-1)) // empty loan
  }

  it('should takeLoan with negative interest and accrue DUSD', async () => {
    console.log('test')
    // const dusdLoanAmount = 20000
    // const txid = await testing.rpc.loan.takeLoan({
    //   vaultId: bobVaultId,
    //   amounts: `${dusdLoanAmount}@DUSD`
    // })
    // expect(typeof txid).toStrictEqual('string')
    // await testing.generate(1)

    // const dusdLoanHeight = await testing.container.getBlockCount()
    // const interests = await testing.rpc.loan.getInterest('scheme')

    // // manually calculate interest to compare rpc getInterest above is working correctly
    // const height = await testing.container.getBlockCount()
    // const dusdInterestPerBlock = new BigNumber((netInterest * 40) / (365 * blocksPerDay)) //  netInterest * loanAmt / 365 * blocksPerDay
    // expect(dusdInterestPerBlock.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].interestPerBlock.toFixed(8))
    // const dusdInterestTotal = dusdInterestPerBlock.multipliedBy(new BigNumber(height - dusdLoanHeight + 1))
    // expect(dusdInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)).toStrictEqual(interests[0].totalInterest.toFixed(8))

    // const dusdLoanAmountAfter = new BigNumber(dusdLoanAmount).plus(dusdInterestTotal).decimalPlaces(8, BigNumber.ROUND_CEIL)

    // const vaultAfter = await testing.rpc.loan.getVault(bobVaultId) as VaultActive
    // expect(vaultAfter.loanSchemeId).toStrictEqual('scheme')
    // expect(vaultAfter.ownerAddress).toStrictEqual(bobVaultAddr)
    // expect(vaultAfter.state).toStrictEqual('active')
    // expect(vaultAfter.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@DUSD'])
    // expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(15000))
    // expect(vaultAfter.loanAmounts).toStrictEqual([`${dusdLoanAmountAfter.toFixed(8)}@DUSD`])
    // expect(vaultAfter.interestAmounts).toStrictEqual([`${dusdInterestTotal.toFixed(8, BigNumber.ROUND_CEIL)}@DUSD`])
    // expect(vaultAfter.loanValue).toStrictEqual(dusdLoanAmountAfter.multipliedBy(2))
    // expect(vaultAfter.interestValue).toStrictEqual(dusdInterestTotal.decimalPlaces(8, BigNumber.ROUND_CEIL).multipliedBy(2))
    // expect(vaultAfter.collateralRatio).toStrictEqual(18750)
    // expect(vaultAfter.informativeRatio).toStrictEqual(new BigNumber(18749.98929375)) // (15000 / 80.00004568) * 100

    // // check received loan via getTokenBalances while takeLoan without 'to'
    // const tBalances = await testing.rpc.account.getTokenBalances()
    // expect(tBalances).toStrictEqual(['40.00000000@2']) // tokenId: 2 is DUSD
  })
})
