import { poolpair, RpcApiError } from '@defichain/jellyfish-api-core'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'

describe('SetGov v0/locks/token', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let collateralAddress: string
  let oracleId: string
  let dfiId: string
  let tslaId: string
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
        tokenAmount: '1@DFI',
        currency: 'USD'
      }, {
        tokenAmount: '1@TSLA',
        currency: 'USD'
      }, {
        tokenAmount: '1@DUSD',
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

    const dfiInfo = await testing.rpc.token.getToken('DFI')
    dfiId = Object.keys(dfiInfo)[0]

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await testing.generate(1)

    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    tslaId = Object.keys(tslaInfo)[0]

    await testing.container.waitForActivePrice('TSLA/USD', '1')

    vaultId = await testing.rpc.vault.createVault({
      ownerAddress: collateralAddress,
      loanSchemeId: 'default'
    })
    await testing.generate(1)
  }

  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  async function depositToVault (): Promise<void> {
    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '1@DFI'
    })
    await testing.generate(1)
  }

  async function depositToVaultAndTakeLoan (): Promise<void> {
    await depositToVault()

    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '1@TSLA'
    })
    await testing.generate(1)
  }

  async function poolSwapSetup (): Promise<void> {
    await depositToVaultAndTakeLoan()

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
  }

  async function futureSwapSetup (): Promise<void> {
    await depositToVaultAndTakeLoan()

    await testing.rpc.account.sendTokensToAddress({}, { [collateralAddress]: ['1@TSLA'] })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'false' } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/reward_pct': '0.05', 'v0/params/dfip2203/block_period': '25' } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2203/active': 'true' } })
    await testing.generate(1)
  }

  async function loan1Setup (): Promise<void> {
    await depositToVaultAndTakeLoan()

    await testing.rpc.loan.setCollateralToken({
      token: 'TSLA',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)
  }

  async function loan2Setup (): Promise<void> {
    await loan1Setup()

    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '1@TSLA'
    })
    await testing.generate(1)
  }

  async function loan3Setup (): Promise<void> {
    await depositToVaultAndTakeLoan()

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/token/${tslaId}/payback_dfi`]: 'true', [`v0/token/${tslaId}/payback_dfi_fee_pct`]: '0.02' } })
    await testing.generate(1)
  }

  it('should lock and unlock loan token', async () => {
    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`]).toBeUndefined()
    }

    // Lock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`]).toStrictEqual('true')
    }

    // Unlock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`]).toStrictEqual('false')
    }

    // Lock and unlock loan tokens in the same block
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(
        attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`] === 'true' ||
        attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`] === 'false'
      ).toStrictEqual(true)
    }

    // Unlock and lock loan tokens in the same block
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(
        attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`] === 'true' ||
        attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`] === 'false'
      ).toStrictEqual(true)
    }

    // 2 lock loan tokens in the same block
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`]).toStrictEqual('true')
    }

    // 2 unlock loan tokens in the same block
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`]).toStrictEqual('false')
    }
  })

  it('should update loan token if loan token is unlocked', async () => {
    // Initially keep the token in locked state
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Unlock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    // update loan token
    await testing.rpc.token.updateToken(tslaId, { name: 'Tesla' })
    await testing.generate(1)

    const tslaInfo = await testing.rpc.token.getToken(tslaId)
    expect(tslaInfo[tslaId].name).toStrictEqual('Tesla')
  })

  it('should getFixedIntervalPrice if loan token is unlocked', async () => {
    // Initially keep the token in locked state
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Unlock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    // getfixedintervalprice
    const price = await testing.rpc.oracle.getFixedIntervalPrice('TSLA/USD')
    expect(price).toBeDefined()
  })

  it('should poolSwap if loan token is unlocked', async () => {
    await poolSwapSetup()

    // Initially keep the token in locked state
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Unlock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

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
  })

  it('should futureSwap if loan token is unlocked', async () => {
    await futureSwapSetup()

    // Initially keep the token in locked state
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Unlock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    // futureswap
    const txId = await testing.rpc.account.futureSwap({
      address: collateralAddress,
      amount: '1@TSLA'
    })
    await testing.generate(1)

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)
  })

  it('should depositToVault if loan token is unlocked', async () => {
    await loan1Setup()

    // Initially keep the token in locked state
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Unlock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    // depositToVault
    const txId = await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '1@TSLA'
    })
    await testing.generate(1)

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)
  })

  it('should takeLoan if loan token is unlocked', async () => {
    await depositToVault()

    // Initially keep the token in locked state
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Unlock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    // takeLoan
    const txId = await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '1@TSLA'
    })
    await testing.generate(1)

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)
  })

  it('should withdrawFromVault if loan token is unlocked', async () => {
    await loan2Setup()

    // Initially keep the token in locked state
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Unlock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    // withdrawFromVault
    const txId = await testing.rpc.vault.withdrawFromVault({
      vaultId, to: collateralAddress, amount: '1@TSLA'
    })
    await testing.generate(1)

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)
  })

  it('should paybackLoan if loan token is unlocked', async () => {
    await loan3Setup()

    // Initially keep the token in locked state
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Unlock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    // paybackLoan
    const txId = await testing.rpc.loan.paybackLoan({
      vaultId,
      from: collateralAddress,
      loans: [{
        dToken: tslaId,
        amounts: '0.5@DFI'
      }]
    })
    await testing.generate(1)

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)
  })

  it('should fail if lock invalid token', async () => {
    const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/locks/token/abc': 'true' } })
    await expect(promise).rejects.toThrow('Token should be defined as numeric ID')
  })

  it('should not lock collateral token', async () => {
    // Try to lock collateral token
    const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${dfiId}`]: 'true' } })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetGovVariableTx execution failed:\nATTRIBUTES: No loan token with id (0)\', code: -32600, method: setgov')
  })

  it('should not unlock collateral token', async () => {
    // Try to unlock collateral token
    const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${dfiId}`]: 'false' } })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetGovVariableTx execution failed:\nATTRIBUTES: No loan token with id (0)\', code: -32600, method: setgov')
  })

  it('should not lock loan token if loan token number is invalid', async () => {
    // Try to lock invalid token
    const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/locks/token/2': 'true' } })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetGovVariableTx execution failed:\nATTRIBUTES: No loan token with id (2)\', code: -32600, method: setgov')
  })

  it('should not unlock loan token if loan token number is invalid', async () => {
    // Try to unlock invalid token
    const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/locks/token/2': 'false' } })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetGovVariableTx execution failed:\nATTRIBUTES: No loan token with id (2)\', code: -32600, method: setgov')
  })

  it('should not update token if loan token is locked', async () => {
    // Lock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Try to update token
    const promise = testing.rpc.token.updateToken(tslaId, { name: 'Tesla' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateTokenAnyTx execution failed:\nCannot update token during lock\', code: -32600, method: updatetoken')
  })

  it('should not getFixedIntervalPrice if loan token is locked', async () => {
    // Lock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Try to getfixedintervalprice
    const promise = testing.rpc.oracle.getFixedIntervalPrice('TSLA/USD')
    await expect(promise).rejects.toThrow('RpcApiError: \'Fixed interval price currently disabled due to locked token\', code: -5, method: getfixedintervalprice')
  })

  it('should not poolSwap if loan token is locked', async () => {
    await poolSwapSetup()

    // Lock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

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
  })

  it('should not futureSwap if loan token is locked', async () => {
    await futureSwapSetup()

    // Lock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Try to futureswap
    const promise = testing.rpc.account.futureSwap({
      address: collateralAddress,
      amount: '1@TSLA'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nCannot create future swap for locked token\', code: -32600, method: futureswap')
  })

  it('should not depositToVault if loan token is locked', async () => {
    await loan1Setup()

    // Lock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    const vault = await testing.rpc.vault.getVault(vaultId)
    expect(vault).toStrictEqual({
      vaultId,
      loanSchemeId: 'default',
      ownerAddress: collateralAddress,
      state: 'frozen',
      collateralAmounts: ['1.00000000@DFI'],
      loanAmounts: ['1.00000058@TSLA'],
      interestAmounts: ['0.00000058@TSLA'],
      collateralValue: new BigNumber(-1),
      loanValue: new BigNumber(-1),
      interestValue: new BigNumber(-1),
      informativeRatio: new BigNumber(-1),
      collateralRatio: -1
    })

    // Try to depositToVault
    const promise = testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '1@TSLA'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DepositToVaultTx execution failed:\nFixed interval price currently disabled due to locked token\', code: -32600, method: deposittovault')
  })

  it('should not takeLoan if loan token is locked', async () => {
    await depositToVault()

    // Lock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Try to takeLoan
    const promise = testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '1@TSLA'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test TakeLoanTx execution failed:\nFixed interval price currently disabled due to locked token\', code: -32600, method: takeloan')
  })

  it('should not withdrawFromVault if loan token is locked', async () => {
    await loan2Setup()

    // Unlock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Try to withdrawFromVault
    const promise = testing.rpc.vault.withdrawFromVault({
      vaultId, to: collateralAddress, amount: '1@TSLA'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test WithdrawFromVaultTx execution failed:\nCannot withdraw from vault while any of the asset\'s price is invalid\', code: -32600, method: withdrawfromvault')
  })

  // @TODO jingyi2811
  // Temporarily skip this as the exception messages thrown are different every time
  it.skip('should not paybackloan if loan token is locked', async () => {
    await loan3Setup()

    // Lock loan token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    const vault = await testing.rpc.vault.getVault(vaultId)
    expect(vault).toStrictEqual({
      vaultId,
      loanSchemeId: 'default',
      ownerAddress: collateralAddress,
      state: 'frozen',
      collateralAmounts: ['1.00000000@DFI'],
      loanAmounts: ['1.00000058@TSLA'],
      interestAmounts: ['0.00000058@TSLA'],
      collateralValue: new BigNumber(-1),
      loanValue: new BigNumber(-1),
      interestValue: new BigNumber(-1),
      informativeRatio: new BigNumber(-1),
      collateralRatio: -1
    })

    // Try to paybackLoan
    const promise = testing.rpc.loan.paybackLoan({
      vaultId,
      from: collateralAddress,
      loans: [{
        dToken: tslaId,
        amounts: '0.5@DFI'
      }]
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test PaybackLoanTx execution failed:\nFixed interval price currently disabled due to locked token\', code: -32600, method: paybackloan')
  })
})
