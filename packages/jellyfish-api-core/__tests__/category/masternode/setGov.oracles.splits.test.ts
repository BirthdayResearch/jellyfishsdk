import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'

describe('Setgov.oracle.splits - split token', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let tslaID: string
  // let collateralAddress: string

  async function setup (): Promise<void> {
    await testing.generate(9) // Generate 9 blocks to move to block 110

    const blockCount = await testing.rpc.blockchain.getBlockCount()
    expect(blockCount).toStrictEqual(110) // At greatworldheight

    // collateralAddress = await testing.generateAddress()

    await testing.container.call('createloanscheme', [100, 1, 'default'])
    await testing.generate(1)

    const priceFeeds = [
      {
        token: 'TSLA',
        currency: 'USD'
      }
    ]

    const oracleID = await testing.rpc.oracle.appointOracle(await testing.generateAddress(), priceFeeds, { weightage: 1 })
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
      prices: [{
        tokenAmount: '2@TSLA',
        currency: 'USD'
      }]
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)

    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    tslaID = Object.keys(tslaInfo)[0]
  }

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  it('should split token', async () => {
    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes).toStrictEqual({
        ATTRIBUTES: {
          'v0/token/1/fixed_interval_price_id': 'TSLA/USD',
          'v0/token/1/loan_minting_enabled': 'true',
          'v0/token/1/loan_minting_interest': '0'
        }
      }
      )

      const token = await testing.rpc.token.getToken('TSLA')
      const tokenInfo = Object.values(token)[0]
      expect(tokenInfo).toStrictEqual({
        symbol: 'TSLA',
        symbolKey: 'TSLA',
        name: '',
        decimal: new BigNumber(8),
        limit: new BigNumber(0),
        mintable: true,
        tradeable: true,
        isDAT: true,
        isLPS: false,
        finalized: false,
        isLoanToken: true,
        minted: new BigNumber(0),
        creationTx: expect.stringMatching(/[a-zA-Z0-9]{64}/),
        creationHeight: expect.any(BigNumber),
        destructionTx: '0000000000000000000000000000000000000000000000000000000000000000',
        destructionHeight: new BigNumber(-1),
        collateralAddress: ''
      })
    }

    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes).toStrictEqual({
        ATTRIBUTES: {
          'v0/locks/token/2': 'true',
          'v0/token/1/descendant': '2/116',
          'v0/token/2/fixed_interval_price_id': 'TSLA/USD',
          'v0/token/2/loan_minting_enabled': 'true',
          'v0/token/2/loan_minting_interest': '0',
          'v0/token/2/ascendant': '1/split'
        }
      }
      )

      const tokenOriginal = await testing.rpc.token.getToken('TSLA')
      expect(tokenOriginal).toBeDefined()

      const token = await testing.rpc.token.getToken('TSLA/v1')
      const tokenInfo = Object.values(token)[0]
      expect(tokenInfo).toStrictEqual({
        symbol: 'TSLA/v1',
        symbolKey: 'TSLA/v1',
        name: '',
        decimal: new BigNumber(8),
        limit: new BigNumber(0),
        mintable: false,
        tradeable: false,
        isDAT: true,
        isLPS: false,
        finalized: true,
        isLoanToken: false,
        minted: new BigNumber(0),
        creationTx: expect.stringMatching(/[a-zA-Z0-9]{64}/),
        creationHeight: expect.any(BigNumber),
        destructionTx: expect.stringMatching(/[a-zA-Z0-9]{64}/),
        destructionHeight: expect.any(BigNumber),
        collateralAddress: expect.stringMatching(/[a-zA-Z0-9]{34}/)
      }
      )
    }
  })
})

