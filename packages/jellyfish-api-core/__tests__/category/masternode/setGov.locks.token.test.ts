import { poolpair, RpcApiError } from '@defichain/jellyfish-api-core'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'

describe('Setgov.locks.token', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let collateralAddress: string
  let tslaID: string
  // let vaultId: string
  let oracleID: string

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

    oracleID = await testing.rpc.oracle.appointOracle(await testing.generateAddress(),
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

  async function tokenSetup (): Promise<void> {
  }

  async function oracleSetup (): Promise<void> {
  }

  async function poolSwapSetup (): Promise<void> {
    const vaultId = await testing.rpc.vault.createVault({
      ownerAddress: collateralAddress,
      loanSchemeId: 'default'
    })
    await testing.generate(12)

    await testing.rpc.vault.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '1@DFI'
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '1@TSLA'
    })
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
    const vaultId = await testing.rpc.vault.createVault({
      ownerAddress: collateralAddress,
      loanSchemeId: 'default'
    })
    await testing.generate(12)

    await testing.container.call('deposittovault', [vaultId, collateralAddress, '1@DFI'])
    await testing.generate(1)

    await testing.container.call('takeloan', [{
      vaultId: vaultId,
      amounts: '1@TSLA'
    }])
    await testing.generate(1)

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
    // @TODO chanakasameera
    // Add this function that is used by depositToVault
  }

  async function takeLoanSetup (): Promise<void> {
    // @TODO chanakasameera
    // Add this function that is used by takeloan
  }

  async function withdrawFromVaultSetup (): Promise<void> {
    // @TODO chanakasameera
    // Add this function that is used by withdrawFromVault
  }

  async function paybackLoanSetup (): Promise<void> {
    // @TODO chanakasameera
    // Add this function that is used by paybackLoan
  }

  it('should update token if token is unlocked', async () => {
    await tokenSetup()

    // Unlock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaID}`]: 'false' } })
    await testing.generate(1)

    // update token
    await testing.rpc.token.updateToken(tslaID, { name: 'Tesla' })
    await testing.generate(1)

    const tslaInfo = await testing.rpc.token.getToken(tslaID)
    expect(tslaInfo[tslaID].name).toStrictEqual('Tesla')
  })

  it('should getfixedintervalprice if token is unlocked', async () => {
    await oracleSetup()

    // Unlock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaID}`]: 'false' } })
    await testing.generate(1)

    // getfixedintervalprice
    const price = await testing.rpc.oracle.getFixedIntervalPrice('TSLA/USD')
    expect(price.fixedIntervalPriceId).toStrictEqual('TSLA/USD')
    expect(price.isLive).toStrictEqual(true)
  })

  it('should poolSwap if token is unlocked', async () => {
    await poolSwapSetup()

    // Unlock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaID}`]: 'false' } })
    await testing.generate(1)

    // poolswap
    const swapReceiveAddress = await testing.generateAddress()
    const metadata: poolpair.PoolSwapMetadata = {
      from: collateralAddress,
      tokenFrom: 'DFI',
      amountFrom: 0.5,
      to: swapReceiveAddress,
      tokenTo: 'TSLA'
    }
    const hex = await testing.rpc.poolpair.poolSwap(metadata)
    await testing.generate(1)
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    expect(await testing.rpc.account.getAccount(swapReceiveAddress)).toStrictEqual(['0.32333333@TSLA'])
  })

  it('should futureSwap if token is unlocked', async () => {
    await futureSwapSetup()

    // Unlock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaID}`]: 'false' } })
    await testing.generate(1)

    const burnAddress = 'bcrt1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpsqgljc'
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

    // futureswap
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
  })

  it('should depositToVault if token is unlocked', async () => {
    await depositToVaultSetup()
    // @TODO chanakasameera
    // Unlock token
    // depositToVault
  })

  it('should takeLoan if token is unlocked', async () => {
    await takeLoanSetup()
    // @TODO chanakasameera
    // Unlock token
    // takeLoan
  })

  it('should withdrawFromVault if token is unlocked', async () => {
    await withdrawFromVaultSetup()
    // @TODO chanakasameera
    // Unlock token
    // withdrawFromVault
  })

  it('should paybackLoan if token is unlocked', async () => {
    await paybackLoanSetup()
    // @TODO chanakasameera
    // Unlock token
    // paybackLoan
  })

  it('should not update token if token is locked', async () => {
    await tokenSetup()

    // Lock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaID}`]: 'true' } })
    await testing.generate(1)

    // Try update token
    const promise = testing.rpc.token.updateToken(tslaID, { name: 'Tesla' })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateTokenAnyTx execution failed:\nCannot update token during lock\', code: -32600, method: updatetoken')
  })

  it('should not getfixedintervalprice if token is locked', async () => {
    await oracleSetup()

    // Lock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaID}`]: 'true' } })
    await testing.generate(1)

    // Try getfixedintervalprice
    const promise = testing.rpc.oracle.getFixedIntervalPrice('TSLA/USD')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Fixed interval price currently disabled due to locked token\', code: -5, method: getfixedintervalprice')
  })

  it('should not poolSwap if token is locked', async () => {
    await poolSwapSetup()

    // Lock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaID}`]: 'true' } })
    await testing.generate(1)

    // Try poolswap
    const swapReceiveAddress = await testing.generateAddress()
    const metadata: poolpair.PoolSwapMetadata = {
      from: collateralAddress,
      tokenFrom: 'DFI',
      amountFrom: 0.5,
      to: swapReceiveAddress,
      tokenTo: 'TSLA'
    }
    const promise = testing.rpc.poolpair.poolSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test PoolSwapTx execution failed:\nPool currently disabled due to locked token\', code: -32600, method: poolswap')
  })

  it('should not futureSwap if token is locked', async () => {
    await futureSwapSetup()

    // Lock token
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${tslaID}`]: 'true' } })
    await testing.generate(1)

    // futureswap
    const promise = testing.rpc.account.futureSwap({
      address: collateralAddress,
      amount: '1@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nCannot create future swap for locked token\', code: -32600, method: futureswap')
  })

  it('should not depositToVault if token is locked', async () => {
    await depositToVaultSetup()
    // @TODO chanakasameera
    // Lock token
    // Try depositToVault
    // Should throw the following error (Maybe wrong)
    // await expect(promise).rejects.toThrow(RpcApiError)
    // await expect(promise).rejects.toThrow('RpcApiError: \'Test DepositToVaultTx execution failed:\nFixed interval price currently disabled due to locked token\', code: -32600, method: deposittovault')
  })

  it('should not takeLoan if token is locked', async () => {
    await takeLoanSetup()
    // @TODO chanakasameera
    // Lock token
    // Try takeLoan
    // Should throw the following error (Maybe wrong)
    // await expect(promise).rejects.toThrow(RpcApiError)
    // await expect(promise).rejects.toThrow('RpcApiError: \'Test TakeLoanTx execution failed:\nCannot take loan while any of the asset\'s price in the vault is not live\', code: -32600, method: takeloan')
  })

  it('should not withdrawFromVault if token is locked', async () => {
    await withdrawFromVaultSetup()
    // @TODO chanakasameera
    // Lock token
    // Try withdrawFromVault
    // Should throw the following error (Maybe wrong)
    // await expect(promise).rejects.toThrow(RpcApiError)
    // await expect(promise).rejects.toThrow('RpcApiError: \'Test WithdrawFromVaultTx execution failed:\nCannot withdraw from vault while any of the asset\'s price is invalid\', code: -32600, method: withdrawfromvault')
  })

  it('should not paybackloan if token is locked', async () => {
    await paybackLoanSetup()
    // @TODO chanakasameera
    // Lock token
    // Try paybackloan
    // Should throw the following error (Maybe wrong)
    // Throw exception => Pool currently disabled due to locked token
  })
})
