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

    await testing.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(1),
      id: 'default'
    })
    await testing.generate(1)

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

    await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
      prices: [{
        tokenAmount: '1@DFI',
        currency: 'USD'
      }, {
        tokenAmount: '1@TSLA',
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
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)

    const dfiInfo = await testing.rpc.token.getToken('DFI')
    dfiId = Object.keys(dfiInfo)[0]

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

  async function depositToVaultSetup (): Promise<void> {
    await depositToVaultAndTakeLoan()

    await testing.rpc.loan.setCollateralToken({
      token: 'TSLA',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)
  }

  async function paybackLoanSetup (): Promise<void> {
    await depositToVaultAndTakeLoan()

    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/token/${tslaId}/payback_dfi`]: 'true', [`v0/token/${tslaId}/payback_dfi_fee_pct`]: '0.02' } })
    await testing.generate(1)
  }

  it('should lock and unlock token', async () => {
    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`]).toBeUndefined()
    }

    // Lock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`]).toStrictEqual('true')
    }

    // Unlock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`]).toStrictEqual('false')
    }

    // Lock and unlock in the same block
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`]).toStrictEqual('false')
    }

    // Unlock and lock in the same block
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`]).toStrictEqual('true')
    }

    // 2 locks in the same block
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`]).toStrictEqual('true')
    }

    // 2 unlocks in the same block
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${tslaId}`]).toStrictEqual('false')
    }
  })

  it('should update token if token is unlocked', async () => {
    // Unlock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    // update token
    await testing.rpc.token.updateToken(tslaId, { name: 'Tesla' })
    await testing.generate(1)

    const tslaInfo = await testing.rpc.token.getToken(tslaId)
    expect(tslaInfo[tslaId].name).toStrictEqual('Tesla')
  })

  it('should getFixedIntervalPrice if token is unlocked', async () => {
    // Unlock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    // getfixedintervalprice
    const price = await testing.rpc.oracle.getFixedIntervalPrice('TSLA/USD')
    expect(price).toBeDefined()
  })

  it('should poolSwap if token is unlocked', async () => {
    await poolSwapSetup()

    // Unlock token
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

  it('should futureSwap if token is unlocked', async () => {
    await futureSwapSetup()

    // Unlock token
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

  it('should depositToVault if token is unlocked', async () => {
    await depositToVaultSetup()
    // Unlock token
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

  it('should takeLoan if token is unlocked', async () => {
    await depositToVault()

    // Unlock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    // takeLoan
    const txId = await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '1@TSLA'
    })
    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)
  })

  it('should withdrawFromVault if token is unlocked', async () => {
    await depositToVault()

    // Unlock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'false' } })
    await testing.generate(1)

    // withdrawFromVault
    const txId = await testing.rpc.vault.withdrawFromVault({
      vaultId, to: collateralAddress, amount: '0.1@DFI'
    })
    await testing.generate(1)

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)
  })

  it('should paybackLoan if token is unlocked', async () => {
    await paybackLoanSetup()

    // Unlock token
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

  it('should not update token if token is locked', async () => {
    // Lock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Try update token
    const promise = testing.rpc.token.updateToken(tslaId, { name: 'Tesla' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateTokenAnyTx execution failed:\nCannot update token during lock\', code: -32600, method: updatetoken')
  })

  it('should not getFixedIntervalPrice if token is locked', async () => {
    // Lock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Try getfixedintervalprice
    const promise = testing.rpc.oracle.getFixedIntervalPrice('TSLA/USD')
    await expect(promise).rejects.toThrow('RpcApiError: \'Fixed interval price currently disabled due to locked token\', code: -5, method: getfixedintervalprice')
  })

  it('should not poolSwap if token is locked', async () => {
    await poolSwapSetup()

    // Lock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Try poolswap
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

  it('should not futureSwap if token is locked', async () => {
    await futureSwapSetup()

    // Lock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // futureswap
    const promise = testing.rpc.account.futureSwap({
      address: collateralAddress,
      amount: '1@TSLA'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nCannot create future swap for locked token\', code: -32600, method: futureswap')
  })

  it('should not depositToVault if token is locked', async () => {
    await depositToVaultSetup()
    // Lock token
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

  it('should not takeLoan if token is locked', async () => {
    await depositToVault()

    // Lock token
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

    // Try to takeLoan
    const promise = testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '1@TSLA'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test TakeLoanTx execution failed:\nFixed interval price currently disabled due to locked token\', code: -32600, method: takeloan')
  })

  it('should not withdrawFromVault if token is locked', async () => {
    await depositToVaultAndTakeLoan()

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

    // Unlock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaId}`]: 'true' } })
    await testing.generate(1)

    // Try to withdrawFromVault
    const promise = testing.rpc.vault.withdrawFromVault({
      vaultId, to: collateralAddress, amount: '1@TSLA'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test WithdrawFromVaultTx execution failed:\nCannot withdraw from vault while any of the asset\'s price is invalid\', code: -32600, method: withdrawfromvault')
  })

  // @TODO jingyi2811
  // temporarily skip as the exception message thrown is different every time
  it.skip('should not paybackloan if token is locked', async () => {
    await paybackLoanSetup()

    // Lock token
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

  it('should not lock invalid token', async () => {
    // Try to lock invalid token
    const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/locks/token/2': 'true' } })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetGovVariableTx execution failed:\nATTRIBUTES: No loan token with id (2)\', code: -32600, method: setgov')
  })

  it('should not unlock invalid token', async () => {
    // Try to unlock invalid token
    const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/locks/token/2': 'false' } })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetGovVariableTx execution failed:\nATTRIBUTES: No loan token with id (2)\', code: -32600, method: setgov')
  })
})
