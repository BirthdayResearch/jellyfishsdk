import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { VaultLiquidation } from '@defichain/jellyfish-api-core/dist/category/vault'

describe('SetGov v0/oracles/splits', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let tslaID: string
  // let dfiID: string
  let tslaDfiPairID: string

  let collateralAddress: string

  let oracleId: string

  let vaultId1: string // Setup for liquidity pool test
  let vaultId2: string // Setup for vault test
  // let vaultId3: string // Setup for auction test
  let vaultId4: string // Setup for future swap test

  async function setup (): Promise<void> {
    await testing.generate(9) // Generate 9 blocks to move to block 110

    const blockCount = await testing.rpc.blockchain.getBlockCount()
    expect(blockCount).toStrictEqual(110) // At greatworldheight

    collateralAddress = await testing.generateAddress()

    await testing.token.dfi({
      address: collateralAddress,
      amount: 300000
    })

    await testing.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(1),
      id: 'default'
    })

    oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(),
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
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
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
      fixedIntervalPriceId: 'TSLA/USD',
      interest: new BigNumber(1)
    })
    await testing.generate(1)

    // const dfiInfo = await testing.rpc.token.getToken('DFI')
    // dfiID = Object.keys(dfiInfo)[0]

    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    tslaID = Object.keys(tslaInfo)[0]
  }

  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  async function setupPool (): Promise<void> {
    vaultId1 = await testing.rpc.vault.createVault({
      ownerAddress: collateralAddress,
      loanSchemeId: 'default'
    })
    await testing.generate(12)

    await testing.rpc.vault.depositToVault({
      vaultId: vaultId1, from: collateralAddress, amount: '1@DFI'
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId: vaultId1,
      amounts: '1@TSLA'
    })
    await testing.generate(1)

    await testing.poolpair.create({
      tokenA: 'TSLA',
      tokenB: 'DFI'
    })
    await testing.generate(1)

    await container.call('minttokens', ['2000@TSLA'])

    await testing.poolpair.add({
      a: { symbol: 'TSLA', amount: 1 },
      b: { symbol: 'DFI', amount: 1 }
    })
    await testing.generate(1)

    const ppTokenID = Object.keys(await testing.rpc.token.getToken('TSLA-DFI'))[0]

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

    const tslaDfiInfo = await testing.rpc.token.getToken('TSLA-DFI')
    tslaDfiPairID = Object.keys(tslaDfiInfo)[0]
  }

  async function setupActiveVault (): Promise<void> {
    vaultId2 = await testing.rpc.vault.createVault({
      ownerAddress: collateralAddress,
      loanSchemeId: 'default'
    })
    await testing.generate(12)

    await testing.rpc.vault.depositToVault({
      vaultId: vaultId2, from: collateralAddress, amount: '1@DFI'
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId: vaultId2,
      amounts: '1@TSLA'
    })
    await testing.generate(1)
  }

  async function setupFutureSwap (): Promise<void> {
    vaultId4 = await testing.rpc.vault.createVault({
      ownerAddress: collateralAddress,
      loanSchemeId: 'default'
    })
    await testing.generate(12)

    await testing.container.call('deposittovault', [vaultId4, collateralAddress, '1@DFI'])
    await testing.generate(1)

    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    tslaID = Object.keys(tslaInfo)[0]

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'false' } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/reward_pct': '0.05', 'v0/params/dfip2203/block_period': '25' } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'true' } })
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId: vaultId4,
      amounts: '1@TSLA'
    }])
    await testing.generate(1)

    await testing.rpc.account.sendTokensToAddress({}, { [collateralAddress]: ['1@TSLA'] })
    await testing.generate(1)
  }

  async function setupLiquidatedVault (): Promise<void> {
    await setupActiveVault()

    // Going to liquidate the vaults by price increase of the loan tokens
    await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
      prices: [{
        tokenAmount: '1.5@TSLA',
        currency: 'USD'
      }]
    })
    await testing.generate(1)

    await testing.container.waitForActivePrice('TSLA/USD', '1.5')

    const auction = await testing.rpc.vault.listAuctions()
    expect(auction.length).toStrictEqual(1)
    expect(auction[0].state).toStrictEqual('inLiquidation')

    await testing.token.mint({ amount: 0.1, symbol: 'TSLA' })
    await testing.generate(1)

    await testing.rpc.account.sendTokensToAddress({}, { [collateralAddress]: ['1.1@TSLA'] })
    await testing.generate(1)

    await testing.rpc.vault.placeAuctionBid({
      vaultId: vaultId2,
      index: 0,
      from: collateralAddress,
      amount: '1.1@TSLA'
    })
    await testing.generate(1)
  }
  it('should split token', async () => {
    // Get attributes and token before splitting
    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
    }

    const tslaToken = await testing.rpc.token.getToken('TSLA')
    const tslaTokenInfo = Object.values(tslaToken)[0]
    expect(tslaTokenInfo).toStrictEqual({
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
      collateralAddress: expect.stringMatching(/[a-zA-Z0-9]{34}/)
    })

    // Split the oracles
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2) // SetGov always need 2 blocks to execute

    // Get new TSLA Id
    const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
    const newTSLAId = Object.keys(newTSLAInfo)[0]
    expect(newTSLAId).not.toStrictEqual(tslaID) // After splitting, new tsla id is not same with the old one

    // Get new TSLA/v1 info
    const tslaV1Info = await testing.rpc.token.getToken('TSLA/v1')
    const tslaV1Id = Object.keys(tslaV1Info)[0]

    {
      // Get attributes and token after splitting
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')

      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toBeUndefined() // All existing info for old tsla id is removed

      expect(attributes.ATTRIBUTES[`v0/token/${tslaV1Id}/descendant`]).toStrictEqual(`${newTSLAId}/${splitBlock}`) // The original TSLA token has 2 descendant created at splitBlock
      expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('true') // By default every split will lock the ascendant token
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/ascendant`]).toStrictEqual(`${tslaV1Id}/split`) // TSLA is the ascendant of TSLA/v1
    }

    const newTslaToken = await testing.rpc.token.getToken('TSLA')
    const newTslaTokenInfo = Object.values(newTslaToken)[0]
    expect(newTslaTokenInfo).toStrictEqual(newTslaTokenInfo) // Unlike id, there is no changes for any other TSLA content after splitting

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
    })
  })

  it('should split pool', async () => {
    await setupPool()

    // Get attributes and token before splitting
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES[`v0/poolpairs/${tslaDfiPairID}/token_a_fee_pct`]).toStrictEqual('0.01')
    expect(attributes.ATTRIBUTES[`v0/poolpairs/${tslaDfiPairID}/token_b_fee_pct`]).toStrictEqual('0.03')

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

    // Split the oracles
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2) // SetGov always need 2 blocks to execute

    {
      // Get new TSLA-DFI info
      const newTSLADFIPairInfo = await testing.rpc.token.getToken('TSLA-DFI')
      const newTSLADFIPairId = Object.keys(newTSLADFIPairInfo)[0]
      expect(newTSLADFIPairId).not.toStrictEqual(tslaDfiPairID) // After splitting, new tsla-dfi pair id is not same with the old one

      // Get new SLA-DFI/v1 info
      // const tslaDfiV1Info = await testing.rpc.token.getToken('TSLA-DFI/v1')
      // const tslaDfiV1Id = Object.keys(tslaDfiV1Info)[0]

      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')

      expect(attributes.ATTRIBUTES[`v0/poolpairs/${tslaDfiPairID}/token_a_fee_pct`]).toBeUndefined()
      expect(attributes.ATTRIBUTES[`v0/poolpairs/${tslaDfiPairID}/token_b_fee_pct`]).toBeUndefined()
      expect(attributes.ATTRIBUTES[`v0/poolpairs/${newTSLADFIPairId}/token_a_fee_pct`]).toStrictEqual('0.01')
      expect(attributes.ATTRIBUTES[`v0/poolpairs/${newTSLADFIPairId}/token_b_fee_pct`]).toStrictEqual('0.03')

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

  it('should split active vault', async () => {
    await setupActiveVault()

    {
      // Get attributes and token before splitting
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
    }

    {
      // Get vault
      const vault = await testing.rpc.vault.getVault(vaultId2)
      expect(vault).toStrictEqual(
        {
          vaultId: vaultId2,
          loanSchemeId: 'default',
          ownerAddress: collateralAddress,
          state: 'active',
          collateralAmounts: ['1.00000000@DFI'],
          loanAmounts: ['1.00000039@TSLA'],
          interestAmounts: ['0.00000039@TSLA'],
          collateralValue: new BigNumber(1),
          loanValue: new BigNumber(1.00000039),
          interestValue: new BigNumber(0.00000039),
          informativeRatio: new BigNumber(99.999961),
          collateralRatio: 100
        }
      )
    }

    // Split the oracles
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2) // SetGov always need 2 blocks to execute

    {
      // Get attributes and token after splitting
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toBeUndefined() // All existing info for old tsla id is removed

      // Get new TSLA Id
      const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
      const newTSLAId = Object.keys(newTSLAInfo)[0]
      expect(newTSLAId).not.toStrictEqual(tslaID) // After splitting, new tsla id is not same with the old one

      // Get new TSLA/v1 info
      const tslaV1Info = await testing.rpc.token.getToken('TSLA/v1')
      const tslaV1Id = Object.keys(tslaV1Info)[0]

      expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('true') // By default every split will lock the ascendant token

      expect(attributes.ATTRIBUTES[`v0/token/${tslaV1Id}/descendant`]).toStrictEqual(`${newTSLAId}/${splitBlock}`) // The original TSLA token has 2 descendant created at splitBlock
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/ascendant`]).toStrictEqual(`${tslaV1Id}/split`) // TSLA is the ascendant of TSLA/v1
    }

    {
      // Get the same vault again
      const vault = await testing.rpc.vault.getVault(vaultId2)
      expect(vault).toStrictEqual(
        {
          vaultId: vaultId2,
          loanSchemeId: 'default',
          ownerAddress: collateralAddress,
          state: 'frozen',
          collateralAmounts: ['1.00000000@DFI'],
          loanAmounts: ['2.00000229@TSLA'],
          interestAmounts: ['0.00000229@TSLA'],
          collateralValue: new BigNumber(-1),
          loanValue: new BigNumber(-1),
          interestValue: new BigNumber(-1),
          informativeRatio: new BigNumber(-1),
          collateralRatio: -1
        }
      )
    }
  })

  it('should split liquidated vault', async () => {
    await setupLiquidatedVault()

    {
      // Get attributes and token before splitting
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
    }

    {
      // Get vault
      const vault: VaultLiquidation = await testing.rpc.vault.getVault(vaultId2) as VaultLiquidation
      expect(vault).toStrictEqual(
        {
          vaultId: vaultId2,
          loanSchemeId: 'default',
          ownerAddress: collateralAddress,
          state: 'inLiquidation',
          liquidationHeight: 174,
          liquidationPenalty: 5,
          batchCount: 1,
          batches: [{
            collaterals: ['1.00000000@DFI'],
            highestBid: {
              amount: '1.10000000@TSLA',
              owner: collateralAddress
            },
            index: 0,
            loan: '1.00000419@TSLA'
          }]
        }
      )
    }

    // Split the oracles
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2) // SetGov always need 2 blocks to execute

    {
      // Get attributes and token after splitting
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toBeUndefined() // All existing info for old tsla id is removed

      // Get new TSLA Id
      const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
      const newTSLAId = Object.keys(newTSLAInfo)[0]
      expect(newTSLAId).not.toStrictEqual(tslaID) // After splitting, new tsla id is not same with the old one

      // Get new TSLA/v1 info
      const tslaV1Info = await testing.rpc.token.getToken('TSLA/v1')
      const tslaV1Id = Object.keys(tslaV1Info)[0]

      expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('true') // By default every split will lock the ascendant token

      expect(attributes.ATTRIBUTES[`v0/token/${tslaV1Id}/descendant`]).toStrictEqual(`${newTSLAId}/${splitBlock}`) // The original TSLA token has 2 descendant created at splitBlock
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/ascendant`]).toStrictEqual(`${tslaV1Id}/split`) // TSLA is the ascendant of TSLA/v1
    }

    {
      // Get the same vault again
      const vault: VaultLiquidation = await testing.rpc.vault.getVault(vaultId2) as VaultLiquidation
      expect(vault).toStrictEqual(
        {
          vaultId: vaultId2,
          loanSchemeId: 'default',
          ownerAddress: collateralAddress,
          state: 'inLiquidation',
          liquidationHeight: 174,
          liquidationPenalty: 5,
          batchCount: 1,
          batches: [{
            collaterals: ['1.00000000@DFI'],
            highestBid: {
              amount: '2.20000000@TSLA',
              owner: collateralAddress
            },
            index: 0,
            loan: '2.00000838@TSLA'
          }]
        }
      )
    }
  })

  it('should split auction', async () => {
    await setupLiquidatedVault()

    {
      // Get attributes and token before splitting
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
    }

    {
      const auction = await testing.rpc.vault.listAuctions()
      expect(auction.length).toStrictEqual(1)
      expect(auction[0].batches.length).toStrictEqual(1)
      expect(auction[0].batches[0].collaterals).toStrictEqual(['1.00000000@DFI'])
      expect(auction[0].batches[0].loan).toStrictEqual('1.00000419@TSLA')
      expect(auction[0].batches[0].highestBid?.amount).toStrictEqual('1.10000000@TSLA')
    }

    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2) // SetGov always need 2 blocks to execute

    {
      // Get attributes and token after splitting
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toBeUndefined() // All existing info for old tsla id is removed

      // Get new TSLA Id
      const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
      const newTSLAId = Object.keys(newTSLAInfo)[0]
      expect(newTSLAId).not.toStrictEqual(tslaID) // After splitting, new tsla id is not same with the old one

      // Get new TSLA/v1 info
      const tslaV1Info = await testing.rpc.token.getToken('TSLA/v1')
      const tslaV1Id = Object.keys(tslaV1Info)[0]

      expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('true') // By default every split will lock the ascendant token

      expect(attributes.ATTRIBUTES[`v0/token/${tslaV1Id}/descendant`]).toStrictEqual(`${newTSLAId}/${splitBlock}`) // The original TSLA token has 2 descendant created at splitBlock
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/ascendant`]).toStrictEqual(`${tslaV1Id}/split`) // TSLA is the ascendant of TSLA/v1
    }

    {
      const auction = await testing.rpc.vault.listAuctions()
      expect(auction.length).toStrictEqual(1)
      expect(auction[0].batches.length).toStrictEqual(1)
      expect(auction[0].batches[0].collaterals).toStrictEqual(['1.00000000@DFI'])
      expect(auction[0].batches[0].loan).toStrictEqual('2.00000838@TSLA')
      expect(auction[0].batches[0].highestBid?.amount).toStrictEqual('2.20000000@TSLA')
    }
  })

  it('should refund futureSwap', async () => {
    await setupFutureSwap()

    const burnAddress = 'bcrt1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpsqgljc'

    {
      const balance = await testing.rpc.account.getAccount(burnAddress) // There is nothing in burn address
      expect(balance).toStrictEqual([])
    }

    {
      const balance = await testing.rpc.account.getAccount(collateralAddress)
      expect(balance).toStrictEqual([
        '299999.00000000@DFI',
        '1.00000000@TSLA' // There is 1 TSLA in collateral address
      ])
    }

    await testing.rpc.account.futureSwap({ // Futureswap attempt
      address: collateralAddress,
      amount: '1@TSLA'
    })
    await testing.generate(1)

    {
      const balance = await testing.rpc.account.getAccount(burnAddress)
      expect(balance).toStrictEqual(['1.00000000@TSLA']) // There is 1 TSLA in burn address
    }

    {
      const balance = await testing.rpc.account.getAccount(collateralAddress)
      expect(balance).toStrictEqual(['299999.00000000@DFI']) // There is 0 TSLA in collateral address
    }

    // Split the oracles
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2) // SetGov always need 2 blocks to execute

    {
      const balance = await testing.rpc.account.getAccount(burnAddress) // After splitting, there is nothing in burn address
      expect(balance).toStrictEqual([])
    }

    {
      const balance = await testing.rpc.account.getAccount(collateralAddress)
      expect(balance).toStrictEqual([
        '299999.00000000@DFI',
        '2.00000000@TSLA' // After splitting, 1 TSLA multiply by 2 = 2 TSLA
      ])
    }
  })

  it('should set GOV variables correctly', async () => {
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2

    // Split the oracles
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2` // Should be able to split TSLA
      }
    })
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${500000}`]: `${tslaID}/2` // Should not be able to execute as the block number is ridiculously high
      }
    })
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${1000000}`]: `${tslaID}/2` // Should not be able to execute as the block number is ridiculously high
      }
    })
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${1500000}`]: `${tslaID}/2` // Should not be able to execute as the block number is ridiculously high
      }
    })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/oracles/splits/${splitBlock}`]).toBeDefined() // All the value remain as only 1 block generated after split block
      expect(attributes.ATTRIBUTES['v0/oracles/splits/500000']).toBeDefined()
      expect(attributes.ATTRIBUTES['v0/oracles/splits/1000000']).toBeDefined()
      expect(attributes.ATTRIBUTES['v0/oracles/splits/1500000']).toBeDefined()
    }

    await testing.generate(1)

    // Get new TSLA Id
    const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
    const newTSLAId = Object.keys(newTSLAInfo)[0]
    expect(newTSLAId).not.toStrictEqual(tslaID) // After splitting, new tsla id is not same with the old one

    // Get new TSLA/v1 info
    const tslaV1Info = await testing.rpc.token.getToken('TSLA/v1')
    const tslaV1Id = Object.keys(tslaV1Info)[0]

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES') // All the value gone after SetGov. SetGov always need 2 blocks to execute
      expect(attributes.ATTRIBUTES[`v0/oracles/splits/${splitBlock}`]).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/oracles/splits/500000']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/oracles/splits/1000000']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/oracles/splits/1500000']).toBeUndefined()

      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toBeUndefined() // All existing info for old tsla id is removed

      expect(attributes.ATTRIBUTES[`v0/token/${tslaV1Id}/descendant`]).toStrictEqual(`${newTSLAId}/${splitBlock}`) // The original TSLA token has 2 descendant created at splitBlock
      expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('true') // By default every split will lock the ascendant token
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/ascendant`]).toStrictEqual(`${tslaV1Id}/split`) // TSLA is the ascendant of TSLA/v1
    }
  })
})
