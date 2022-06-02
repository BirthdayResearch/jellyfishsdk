import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'

describe('Setgov.locks.token', () => {
  // @TODO chanakasameera
  // Holistic view: This file describes the test for
  // SetGov v0/locks/token/[any integer] = true / false
  // True will raise exception
  // False will give you positive scenario

  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let collateralAddress: string
  // let tslaID: string
  // let vaultId: string

  async function setup (): Promise<void> {
    // @TODO chanakasameera
    // This function should share the common code that is used by all test items
    // You may change this function if needed
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

    // const tslaInfo = await testing.rpc.token.getToken('TSLA')
    // tslaID = Object.keys(tslaInfo)[0]
  }

  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  async function tokenSetup (): Promise<void> {
    // @TODO chanakasameera
    // Add this function that is used by token
  }

  async function oracleSetup (): Promise<void> {
    // @TODO chanakasameera
    // Add this function that is used by oracle
  }

  async function poolSwapSetup (): Promise<void> {
    // @TODO chanakasameera
    // Add this function that is used by poolSwap
  }

  async function futureSwapSetup (): Promise<void> {
    // @TODO chanakasameera
    // Add this function that is used by futureSwap
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
    // @TODO chanakasameera
    // Unlock token
    // update token
  })

  it('should getfixedintervalprice if token is unlocked', async () => {
    await oracleSetup()
    // @TODO chanakasameera
    // Unlock token
    // getfixedintervalprice
  })

  it('should poolSwap if token is unlocked', async () => {
    await poolSwapSetup()
    // @TODO chanakasameera
    // Unlock token
    // poolswap
  })

  it('should futureSwap if token is unlocked', async () => {
    await futureSwapSetup()
    // @TODO chanakasameera
    // Unlock token
    // futureswap
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
    // @TODO chanakasameera
    // Lock token
    // Try update token
    // Should throw exception => Cannot update token during lock
  })

  it('should not getfixedintervalprice if token is locked', async () => {
    await oracleSetup()
    // @TODO chanakasameera
    // Lock token
    // Try getfixedintervalprice
    // Should Throw exception => Fixed interval price currently disabled due to locked token
  })

  it('should not poolSwap if token is locked', async () => {
    await poolSwapSetup()
    // @TODO chanakasameera
    // Lock token
    // Try poolswap
    // Should throw the following error (Maybe wrong)
    // await expect(promise).rejects.toThrow(RpcApiError)
    // await expect(promise).rejects.toThrow('RpcApiError: \'Test PoolSwapTx execution failed:\nPool currently disabled due to locked token\', code: -32600, method: poolswap')
  })

  it('should not futureSwap if token is locked', async () => {
    await futureSwapSetup()
    // @TODO chanakasameera
    // Lock token
    // Try futureswap
    // Should throw the following error (Maybe wrong)
    // await expect(promise).rejects.toThrow(RpcApiError)
    // await expect(promise).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nCannot create future swap for locked token\', code: -32600, method: futureswap')
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
