import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'

describe('Setgov.locks.token', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let collateralAddress: string
  // let tslaID: string
  // let vaultId: string

  async function setup (): Promise<void> {
    // @TODO chanakasameera
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

  it('should lock token', async () => {
    // @TODO chanakasameera
    // Write some scenarios that involves locks and unlock
    // You may seperate this 4 into 4 test items (4 it)

    // lock / unlock token
    // lock / unlock oracle
    // lock / unlock pool
    // lock / unlock vault
  })

  it('should not update token if token is locked', async () => {
    // @TODO chanakasameera
    // Add more scenarios other than the one written in the setup function
    // Throw exception => Cannot update token during lock
  })

  it('should not pool swap if token is locked', async () => {
    // @TODO chanakasameera
    // Add more scenarios other than the one written in the setup function

    // Should throw the following error (Maybe wrong)
    // await expect(promise).rejects.toThrow(RpcApiError)
    // await expect(promise).rejects.toThrow('RpcApiError: \'Test PoolSwapTx execution failed:\nPool currently disabled due to locked token\', code: -32600, method: poolswap')
  })

  it('should not future swap if token is locked', async () => {
    // @TODO chanakasameera
    // Add more scenarios other than the one written in the setup function

    // Should throw the following error (Maybe wrong)
    // await expect(promise).rejects.toThrow(RpcApiError)
    // await expect(promise).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nCannot create future swap for locked token\', code: -32600, method: futureswap')
  })

  it('should not depositToVault if token is locked', async () => {
    // @TODO chanakasameera
    // Add more scenarios other than the one written in the setup function

    // Should throw the following error (Maybe wrong)
    // await expect(promise).rejects.toThrow(RpcApiError)
    // await expect(promise).rejects.toThrow('RpcApiError: \'Test DepositToVaultTx execution failed:\nFixed interval price currently disabled due to locked token\', code: -32600, method: deposittovault')
  })

  it('should not takeLoan if token is locked', async () => {
    // @TODO chanakasameera
    // Add more scenarios other than the one written in the setup function

    // Should throw the following error (Maybe wrong)
    // await expect(promise).rejects.toThrow(RpcApiError)
    // await expect(promise).rejects.toThrow('RpcApiError: \'Test TakeLoanTx execution failed:\nCannot take loan while any of the asset\'s price in the vault is not live\', code: -32600, method: takeloan')
  })

  it('should not withdrawFromVault if token is locked', async () => {
    // @TODO chanakasameera
    // Add more scenarios other than the one written in the setup function

    // Should throw the following error (Maybe wrong)
    // await expect(promise).rejects.toThrow(RpcApiError)
    // await expect(promise).rejects.toThrow('RpcApiError: \'Test WithdrawFromVaultTx execution failed:\nCannot withdraw from vault while any of the asset\'s price is invalid\', code: -32600, method: withdrawfromvault')
  })

  it('should not paybackloan if token is locked', async () => {
    // @TODO chanakasameera
    // Add more scenarios other than the one written in the setup function

    // Should throw the following error (Maybe wrong)
    // Throw exception => Pool currently disabled due to locked token
  })
})
