import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { VaultActive, VaultLiquidation } from '@defichain/jellyfish-api-core/dist/category/vault'
import { poolpair, RpcApiError } from '@defichain/jellyfish-api-core'

describe('SetGov v0/oracles/splits', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let tslaID: string
  let tslaDfiPairID: string
  let collateralAddress: string
  let oracleId: string
  let vaultId: string

  async function setup (): Promise<void> {
    collateralAddress = await testing.generateAddress()

    await testing.token.dfi({
      address: collateralAddress,
      amount: 300000
    })
    await testing.generate(1)

    await testing.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(1),
      id: 'default'
    })
    await testing.generate(1)

    oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(),
      [{
        token: 'DFI',
        currency: 'USD'
      }, {
        token: 'TSLA',
        currency: 'USD'
      }, {
        token: 'DUSD',
        currency: 'USD'
      }],
      { weightage: 1 })
    await testing.generate(1)

    await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
      prices: [{
        tokenAmount: '0.99999999@DFI',
        currency: 'USD'
      }, {
        tokenAmount: '0.99999999@TSLA',
        currency: 'USD'
      }, {
        tokenAmount: '0.99999999@DUSD',
        currency: 'USD'
      }]
    })
    await testing.generate(1)

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

    await testing.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD',
      interest: new BigNumber(1)
    })
    await testing.generate(1)

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

  async function createVaultAndDeposit (): Promise<void> {
    vaultId = await testing.rpc.vault.createVault({
      ownerAddress: collateralAddress,
      loanSchemeId: 'default'
    })
    await testing.generate(1)

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '1@DFI'
    })
    await testing.generate(1)
  }

  async function activeVaultSetup (): Promise<void> {
    await createVaultAndDeposit()

    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '1@TSLA'
    })
    await testing.generate(1)
  }

  async function futureSwapSetup (): Promise<void> {
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'false' } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/reward_pct': '0.05', 'v0/params/dfip2203/block_period': '25' } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'true' } })
    await testing.generate(1)

    await activeVaultSetup()

    await testing.rpc.account.sendTokensToAddress({}, { [collateralAddress]: ['1@TSLA'] })
    await testing.generate(1)
  }

  async function poolSetup (): Promise<void> {
    await activeVaultSetup()

    await testing.poolpair.create({
      tokenA: 'TSLA',
      tokenB: 'DFI'
    })
    await testing.generate(1)

    await testing.token.mint({ amount: 2000, symbol: 'TSLA' })
    await testing.generate(1)

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

  async function liquidatedVaultSetup (): Promise<void> {
    await activeVaultSetup()

    // Going to liquidate the vaults by price increase of the loan tokens
    await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
      prices: [{
        tokenAmount: '1.49999999@TSLA',
        currency: 'USD'
      }]
    })
    await testing.container.waitForActivePrice('TSLA/USD', '1.49999999')

    const auction = await testing.rpc.vault.listAuctions()
    expect(auction.length).toStrictEqual(1)
    expect(auction[0].state).toStrictEqual('inLiquidation')

    await testing.token.mint({ amount: 0.1, symbol: 'TSLA' })
    await testing.generate(1)

    await testing.rpc.account.sendTokensToAddress({}, { [collateralAddress]: ['1.1@TSLA'] })
    await testing.generate(1)

    await testing.rpc.vault.placeAuctionBid({
      vaultId,
      index: 0,
      from: collateralAddress,
      amount: '1.1@TSLA'
    })
    await testing.generate(1)
  }

  it('should split correctly for single setGOV with valid block number', async () => {
    const splitBlock1 = await testing.rpc.blockchain.getBlockCount() + 2 // Must be at least 2

    {
      // set the token split
      const txId = await testing.rpc.masternode.setGov({
        ATTRIBUTES: {
          [`v0/oracles/splits/${splitBlock1}`]: `${tslaID}/2`
        }
      })
      await testing.generate(1)

      expect(typeof txId).toStrictEqual('string')
      expect(txId.length).toStrictEqual(64)
    }

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaID}`]).toStrictEqual('true') // current token is locked after setting the split
      expect(attributes.ATTRIBUTES[`v0/oracles/splits/${splitBlock1}`]).toStrictEqual('1/2')
    }
    await testing.generate(1)

    // Get new TSLA Id
    const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
    const newTSLAId = Object.keys(newTSLAInfo)[0]
    expect(newTSLAId).not.toStrictEqual(tslaID) // After splitting, new tslaId should not be same with the old one

    // Get new TSLA/v1 info
    const tslaV1Info = await testing.rpc.token.getToken('TSLA/v1')
    const tslaV1Id = Object.keys(tslaV1Info)[0]

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES') // All old values are gone after split happens.
      expect(attributes.ATTRIBUTES[`v0/oracles/splits/${splitBlock1}`]).toBeUndefined()
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toBeUndefined() // All existing info for old tslaid is removed
      expect(attributes.ATTRIBUTES[`v0/token/${tslaV1Id}/descendant`]).toStrictEqual(`${newTSLAId}/${splitBlock1}`) // The original TSLA token has 2 descendant created at splitBlock
      expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('true') // By default every split will lock the ascendant token
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/ascendant`]).toStrictEqual(`${tslaV1Id}/split`) // TSLA is the ascendant of TSLA/v1
    }

    const splitBlock2 = await testing.rpc.blockchain.getBlockCount() + 3 // Try 3 which is more than 2 too

    {
      // set the token split
      const txId = await testing.rpc.masternode.setGov({
        ATTRIBUTES: {
          [`v0/oracles/splits/${splitBlock2}`]: `${newTSLAId}/2`
        }
      })
      await testing.generate(1)

      expect(typeof txId).toStrictEqual('string')
      expect(txId.length).toStrictEqual(64)
    }
  })

  it('should split correctly for multiple setGOVs with valid block numbers in the same block', async () => {
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2

    // set the token split
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaID}`]).toStrictEqual('true') // current token is locked after setting the split
      expect(attributes.ATTRIBUTES[`v0/oracles/splits/${splitBlock}`]).toStrictEqual('1/2')
    }
    await testing.generate(1)

    // Get new TSLA Id
    const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
    const newTSLAId = Object.keys(newTSLAInfo)[0]
    expect(newTSLAId).not.toStrictEqual(tslaID) // After splitting, new tslaId should not be same with the old one

    // Get new TSLA/v1 info
    const tslaV1Info = await testing.rpc.token.getToken('TSLA/v1')
    const tslaV1Id = Object.keys(tslaV1Info)[0]

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES') // All old values are gone after split happens.
      expect(attributes.ATTRIBUTES[`v0/oracles/splits/${splitBlock}`]).toBeUndefined()
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toBeUndefined() // All existing info for old tslaid is removed
      expect(attributes.ATTRIBUTES[`v0/token/${tslaV1Id}/descendant`]).toStrictEqual(`${newTSLAId}/${splitBlock}`) // The original TSLA token has 2 descendant created at splitBlock
      expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('true') // By default every split will lock the ascendant token
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/ascendant`]).toStrictEqual(`${tslaV1Id}/split`) // TSLA is the ascendant of TSLA/v1
    }
  })

  it('should set splits for multiple block heights for the same token in the same block and clear other entries when the first split happens', async () => {
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2

    // set the token split
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${500000}`]: `${tslaID}/2`
      }
    })
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${1000000}`]: `${tslaID}/2`
      }
    })
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${1500000}`]: `${tslaID}/2`
      }
    })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaID}`]).toStrictEqual('true') // current token is locked after setting the split
      expect(attributes.ATTRIBUTES[`v0/oracles/splits/${splitBlock}`]).toStrictEqual('1/2')
      expect(attributes.ATTRIBUTES['v0/oracles/splits/500000']).toStrictEqual('1/2')
      expect(attributes.ATTRIBUTES['v0/oracles/splits/1000000']).toStrictEqual('1/2')
      expect(attributes.ATTRIBUTES['v0/oracles/splits/1500000']).toStrictEqual('1/2')
    }
    await testing.generate(1)

    // Get new TSLA Id
    const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
    const newTSLAId = Object.keys(newTSLAInfo)[0]
    expect(newTSLAId).not.toStrictEqual(tslaID) // After splitting, new tslaId should not be same with the old one

    // Get new TSLA/v1 info
    const tslaV1Info = await testing.rpc.token.getToken('TSLA/v1')
    const tslaV1Id = Object.keys(tslaV1Info)[0]

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES') // All old values are gone after split happens.
      expect(attributes.ATTRIBUTES[`v0/oracles/splits/${splitBlock}`]).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/oracles/splits/500000']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/oracles/splits/1000000']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/oracles/splits/1500000']).toBeUndefined()
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toBeUndefined() // All existing info for old tslaid is removed
      expect(attributes.ATTRIBUTES[`v0/token/${tslaV1Id}/descendant`]).toStrictEqual(`${newTSLAId}/${splitBlock}`) // The original TSLA token has 2 descendant created at splitBlock
      expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('true') // By default every split will lock the ascendant token
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/ascendant`]).toStrictEqual(`${tslaV1Id}/split`) // TSLA is the ascendant of TSLA/v1
    }
  })

  it('should split correctly and refund futureSwap', async () => {
    await futureSwapSetup()

    const fsContractAddress = 'bcrt1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpsqgljc'

    {
      const balance = await testing.rpc.account.getAccount(fsContractAddress) // There is nothing in future swap contractAddress
      expect(balance).toStrictEqual([])
    }

    {
      const balance = await testing.rpc.account.getAccount(collateralAddress)
      expect(balance).toStrictEqual([
        '299999.00000000@DFI',
        '1.00000000@TSLA' // There is 1 TSLA in the collateral address
      ])
    }

    const txId = await testing.rpc.account.futureSwap({ // Attempt to future swap
      address: collateralAddress,
      amount: '1@TSLA'
    })
    await testing.generate(1)

    expect(typeof txId).toStrictEqual('string') // Successfully future swap
    expect(txId.length).toStrictEqual(64)

    {
      const balance = await testing.rpc.account.getAccount(fsContractAddress)
      expect(balance).toStrictEqual(['1.00000000@TSLA']) // 1 TSLA is in the fs contractAddress
    }

    {
      const balance = await testing.rpc.account.getAccount(collateralAddress)
      expect(balance).toStrictEqual(['299999.00000000@DFI']) // 1 TSLA is burned and hence, the original 1 TSLA is removed from the collateralAddress
    }

    // check future swap is in effect
    const pendingFutures = await testing.container.call('listpendingfutureswaps')
    expect(pendingFutures.length).toStrictEqual(1)
    expect(pendingFutures[0].owner).toStrictEqual(collateralAddress)
    expect(pendingFutures[0].source).toStrictEqual('1.00000000@TSLA')
    expect(pendingFutures[0].destination).toStrictEqual('DUSD')

    // set the token split
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    {
      const balance = await testing.rpc.account.getAccount(fsContractAddress) // After splitting, there is nothing in future swap contractAddress
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

  it('should split token correctly', async () => {
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

    // set the token split
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    // Get new TSLA Id
    const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
    const newTSLAId = Object.keys(newTSLAInfo)[0]
    expect(newTSLAId).not.toStrictEqual(tslaID) // After splitting, new tslaId is not same with the old one

    // Get new TSLA/v1 info
    const tslaV1Info = await testing.rpc.token.getToken('TSLA/v1')
    const tslaV1Id = Object.keys(tslaV1Info)[0]

    {
      // Get attributes and token after splitting
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toBeUndefined() // All existing info for old tslaId is removed
      expect(attributes.ATTRIBUTES[`v0/token/${tslaV1Id}/descendant`]).toStrictEqual(`${newTSLAId}/${splitBlock}`) // The original TSLA token has 2 descendant created at splitBlock
      expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('true') // By default every split will lock the ascendant token
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/ascendant`]).toStrictEqual(`${tslaV1Id}/split`) // TSLA is the ascendant of TSLA/v1
    }

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

  it('should split pool correctly', async () => {
    await poolSetup()

    // Get attributes and token before splitting
    {
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
    }

    // set the token split
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
    const newTSLAId = Object.keys(newTSLAInfo)[0]

    {
      // Get new TSLA-DFI info
      const newTSLADFIPairInfo = await testing.rpc.token.getToken('TSLA-DFI')
      const newTSLADFIPairId = Object.keys(newTSLADFIPairInfo)[0]
      expect(newTSLADFIPairId).not.toStrictEqual(tslaDfiPairID) // After splitting, new tsla-dfi pair id is not same with the old one

      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/poolpairs/${tslaDfiPairID}/token_a_fee_pct`]).toBeUndefined()
      expect(attributes.ATTRIBUTES[`v0/poolpairs/${tslaDfiPairID}/token_b_fee_pct`]).toBeUndefined()
      expect(attributes.ATTRIBUTES[`v0/poolpairs/${newTSLADFIPairId}/token_a_fee_pct`]).toStrictEqual('0.01')
      expect(attributes.ATTRIBUTES[`v0/poolpairs/${newTSLADFIPairId}/token_b_fee_pct`]).toStrictEqual('0.03')

      const poolPairNew = await testing.poolpair.get('TSLA-DFI')
      expect(poolPairNew).toStrictEqual(
        {
          symbol: 'TSLA-DFI',
          name: '-Default Defi token',
          status: true,
          idTokenA: `${newTSLAId}`,
          idTokenB: '0',
          dexFeePctTokenA: new BigNumber(0.01),
          dexFeePctTokenB: new BigNumber(0.03),
          dexFeeOutPctTokenB: new BigNumber(0.03),
          dexFeeInPctTokenA: new BigNumber(0.01),
          dexFeeInPctTokenB: new BigNumber(0.03),
          dexFeeOutPctTokenA: new BigNumber(0.01),
          reserveA: new BigNumber(1 * 2),
          reserveB: new BigNumber(1),
          commission: new BigNumber(0),
          totalLiquidity: new BigNumber(1.41421356),
          'reserveA/reserveB': new BigNumber(2),
          'reserveB/reserveA': new BigNumber(0.5),
          tradeEnabled: true,
          ownerAddress: expect.any(String),
          blockCommissionA: new BigNumber(0),
          blockCommissionB: new BigNumber(0),
          rewardPct: new BigNumber(1),
          rewardLoanPct: new BigNumber(1),
          creationTx: expect.stringMatching(/[a-zA-Z0-9]{64}/),
          creationHeight: new BigNumber(splitBlock)
        }
      )

      const poolPairOld = await testing.poolpair.get('TSLA-DFI/v1')
      expect(poolPairOld).toStrictEqual(
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

  it('should split active vault correctly', async () => {
    await activeVaultSetup()

    {
      // Get attributes and token before splitting
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
    }

    {
      // Get vault
      const vault = await testing.rpc.vault.getVault(vaultId)
      expect(vault).toStrictEqual(
        {
          vaultId,
          loanSchemeId: 'default',
          ownerAddress: collateralAddress,
          state: 'active',
          collateralAmounts: ['1.00000000@DFI'],
          loanAmounts: ['1.00000039@TSLA'],
          interestAmounts: ['0.00000039@TSLA'],
          collateralValue: new BigNumber(0.99999999),
          loanValue: new BigNumber(1.00000037),
          interestValue: new BigNumber(0.00000038),
          informativeRatio: new BigNumber(99.999962),
          collateralRatio: 100
        }
      )
    }

    // set the token split
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    {
      // Get new TSLA Id
      const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
      const newTSLAId = Object.keys(newTSLAInfo)[0]
      expect(newTSLAId).not.toStrictEqual(tslaID) // After splitting, new tslaId is not same with the old one

      // Get new TSLA/v1 info
      const tslaV1Info = await testing.rpc.token.getToken('TSLA/v1')
      const tslaV1Id = Object.keys(tslaV1Info)[0]

      // Get attributes and token after splitting
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toBeUndefined() // All existing info for old tslaId is removed
      expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('true') // new TSLA token is locked after split
      expect(attributes.ATTRIBUTES[`v0/token/${tslaV1Id}/descendant`]).toStrictEqual(`${newTSLAId}/${splitBlock}`) // The original TSLA token has 2 descendant created at splitBlock
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/ascendant`]).toStrictEqual(`${tslaV1Id}/split`) // TSLA is the ascendant of TSLA/v1
    }

    {
      // Get the same vault again
      const vault = await testing.rpc.vault.getVault(vaultId)
      expect(vault).toStrictEqual(
        {
          vaultId,
          loanSchemeId: 'default',
          ownerAddress: collateralAddress, // No changes
          state: 'frozen',
          collateralAmounts: ['1.00000000@DFI'],
          loanAmounts: ['2.00000229@TSLA'], // 1.00000039 * 2 + some interest
          interestAmounts: ['0.00000229@TSLA'], // 0.00000039 * 2 + some interest
          collateralValue: new BigNumber(-1), // Always -1 when frozen
          loanValue: new BigNumber(-1), // Always -1 when frozen
          interestValue: new BigNumber(-1), // Always -1 when frozen
          informativeRatio: new BigNumber(-1), // Always -1 when frozen
          collateralRatio: -1 // Always -1 when frozen
        }
      )
    }
  })

  it('should split liquidated vault correctly', async () => {
    await liquidatedVaultSetup()

    {
      // Get attributes and token before splitting
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
    }

    {
      // Get vault
      const vault: VaultLiquidation = await testing.rpc.vault.getVault(vaultId) as VaultLiquidation
      expect(vault).toStrictEqual(
        {
          vaultId,
          loanSchemeId: 'default',
          ownerAddress: collateralAddress,
          state: 'inLiquidation',
          liquidationHeight: 156,
          liquidationPenalty: 5,
          batchCount: 1,
          batches: [{
            collaterals: ['1.00000000@DFI'],
            highestBid: {
              amount: '1.10000000@TSLA',
              owner: collateralAddress
            },
            index: 0,
            loan: '1.00000343@TSLA'
          }]
        }
      )
    }

    // set the token split
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    {
      // Get new TSLA Id
      const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
      const newTSLAId = Object.keys(newTSLAInfo)[0]
      expect(newTSLAId).not.toStrictEqual(tslaID) // After splitting, new tslaId is not same with the old one

      // Get new TSLA/v1 info
      const tslaV1Info = await testing.rpc.token.getToken('TSLA/v1')
      const tslaV1Id = Object.keys(tslaV1Info)[0]

      // Get attributes and token after splitting
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toBeUndefined() // All existing info for old tslaId is removed
      expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('true') // new TSLA token is locked after split
      expect(attributes.ATTRIBUTES[`v0/token/${tslaV1Id}/descendant`]).toStrictEqual(`${newTSLAId}/${splitBlock}`) // The original TSLA token has 2 descendant created at splitBlock
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/ascendant`]).toStrictEqual(`${tslaV1Id}/split`) // TSLA is the ascendant of TSLA/v1
    }

    {
      // Get the same vault again
      const vault: VaultLiquidation = await testing.rpc.vault.getVault(vaultId) as VaultLiquidation
      expect(vault).toStrictEqual(
        {
          vaultId,
          loanSchemeId: 'default',
          ownerAddress: collateralAddress,
          state: 'inLiquidation',
          liquidationHeight: 156,
          liquidationPenalty: 5,
          batchCount: 1,
          batches: [{
            collaterals: ['1.00000000@DFI'],
            highestBid: {
              amount: '2.20000000@TSLA', // 1.10000000 * 2
              owner: collateralAddress
            },
            index: 0,
            loan: '2.00000686@TSLA' // 1.00000343 * 2
          }]
        }
      )
    }
  })

  it('should split auction correctly', async () => {
    await liquidatedVaultSetup()

    {
      // Get attributes and token before splitting
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
    }

    {
      const auction = await testing.rpc.vault.listAuctions()
      expect(auction.length).toStrictEqual(1)
      expect(auction[0].batches.length).toStrictEqual(1)
      expect(auction[0].batches[0].loan).toStrictEqual('1.00000343@TSLA')
      expect(auction[0].batches[0].highestBid?.amount).toStrictEqual('1.10000000@TSLA')
    }

    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    {
      // Get new TSLA Id
      const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
      const newTSLAId = Object.keys(newTSLAInfo)[0]
      expect(newTSLAId).not.toStrictEqual(tslaID) // After splitting, new tslaId is not same with the old one

      // Get new TSLA/v1 info
      const tslaV1Info = await testing.rpc.token.getToken('TSLA/v1')
      const tslaV1Id = Object.keys(tslaV1Info)[0]

      // Get attributes and token after splitting
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/token/${tslaID}/fixed_interval_price_id`]).toBeUndefined() // All existing info for old tslaId is removed
      expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('true') // new TSLA token is locked after split
      expect(attributes.ATTRIBUTES[`v0/token/${tslaV1Id}/descendant`]).toStrictEqual(`${newTSLAId}/${splitBlock}`) // The original TSLA token has 2 descendant created at splitBlock
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/fixed_interval_price_id`]).toStrictEqual('TSLA/USD')
      expect(attributes.ATTRIBUTES[`v0/token/${newTSLAId}/ascendant`]).toStrictEqual(`${tslaV1Id}/split`) // TSLA is the ascendant of TSLA/v1
    }

    {
      const auction = await testing.rpc.vault.listAuctions()
      expect(auction.length).toStrictEqual(1)
      expect(auction[0].batches.length).toStrictEqual(1)
      expect(auction[0].batches[0].loan).toStrictEqual('2.00000686@TSLA') // 1.00000343 * 2
      expect(auction[0].batches[0].highestBid?.amount).toStrictEqual('2.20000000@TSLA') // 1.10000000 * 2
    }
  })

  it('should deposit to vault after split unlock', async () => {
    await activeVaultSetup()

    // set the token split
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    {
      // try to deposit to the vault
      const promise = testing.rpc.vault.depositToVault({ vaultId: vaultId, from: collateralAddress, amount: '10@DFI' })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('RpcApiError: \'Test DepositToVaultTx execution failed:\nFixed interval price currently disabled due to locked token\', code: -32600, method: deposittovault')
    }

    // oracle new price kicks in
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '0.5@TSLA',
        currency: 'USD'
      }]
    })
    await testing.generate(12)

    // Get new TSLA Id
    const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
    const newTSLAId = Object.keys(newTSLAInfo)[0]

    // unlock the token and check
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${newTSLAId}`]: 'false' } })
    await testing.generate(1)
    // check newTslaID is unlocked now
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('false')

    {
      // deposit to the vault
      const txId = await testing.rpc.vault.depositToVault({ vaultId: vaultId, from: collateralAddress, amount: '10@DFI' })
      await testing.generate(1)

      expect(typeof txId).toStrictEqual('string')
      expect(txId.length).toStrictEqual(64)

      const vault = await testing.rpc.vault.getVault(vaultId) as VaultActive
      expect(vault.collateralValue).toStrictEqual(new BigNumber(10.99999989)) // 11 x 0.99999999
    }
  })

  it('should withdraw from vault after split unlock', async () => {
    await activeVaultSetup()

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '10@DFI'
    })
    await testing.generate(1)

    // set the token split
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    {
      // Try to withdrawFromVault
      const promise = testing.rpc.vault.withdrawFromVault({
        vaultId, to: collateralAddress, amount: '10@DFI'
      })
      await expect(promise).rejects.toThrow('RpcApiError: \'Test WithdrawFromVaultTx execution failed:\nCannot withdraw from vault while any of the asset\'s price is invalid\', code: -32600, method: withdrawfromvault')
    }

    // oracle new price kicks in
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '0.5@TSLA',
        currency: 'USD'
      }]
    })
    await testing.generate(12)

    // Get new TSLA Id
    const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
    const newTSLAId = Object.keys(newTSLAInfo)[0]

    // unlock the token and check
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${newTSLAId}`]: 'false' } })
    await testing.generate(1)
    // check newTslaID is unlocked now
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('false')

    {
      // withdrawFromVault
      const txId = await testing.rpc.vault.withdrawFromVault({
        vaultId, to: collateralAddress, amount: '10@DFI'
      })
      await testing.generate(1)

      expect(typeof txId).toStrictEqual('string')
      expect(txId.length).toStrictEqual(64)
    }
  })

  it('should take loan after split unlock', async () => {
    await createVaultAndDeposit()

    // set the token split
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    {
      // Try to takeLoan
      const promise = testing.rpc.loan.takeLoan({
        vaultId,
        amounts: '1@TSLA'
      })
      await expect(promise).rejects.toThrow('RpcApiError: \'Test TakeLoanTx execution failed:\nFixed interval price currently disabled due to locked token\', code: -32600, method: takeloan')
    }

    // oracle new price kicks in
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '0.5@TSLA',
        currency: 'USD'
      }]
    })
    await testing.generate(12)

    // Get new TSLA Id
    const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
    const newTSLAId = Object.keys(newTSLAInfo)[0]

    // unlock the token and check
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${newTSLAId}`]: 'false' } })
    await testing.generate(1)
    // check newTslaID is unlocked now
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('false')

    {
      // takeLoan
      const txId = await testing.rpc.loan.takeLoan({
        vaultId,
        amounts: '1@TSLA'
      })
      await testing.generate(1)

      expect(typeof txId).toStrictEqual('string')
      expect(txId.length).toStrictEqual(64)
    }
  })

  it('should create future swap after split unlock', async () => {
    await futureSwapSetup()

    // set the token split
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    {
      // Try to futureswap
      const promise = testing.rpc.account.futureSwap({
        address: collateralAddress,
        amount: '1@TSLA'
      })
      await expect(promise).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nCannot create future swap for locked token\', code: -32600, method: futureswap')
    }

    // oracle new price kicks in
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '0.5@TSLA',
        currency: 'USD'
      }]
    })
    await testing.generate(12)

    // Get new TSLA Id
    const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
    const newTSLAId = Object.keys(newTSLAInfo)[0]

    // unlock the token and check
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${newTSLAId}`]: 'false' } })
    await testing.generate(1)
    // check newTslaID is unlocked now
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('false')

    {
      // futureswap
      const txId = await testing.rpc.account.futureSwap({
        address: collateralAddress,
        amount: '1@TSLA'
      })
      await testing.generate(1)

      expect(typeof txId).toStrictEqual('string')
      expect(txId.length).toStrictEqual(64)
    }
  })

  it('should pool swap after split unlock', async () => {
    await poolSetup()

    // set the token split
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)

    {
      // Try to poolswap
      const metadata: poolpair.PoolSwapMetadata = {
        from: collateralAddress,
        tokenFrom: 'DFI',
        amountFrom: 0.5,
        to: await testing.generateAddress(),
        tokenTo: 'TSLA'
      }
      const promise = testing.rpc.poolpair.poolSwap(metadata)
      await expect(promise).rejects.toThrow('RpcApiError: \'Test PoolSwapTx execution failed:\nPool currently disabled due to locked token\', code: -32600, method: poolswap')
    }

    // oracle new price kicks in
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '0.5@TSLA',
        currency: 'USD'
      }]
    })
    await testing.generate(12)

    // Get new TSLA Id
    const newTSLAInfo = await testing.rpc.token.getToken('TSLA')
    const newTSLAId = Object.keys(newTSLAInfo)[0]

    // unlock the token and check
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${newTSLAId}`]: 'false' } })
    await testing.generate(1)
    // check newTslaID is unlocked now
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAId}`]).toStrictEqual('false')

    {
      // poolswap
      const metadata: poolpair.PoolSwapMetadata = {
        from: collateralAddress,
        tokenFrom: 'DFI',
        amountFrom: 0.5,
        to: await testing.generateAddress(),
        tokenTo: 'TSLA'
      }

      const txId = await testing.rpc.poolpair.poolSwap(metadata)
      await testing.generate(1)

      expect(typeof txId).toStrictEqual('string')
      expect(txId.length).toStrictEqual(64)
    }
  })

  it('should not set the split on the same block height as the next block', async () => {
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 1 // 1 is an invalid number, should be at least 2

    // set the token split
    const promise = testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetGovVariableTx execution failed:\nATTRIBUTES: Cannot be set at or below current height\', code: -32600, method: setgov')
  })

  it('should try to set a split height again', async () => {
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 5

    // set the token split
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(1)

    // check split is set
    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaID}`]).toStrictEqual('true') // current token is locked after setting the split
      expect(attributes.ATTRIBUTES[`v0/oracles/splits/${splitBlock}`]).toStrictEqual(`${tslaID}/2`)
    }

    // try to update the split height to splitBlock + 5 to again
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock + 5}`]: `${tslaID}/2`
      }
    })
    await testing.generate(1)

    // check split is set
    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaID}`]).toStrictEqual('true') // current token is locked after setting the split
      expect(attributes.ATTRIBUTES[`v0/oracles/splits/${splitBlock}`]).toStrictEqual(`${tslaID}/2`)
      // NOTE(surangap): new split entry is added, but old entry is still there. means the split will still happen at splitBlock height. What if we want to remove or postpone incorrectly
      // configured split? is there a way?
      expect(attributes.ATTRIBUTES[`v0/oracles/splits/${splitBlock + 5}`]).toStrictEqual(`${tslaID}/2`)
    }
  })
})
