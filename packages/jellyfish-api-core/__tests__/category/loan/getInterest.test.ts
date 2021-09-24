import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)
  let interestTSLABlockHeight: number
  let txUber: string

  async function setup (): Promise<void> {
    // token setup
    const collateralAddress = await testing.generateAddress()
    await testing.token.dfi({ address: collateralAddress, amount: 30000 })
    await testing.generate(1)

    // oracle setup
    const addr = await testing.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'UBER', currency: 'USD' },
      { token: 'AMZN', currency: 'USD' }
    ]
    const oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '4@UBER', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '8@AMZN', currency: 'USD' }] })
    await testing.generate(1)

    // collateral token
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      priceFeedId: 'DFI/USD'
      // activateAfterBlock: 130  // <- hit socket hang up
    })
    await testing.generate(1)

    // loan token
    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      priceFeedId: 'TSLA/USD'
    })
    await testing.generate(1)

    txUber = await testing.rpc.loan.setLoanToken({
      symbol: 'UBER',
      priceFeedId: 'UBER/USD',
      interest: new BigNumber('5')
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'AMZN',
      priceFeedId: 'AMZN/USD',
      interest: new BigNumber('2')
    })
    await testing.generate(1)

    // loan scheme set up
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await testing.generate(1)

    const vaultAddress = await testing.generateAddress()
    const vaultId = await testing.rpc.loan.createVault({
      ownerAddress: vaultAddress,
      loanSchemeId: 'scheme'
    })
    await testing.generate(1)

    await testing.rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '10000@DFI'
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '1000@TSLA'
    })
    await testing.generate(1)

    interestTSLABlockHeight = await testing.rpc.blockchain.getBlockCount()

    await testing.rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '50@UBER'
    })
    await testing.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '250@AMZN'
    })
    await testing.generate(1)
  }

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getInterest', async () => {
    const interests = await testing.rpc.loan.getInterest('scheme')
    /**
     * output:
     *
     * [{
     *  token: 'TSLA',
     *  totalInterest: 0.00000285,
     *  interestPerBlock: 0.00000057
     * }]
     */
    expect(interests.length).toStrictEqual(3)
    expect(interests[0].token).toStrictEqual('TSLA')
    expect(interests[1].token).toStrictEqual('UBER')
    expect(interests[2].token).toStrictEqual('AMZN')

    // calculate interest per block
    const netInterest = (3 + 0) / 100 // (scheme.rate + loanToken.interest) / 100
    const blocksPerDay = (60 * 60 * 24) / (10 * 60) // 144 in regtest
    const interestPerBlock = (netInterest * 1) / (365 * blocksPerDay) //  netInterest * rate.count / 365 * blocksPerDay
    expect(interests[0].interestPerBlock.toFixed(8)).toStrictEqual(interestPerBlock.toFixed(8))

    // calculate total interest
    const blockHeight = await testing.rpc.blockchain.getBlockCount()
    const totalInterest = ((blockHeight - interestTSLABlockHeight + 1) * interestPerBlock)
    expect(interests[0].totalInterest.toFixed(8)).toStrictEqual(totalInterest.toFixed(8))
  })

  it('should getInterest with token', async () => {
    // name
    {
      const interests = await testing.rpc.loan.getInterest('scheme', 'TSLA')
      expect(interests.length).toStrictEqual(1)
      expect(interests[0].token).toStrictEqual('TSLA')
    }

    // creationTx
    {
      const interests = await testing.rpc.loan.getInterest('scheme', txUber)
      expect(interests.length).toStrictEqual(1)
      expect(interests[0].token).toStrictEqual('UBER')
    }

    // id
    {
      const interests = await testing.rpc.loan.getInterest('scheme', '3')
      expect(interests.length).toStrictEqual(1)
      expect(interests[0].token).toStrictEqual('AMZN')
    }
  })

  it('should not getInterest with nonexistent scheme', async () => {
    const promise = testing.rpc.loan.getInterest('notexist')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot find existing loan scheme with id notexist')
  })

  it('should not getInterest as scheme more that 8 chars long', async () => {
    const promise = testing.rpc.loan.getInterest('longlongid')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('id cannot be empty or more than 8 chars long')
  })

  it('should not getInterest with empty scheme', async () => {
    const promise = testing.rpc.loan.getInterest('')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('id cannot be empty or more than 8 chars long')
  })

  it('should not getInterest with nonexistent token', async () => {
    const promise = testing.rpc.loan.getInterest('scheme', '999')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Token 999 does not exist!')
  })
})