describe('Setgov.oracle.splits - split pool', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let tslaID: string
  let collateralAddress: string

  async function setup (): Promise<void> {
    await testing.generate(9) // Generate 9 blocks to move to block 110

    const blockCount = await testing.rpc.blockchain.getBlockCount()
    expect(blockCount).toStrictEqual(110) // At greatworldheight

    collateralAddress = await testing.generateAddress()

    await testing.token.dfi({
      address: collateralAddress,
      amount: 300000
    })

    await testing.container.call('createloanscheme', [100, 1, 'default'])
    await testing.generate(1)

    const oracleID = await testing.rpc.oracle.appointOracle(await testing.generateAddress(),
      [
        {
          token: 'DFI',
          currency: 'USD'
        },
        {
          token: 'TSLA',
          currency: 'USD'
        }
      ],
      { weightage: 1 })
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
      prices: [{
        tokenAmount: '1@DFI',
        currency: 'USD'
      }, {
        tokenAmount: '1@TSLA',
        currency: 'USD'
      }]
    })

    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)

    const vaultId = await testing.rpc.vault.createVault({
      ownerAddress: collateralAddress,
      loanSchemeId: 'default'
    })
    await testing.generate(12)

    await testing.container.call('deposittovault', [vaultId, collateralAddress, '1@DFI'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId,
      amounts: '1@TSLA'
    }])
    await testing.generate(1)

    await testing.poolpair.create({
      tokenA: 'TSLA',
      tokenB: 'DFI'
    })
    await testing.generate(1)

    await testing.poolpair.add({
      a: { symbol: 'TSLA', amount: 1 },
      b: { symbol: 'DFI', amount: 1 }
    })
    await testing.generate(1)

    const ppTokenID = Object.keys(await testing.rpc.token.getToken('TSLA-DFI'))[0]
    console.log(ppTokenID)

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/poolpairs/${ppTokenID}/token_a_fee_pct`]: '0.01',
        [`v0/poolpairs/${ppTokenID}/token_b_fee_pct`]: '0.03'
      }
    })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ LP_SPLITS: { [Number(ppTokenID)]: 1 } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ LP_LOAN_TOKEN_SPLITS: { [Number(ppTokenID)]: 1 } })
    await testing.generate(1)

    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    tslaID = Object.keys(tslaInfo)[0]
  }

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  it('should split pool', async () => {
    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes).toStrictEqual({
        ATTRIBUTES: {
          'v0/poolpairs/2/token_a_fee_pct': '0.01',
          'v0/poolpairs/2/token_b_fee_pct': '0.03',
          'v0/token/0/fixed_interval_price_id': 'DFI/USD',
          'v0/token/0/loan_collateral_enabled': 'true',
          'v0/token/0/loan_collateral_factor': '1',
          'v0/token/1/fixed_interval_price_id': 'TSLA/USD',
          'v0/token/1/loan_minting_enabled': 'true',
          'v0/token/1/loan_minting_interest': '0'
        }
      }
      )

      const poolPair = await testing.poolpair.get('TSLA-DFI')
      expect(poolPair).toStrictEqual(
        {
          symbol: 'TSLA-DFI',
          name: '-Default Defi token',
          status: true,
          idTokenA: '1',
          idTokenB: '0',
          dexFeePctTokenA: new BigNumber(0.01),
          dexFeePctTokenB: new BigNumber(0.03),
          dexFeeOutPctTokenB: new BigNumber(0.03),
          dexFeeInPctTokenA: new BigNumber(0.01),
          dexFeeInPctTokenB: new BigNumber(0.03),
          dexFeeOutPctTokenA: new BigNumber(0.01),
          reserveA: new BigNumber(1),
          reserveB: new BigNumber(1),
          commission: new BigNumber(0),
          totalLiquidity: new BigNumber(1),
          'reserveA/reserveB': new BigNumber(1),
          'reserveB/reserveA': new BigNumber(1),
          tradeEnabled: true,
          ownerAddress: expect.any(String),
          blockCommissionA: new BigNumber(0),
          blockCommissionB: new BigNumber(0),
          rewardPct: new BigNumber(1),
          rewardLoanPct: new BigNumber(1),
          creationTx: expect.stringMatching(/[a-zA-Z0-9]{64}/),
          creationHeight: expect.any(BigNumber)
        }
      )
    }

    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes).toStrictEqual({
        ATTRIBUTES: {
          'v0/locks/token/3': 'true',
          'v0/poolpairs/4/token_a_fee_pct': '0.01',
          'v0/poolpairs/4/token_b_fee_pct': '0.03',
          'v0/token/0/fixed_interval_price_id': 'DFI/USD',
          'v0/token/0/loan_collateral_enabled': 'true',
          'v0/token/0/loan_collateral_factor': '1',
          'v0/token/1/descendant': '3/135',
          'v0/token/3/ascendant': '1/split',
          'v0/token/3/fixed_interval_price_id': 'TSLA/USD',
          'v0/token/3/loan_minting_enabled': 'true',
          'v0/token/3/loan_minting_interest': '0'
        }
      })

      const poolPairOriginal = await testing.poolpair.get('TSLA-DFI')
      expect(poolPairOriginal).toBeDefined()

      const poolPair = await testing.poolpair.get('TSLA-DFI/v1')
      expect(poolPair).toStrictEqual(
        {
          symbol: 'TSLA-DFI/v1',
          name: '-Default Defi token',
          status: false,
          idTokenA: '1',
          idTokenB: '0',
          reserveA: new BigNumber(0),
          reserveB: new BigNumber(0),
          commission: new BigNumber(0),
          totalLiquidity: new BigNumber(0),
          'reserveA/reserveB': '0',
          'reserveB/reserveA': '0',
          tradeEnabled: false,
          ownerAddress: expect.any(String),
          blockCommissionA: new BigNumber(0),
          blockCommissionB: new BigNumber(0),
          rewardPct: new BigNumber(0),
          rewardLoanPct: new BigNumber(0),
          creationTx: expect.stringMatching(/[a-zA-Z0-9]{64}/),
          creationHeight: expect.any(BigNumber)
        }
      )
    }
  })
})

describe('Setgov.oracle.splits - vault splits', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let collateralAddress: string
  let tslaID: string
  let vaultId: string

  async function setup (): Promise<void> {
    await testing.generate(9) // Generate 9 blocks to move to block 110

    const blockCount = await testing.rpc.blockchain.getBlockCount()
    expect(blockCount).toStrictEqual(110) // At greatworldheight

    collateralAddress = await testing.generateAddress()

    await testing.token.dfi({
      address: collateralAddress,
      amount: 300000
    })

    await testing.container.call('createloanscheme', [100, 1, 'default'])
    await testing.generate(1)

    const oracleID = await testing.rpc.oracle.appointOracle(await testing.generateAddress(),
      [
        {
          token: 'DFI',
          currency: 'USD'
        },
        {
          token: 'TSLA',
          currency: 'USD'
        }
      ],
      { weightage: 1 })
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
      prices: [{
        tokenAmount: '1@DFI',
        currency: 'USD'
      }, {
        tokenAmount: '1@TSLA',
        currency: 'USD'
      }]
    })

    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)

    vaultId = await testing.rpc.vault.createVault({
      ownerAddress: collateralAddress,
      loanSchemeId: 'default'
    })
    await testing.generate(12)

    await testing.container.call('deposittovault', [vaultId, collateralAddress, '1@DFI'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId,
      amounts: '1@TSLA'
    }])
    await testing.generate(1)

    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    tslaID = Object.keys(tslaInfo)[0]
  }

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  it('should split vault', async () => {
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes).toStrictEqual({
      ATTRIBUTES: {
        'v0/token/0/fixed_interval_price_id': 'DFI/USD',
        'v0/token/0/loan_collateral_enabled': 'true',
        'v0/token/0/loan_collateral_factor': '1',
        'v0/token/1/fixed_interval_price_id': 'TSLA/USD',
        'v0/token/1/loan_minting_enabled': 'true',
        'v0/token/1/loan_minting_interest': '0'
      }
    }
    )

    {
      const vault = await testing.rpc.vault.getVault(vaultId)
      expect(vault).toStrictEqual(
        {
          vaultId,
          loanSchemeId: 'default',
          ownerAddress: collateralAddress,
          state: 'active',
          collateralAmounts: ['1.00000000@DFI'],
          loanAmounts: ['1.00000020@TSLA'],
          interestAmounts: ['0.00000020@TSLA'],
          collateralValue: new BigNumber(1),
          loanValue: new BigNumber(1.0000002),
          interestValue: new BigNumber(0.0000002),
          informativeRatio: new BigNumber(99.99998),
          collateralRatio: 100
        }
      )
    }

    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    {
      const vault = await testing.rpc.vault.getVault(vaultId)
      expect(vault).toStrictEqual(
        {
          vaultId,
          loanSchemeId: 'default',
          ownerAddress: collateralAddress,
          state: 'frozen',
          collateralAmounts: ['1.00000000@DFI'],
          loanAmounts: ['2.00000115@TSLA'],
          interestAmounts: ['0.00000115@TSLA'],
          collateralValue: new BigNumber(0),
          loanValue: new BigNumber(0),
          interestValue: new BigNumber(0),
          informativeRatio: new BigNumber(0),
          collateralRatio: 0
        }
      )
    }
  })
})

describe('Setgov.oracle.splits - auction splits', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })
})

describe('Setgov.oracle.splits - refund futureswap', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let collateralAddress: string
  let tslaID: string
  let vaultId: string

  async function setup (): Promise<void> {
    await testing.generate(9) // Generate 9 blocks to move to block 110

    const blockCount = await testing.rpc.blockchain.getBlockCount()
    expect(blockCount).toStrictEqual(110) // At greatworldheight

    collateralAddress = await testing.generateAddress()

    await testing.token.dfi({
      address: collateralAddress,
      amount: 300000
    })

    await testing.container.call('createloanscheme', [100, 1, 'default'])
    await testing.generate(1)

    const oracleID = await testing.rpc.oracle.appointOracle(await testing.generateAddress(),
      [
        {
          token: 'DFI',
          currency: 'USD'
        },
        {
          token: 'TSLA',
          currency: 'USD'
        }
      ],
      { weightage: 1 })
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
      prices: [{
        tokenAmount: '1@DFI',
        currency: 'USD'
      }, {
        tokenAmount: '1@TSLA',
        currency: 'USD'
      }]
    })

    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)

    vaultId = await testing.rpc.vault.createVault({
      ownerAddress: collateralAddress,
      loanSchemeId: 'default'
    })
    await testing.generate(12)

    await testing.container.call('deposittovault', [vaultId, collateralAddress, '1@DFI'])
    await testing.generate(1)

    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    tslaID = Object.keys(tslaInfo)[0]

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'false' } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/reward_pct': '0.05', 'v0/params/dfip2203/block_period': '25' } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'true' } })
    await testing.generate(1)
  }

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  it('should return futureswap', async () => {
    const burnAddress = 'bcrt1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpsqgljc'

    await testing.container.call('takeloan', [{
      vaultId,
      amounts: '1@TSLA'
    }])
    await testing.generate(1)

    await testing.rpc.account.sendTokensToAddress({}, { [collateralAddress]: ['1@TSLA'] })
    await testing.generate(1)

    {
      const balance = await testing.rpc.account.getAccount(burnAddress)
      expect(balance).toStrictEqual([])
    }

    {
      const balance = await testing.rpc.account.getAccount(collateralAddress)
      expect(balance).toStrictEqual([
        '299999.00000000@DFI',
        '1.00000000@TSLA'
      ])
    }

    await testing.rpc.account.futureSwap({
      address: collateralAddress,
      amount: '1@TSLA'
    })
    await testing.generate(1)

    {
      const balance = await testing.rpc.account.getAccount(burnAddress)
      expect(balance).toStrictEqual(['1.00000000@TSLA'])
    }

    {
      const balance = await testing.rpc.account.getAccount(collateralAddress)
      expect(balance).toStrictEqual(['299999.00000000@DFI'])
    }

    // const tokenTSLA = await testing.rpc.token.getToken(tslaID)
    // const newMintedTSLA = tokenTSLA[tslaID].minted.multipliedBy(2)

    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    {
      const balance = await testing.rpc.account.getAccount(burnAddress)
      expect(balance).toStrictEqual([])
    }

    {
      const balance = await testing.rpc.account.getAccount(collateralAddress)
      expect(balance).toStrictEqual([
        '299999.00000000@DFI',
        '2.00000000@TSLA' // 2x1
      ])
    }
  })
})

describe('Setgov.oracle.splits - delete gov vars', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })
})
