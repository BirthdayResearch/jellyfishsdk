import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { GetLoanInfoResult } from 'packages/jellyfish-api-core/src/category/loan'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'

const startingData: GetLoanInfoResult = {
  currentPriceBlock: new BigNumber(102),
  defaults: {
    fixedIntervalBlocks: new BigNumber(6),
    maxPriceDeviationPct: new BigNumber(30),
    minOraclesPerPrice: new BigNumber(1),
    scheme: ''
  },
  nextPriceBlock: new BigNumber(108),
  totals: {
    collateralTokens: new BigNumber(0),
    collateralValue: new BigNumber(0),
    loanTokens: new BigNumber(0),
    loanValue: new BigNumber(0),
    openAuctions: new BigNumber(0),
    openVaults: new BigNumber(0),
    schemes: new BigNumber(0)
  }
}

function now (): number {
  return Math.floor(new Date().getTime() / 1000)
}

describe('Loan - getLoanInfo', () => {
  let container: MasterNodeRegTestContainer
  let testing: Testing
  let collateralOracleId!: string

  beforeEach(async () => {
    container = new MasterNodeRegTestContainer()
    testing = Testing.create(container)
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.token.create({ symbol: 'BTC' })
    await testing.token.create({ symbol: 'ETH' })
    await testing.generate(1)

    collateralOracleId = await testing.rpc.oracle.appointOracle(
      await testing.generateAddress(),
      [
        // collateral tokens, existed
        { token: 'DFI', currency: 'USD' },
        { token: 'BTC', currency: 'USD' },
        { token: 'ETH', currency: 'USD' },

        // to be loan tokens, haven't exist
        { token: 'TSLA', currency: 'USD' },
        { token: 'AMZN', currency: 'USD' }
      ],
      { weightage: 1 }
    )
    await testing.generate(1)
    await testing.rpc.oracle.setOracleData(collateralOracleId, now(), {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '10000@BTC', currency: 'USD' },
        { tokenAmount: '100@ETH', currency: 'USD' },
        { tokenAmount: '5@TSLA', currency: 'USD' },
        { tokenAmount: '5@AMZN', currency: 'USD' }
      ]
    })
    await testing.generate(1)
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should count collateral tokens', async () => {
    {
      // Before setCollateralToken
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(startingData)
    }

    // set collateral 1
    await testing.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await testing.generate(1)

    { // After setCollateralToken 1
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...startingData,
        totals: {
          ...startingData.totals,
          collateralTokens: new BigNumber(1)
        }
      })
    }

    // set collateral 2
    await testing.rpc.loan.setCollateralToken({
      token: 'ETH',
      factor: new BigNumber(0.8),
      fixedIntervalPriceId: 'ETH/USD'
    })
    await testing.generate(1)

    { // After setCollateralToken 2
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...startingData,
        totals: {
          ...startingData.totals,
          collateralTokens: new BigNumber(2)
        }
      })
    }
  })

  it('should count loan tokens', async () => {
    {
      // Before setLoanToken
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(startingData)
    }

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)

    { // After setLoanToken 1
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...startingData,
        totals: {
          ...startingData.totals,
          loanTokens: new BigNumber(1)
        }
      })
    }

    await testing.rpc.loan.setLoanToken({
      symbol: 'AMZN',
      fixedIntervalPriceId: 'AMZN/USD'
    })
    await testing.generate(1)

    { // After setLoanToken 2
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...startingData,
        totals: {
          ...startingData.totals,
          loanTokens: new BigNumber(2)
        }
      })
    }
  })

  it('should return with latest current price block and next price block', async () => {
    {
      // Before setCollateralToken
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(startingData)
    }

    await testing.generate(6)

    {
      // after 6 (fixedIntervalBlocks) blocks
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...startingData,
        currentPriceBlock: new BigNumber(108),
        nextPriceBlock: new BigNumber(114)
      })
    }
  })

  it('should return with latest default loan scheme and total scheme count', async () => {
    { // before createLoanScheme
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(startingData)
    }

    await testing.rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(2),
      id: 'scheme1'
    })
    await testing.container.generate(1)

    { // After createLoanScheme
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...startingData,
        totals: {
          ...startingData.totals,
          schemes: new BigNumber(1)
        },
        defaults: {
          ...startingData.defaults,
          scheme: 'scheme1' // first created scheme automatically used as default
        }
      })
    }

    await testing.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(0.5),
      id: 'scheme2'
    })
    await testing.container.generate(1)
    await testing.rpc.loan.setDefaultLoanScheme('scheme2')
    await testing.container.generate(1)

    { // After create and set new default scheme
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...startingData,
        totals: {
          ...startingData.totals,
          schemes: new BigNumber(2)
        },
        defaults: {
          ...startingData.defaults,
          scheme: 'scheme2' // first created scheme automatically used as default
        }
      })
    }
  })

  it('should count total open vaults (deposited and empty) and total collateral deposited', async () => {
    // extra preps
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD',
      activateAfterBlock: await testing.rpc.blockchain.getBlockCount() + 1
    })
    await testing.generate(2)

    // require at one scheme for vault creation
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(2),
      id: 'scheme1'
    })
    await testing.container.generate(1)

    const extendedStartingData: GetLoanInfoResult = {
      ...startingData,
      defaults: {
        ...startingData.defaults,
        scheme: 'scheme1'
      },
      totals: {
        ...startingData.totals,
        schemes: new BigNumber(1),
        collateralTokens: new BigNumber(1)
      }
    }

    { // before
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(extendedStartingData)
    }

    // create vault and deposit collateral
    const vault1Id = await testing.rpc.loan.createVault({
      ownerAddress: await testing.generateAddress()
    })
    await testing.container.generate(1)

    const tempAddress = await testing.generateAddress()
    await testing.token.dfi({ amount: 10000, address: tempAddress })
    await testing.container.generate(1)
    await testing.rpc.loan.depositToVault({
      vaultId: vault1Id,
      from: tempAddress,
      amount: '10000@DFI'
    })
    await testing.container.generate(1)

    { // After create vault 1
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...extendedStartingData,
        currentPriceBlock: new BigNumber(108),
        nextPriceBlock: new BigNumber(114),
        totals: {
          ...startingData.totals,
          collateralTokens: new BigNumber(1),
          collateralValue: new BigNumber(10000),
          schemes: new BigNumber(1),
          openVaults: new BigNumber(1)
        }
      })
    }

    // create empty vault
    await testing.rpc.loan.createVault({
      ownerAddress: await testing.generateAddress()
    })
    await testing.container.generate(1)

    { // After create 2nd vault without deposit collateral
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...extendedStartingData,
        currentPriceBlock: new BigNumber(108),
        nextPriceBlock: new BigNumber(114),
        totals: {
          ...startingData.totals,
          collateralTokens: new BigNumber(1),
          collateralValue: new BigNumber(10000),
          schemes: new BigNumber(1),
          openVaults: new BigNumber(2) // unchanged
        }
      })
    }
  })

  it('should return with total taken loan usd value', async () => {
    // extra preps
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD',
      activateAfterBlock: await testing.rpc.blockchain.getBlockCount() + 1
    })
    await testing.generate(2) // ensure collateral token activated

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.container.generate(1)

    await testing.rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(2),
      id: 'scheme1'
    })
    await testing.container.generate(1)

    const vault1Id = await testing.rpc.loan.createVault({
      ownerAddress: await testing.generateAddress()
    })
    await testing.container.generate(1)

    const tempAddress = await testing.generateAddress()
    await testing.token.dfi({ amount: 10000, address: tempAddress })
    await testing.container.generate(1)
    await testing.rpc.loan.depositToVault({
      vaultId: vault1Id,
      from: tempAddress,
      amount: '10000@DFI'
    })
    await testing.container.generate(1)

    const extendedStartingData: GetLoanInfoResult = {
      ...startingData,
      currentPriceBlock: new BigNumber(108),
      nextPriceBlock: new BigNumber(114),
      defaults: {
        ...startingData.defaults,
        scheme: 'scheme1'
      },
      totals: {
        ...startingData.totals,
        schemes: new BigNumber(1),
        collateralTokens: new BigNumber(1),
        collateralValue: new BigNumber(10000),
        openVaults: new BigNumber(1),
        loanTokens: new BigNumber(1)
      }
    }

    { // before
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(extendedStartingData)
    }

    await testing.rpc.loan.takeLoan({
      vaultId: vault1Id,
      amounts: '2@TSLA'
    })
    await testing.container.generate(1)

    { // After loan taken
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...extendedStartingData,
        totals: {
          ...extendedStartingData.totals,
          loanValue: expect.any(BigNumber)
        }
      })
      // loan value will include some interest
      expect(data.totals.loanValue.gt(10)) // 2 * 5
      expect(data.totals.loanValue.lt(10.0001))
    }

    await testing.rpc.loan.takeLoan({
      vaultId: vault1Id,
      amounts: '1@TSLA'
    })
    await testing.container.generate(1)

    { // After loan taken
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...extendedStartingData,
        totals: {
          ...extendedStartingData.totals,
          loanValue: expect.any(BigNumber)
        }
      })
      // loan value will include some interest
      expect(data.totals.loanValue.gt(15)).toBeTruthy() // 3 * 5
      expect(data.totals.loanValue.lt(15.0001)).toBeTruthy()
    }
  })

  it('should return with updated loan related governance variables (delayed effect, currentpriceblock must not be affected)', async () => {
    { // before
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(startingData)
    }

    await testing.rpc.masternode.setGov({
      ORACLE_BLOCK_INTERVAL: 7
    })
    await testing.generate(1)

    { // after govvar set
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...startingData,
        defaults: {
          ...startingData.defaults,
          fixedIntervalBlocks: new BigNumber(6)
        }
      })
    }

    await testing.container.waitForBlockHeight(111)

    { // after govvar activated, activation height automatically selected by consensus
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...startingData,
        currentPriceBlock: new BigNumber(112),
        nextPriceBlock: new BigNumber(119),
        defaults: {
          ...startingData.defaults,
          fixedIntervalBlocks: new BigNumber(7)
        }
      })
    }
  })

  it('should count all ongoing auctions', async () => {
    // extra preps
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD',
      activateAfterBlock: await testing.rpc.blockchain.getBlockCount() + 1
    })
    await testing.generate(2) // ensure collateral token activated

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.container.generate(1)

    await testing.rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(2),
      id: 'scheme1'
    })
    await testing.container.generate(1)

    const vault1Id = await testing.rpc.loan.createVault({
      ownerAddress: await testing.generateAddress()
    })
    await testing.container.generate(1)

    const tempAddress = await testing.generateAddress()
    await testing.token.dfi({ amount: 10000, address: tempAddress })
    await testing.container.generate(1)
    await testing.rpc.loan.depositToVault({
      vaultId: vault1Id,
      from: tempAddress,
      amount: '10000@DFI'
    })
    await testing.container.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId: vault1Id,
      amounts: '500@TSLA'
    })
    await testing.container.generate(1)

    const extendedStartingData: GetLoanInfoResult = {
      ...startingData,
      currentPriceBlock: new BigNumber(108),
      nextPriceBlock: new BigNumber(114),
      defaults: {
        ...startingData.defaults,
        scheme: 'scheme1'
      },
      totals: {
        ...startingData.totals,
        schemes: new BigNumber(1),
        collateralTokens: new BigNumber(1),
        collateralValue: new BigNumber(10000),
        openVaults: new BigNumber(1),
        loanTokens: new BigNumber(1),
        loanValue: expect.any(BigNumber)
      }
    }

    { // before any vault liquidated
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(extendedStartingData)
    }

    await testing.rpc.oracle.setOracleData(collateralOracleId, now(), {
      prices: [
        { tokenAmount: '21@TSLA', currency: 'USD' }
      ]
    })
    await testing.container.generate(12)

    { // After loan taken
      const auctions = await testing.container.call('listauctions')
      expect(auctions.length).toStrictEqual(1)

      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...extendedStartingData,
        currentPriceBlock: expect.any(BigNumber),
        nextPriceBlock: expect.any(BigNumber),
        totals: {
          ...extendedStartingData.totals,
          // vault liquidated
          openVaults: new BigNumber(1),
          collateralValue: new BigNumber(0),
          openAuctions: new BigNumber(1)
        }
      })
    }
  })

  it('should check openAuctions to reflect auction batch count', async () => {
    // extra preps
    await testing.rpc.oracle.setOracleData(collateralOracleId, now(), {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '10000@BTC', currency: 'USD' },
        { tokenAmount: '101@ETH', currency: 'USD' },
        { tokenAmount: '10@TSLA', currency: 'USD' },
        { tokenAmount: '4@AMZN', currency: 'USD' }
      ]
    })
    await testing.generate(11)

    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD',
      activateAfterBlock: await testing.rpc.blockchain.getBlockCount() + 1
    })
    await testing.generate(2) // ensure collateral token activated

    await testing.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'BTC/USD',
      activateAfterBlock: await testing.rpc.blockchain.getBlockCount() + 1
    })
    await testing.generate(2) // ensure collateral token activated

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.container.generate(1)

    await testing.rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(2),
      id: 'scheme1'
    })
    await testing.container.generate(1)

    await testing.rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(1.5),
      id: 'scheme2'
    })
    await testing.container.generate(1)

    const vaultOwnerAddress = await testing.generateAddress()
    const vault1Id = await testing.rpc.loan.createVault({
      ownerAddress: vaultOwnerAddress
    })
    await testing.container.generate(1)

    await testing.token.dfi({ amount: 100000, address: vaultOwnerAddress })
    await testing.container.generate(1)
    await testing.rpc.loan.depositToVault({
      vaultId: vault1Id,
      from: vaultOwnerAddress,
      amount: '100000@DFI'
    })
    await testing.container.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId: vault1Id,
      amounts: '1000@TSLA'
    })
    await testing.container.generate(12)

    const extendedStartingData: GetLoanInfoResult = {
      ...startingData,
      currentPriceBlock: new BigNumber(132),
      nextPriceBlock: new BigNumber(138),
      defaults: {
        ...startingData.defaults,
        scheme: 'scheme1'
      },
      totals: {
        ...startingData.totals,
        schemes: new BigNumber(2),
        collateralTokens: new BigNumber(2),
        collateralValue: new BigNumber(100000),
        openVaults: new BigNumber(1),
        loanTokens: new BigNumber(1),
        loanValue: expect.any(BigNumber)
      }
    }

    { // before
      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual(extendedStartingData)
    }

    await testing.rpc.oracle.setOracleData(collateralOracleId, now(), {
      prices: [
        { tokenAmount: '85@TSLA', currency: 'USD' }
      ]
    })
    await testing.container.generate(12)

    { // After
      const auctions = await testing.container.call('listauctions')
      expect(auctions.length).toStrictEqual(1)
      expect(auctions[0].batchCount).toStrictEqual(10)

      const data = await testing.rpc.loan.getLoanInfo()
      expect(data).toStrictEqual({
        ...extendedStartingData,
        currentPriceBlock: expect.any(BigNumber),
        nextPriceBlock: expect.any(BigNumber),
        totals: {
          ...extendedStartingData.totals,
          // vault liquidated
          openVaults: new BigNumber(1),
          collateralValue: new BigNumber(0),
          schemes: new BigNumber(2),
          openAuctions: new BigNumber(10)
        }
      })
    }
  })
})
