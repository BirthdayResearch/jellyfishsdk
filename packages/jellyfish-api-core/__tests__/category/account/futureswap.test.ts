import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { DfTxType, FutureSwap } from '../../../src/category/account'
import { RpcApiError } from '@defichain/jellyfish-api-core'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)
let collateralAddress: string
let oracleId: string
let idDUSD: string
let idTSLA: string
const attributeKey = 'ATTRIBUTES'
let futInterval: number
let futRewardPercentage: number
const contractAddress = 'bcrt1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpsqgljc'

async function setup (): Promise<void> {
  collateralAddress = await testing.generateAddress()
  await testing.token.dfi({ address: collateralAddress, amount: 300000 })
  await testing.token.create({ symbol: 'BTC', collateralAddress })
  await testing.generate(1)
  await testing.token.mint({ symbol: 'BTC', amount: 20000 })
  await testing.generate(1)

  // loan scheme
  await testing.container.call('createloanscheme', [100, 1, 'default'])
  await testing.generate(1)

  // price oracle
  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'BTC', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'AMZN', currency: 'USD' },
    { token: 'DUSD', currency: 'USD' }
  ]

  const addr = await testing.generateAddress()
  oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
  await testing.generate(1)

  const timestamp = Math.floor(new Date().getTime() / 1000)
  await testing.rpc.oracle.setOracleData(
    oracleId,
    timestamp,
    {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '10000@BTC', currency: 'USD' },
        { tokenAmount: '2@TSLA', currency: 'USD' },
        { tokenAmount: '4@AMZN', currency: 'USD' },
        { tokenAmount: '1@DUSD', currency: 'USD' }
      ]
    }
  )
  await testing.generate(1)

  // collateral tokens
  await testing.rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(0.5),
    fixedIntervalPriceId: 'BTC/USD'
  })
  await testing.generate(1)

  // loan token
  await testing.rpc.loan.setLoanToken({
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setLoanToken({
    symbol: 'AMZN',
    fixedIntervalPriceId: 'AMZN/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setLoanToken({
    symbol: 'DUSD',
    fixedIntervalPriceId: 'DUSD/USD'
  })
  await testing.generate(1)

  idTSLA = await testing.token.getTokenId('TSLA')
  idDUSD = await testing.token.getTokenId('DUSD')

  // create a vault and take loans
  const vaultAddr = await testing.generateAddress()
  const vaultId = await testing.rpc.loan.createVault({
    ownerAddress: vaultAddr,
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.depositToVault({
    vaultId: vaultId, from: collateralAddress, amount: '100000@DFI'
  })

  // wait till the price valid.
  await testing.container.waitForPriceValid('TSLA/USD')

  // take multiple loans
  await testing.rpc.loan.takeLoan({
    vaultId: vaultId,
    to: collateralAddress,
    amounts: ['300@TSLA', '500@DUSD', '100@AMZN']
  })
  await testing.generate(1)

  // Futures setup
  // set the dfip2203/active to false
  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'false' } })
  await testing.generate(1)

  // set dfip2203 params
  futInterval = 25
  futRewardPercentage = 0.05
  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/reward_pct': futRewardPercentage.toString(), 'v0/params/dfip2203/block_period': futInterval.toString() } })
  await testing.generate(1)

  // activat the dfip2203/active now
  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'true' } })
  await testing.generate(1)

  // Retrive and verify gov vars
  const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/active']).toStrictEqual('true')
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/reward_pct']).toStrictEqual(futRewardPercentage.toString())
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/block_period']).toStrictEqual(futInterval.toString())
}

async function getNextSettleBlock (): Promise<number> {
  const blockCount = await testing.rpc.blockchain.getBlockCount()
  const nextSettleBlock = blockCount + (futInterval - (blockCount % futInterval))
  return nextSettleBlock
}

describe('futureSwap', () => {
  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should create futureswap dtoken to dusd', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@TSLA' })
    await testing.generate(1)

    const swapAmount = 1
    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // check the future is in effect
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(swapAmount.toFixed(8) + '@TSLA')
      expect(pendingFutures[0].destination).toStrictEqual('DUSD')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([])
      }
    }

    // get minted DUSD
    const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

    // move to next settle block
    const nextSettleBlock = await getNextSettleBlock()
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    let mintedDUSD: BigNumber
    // check future settled
    {
      // calclulate minted DUSD. dtoken goes for a discount.
      mintedDUSD = new BigNumber((1 - futRewardPercentage) * 2 * swapAmount).dp(8, BigNumber.ROUND_FLOOR) // (1 - reward percentage) * TSLADUSD value * TSLA swap amount;
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
      expect(dusdMintedAfter).toStrictEqual(dusdMintedBefore.plus(mintedDUSD))

      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([mintedDUSD.toFixed(8) + '@DUSD'])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([mintedDUSD.toFixed(8) + '@DUSD'])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2203).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])

    // check results can be retrived via account history
    const accountHistories = await testing.rpc.account.listAccountHistory('all', { txtype: DfTxType.FUTURE_SWAP_EXECUTION })
    expect(accountHistories[0]).toStrictEqual(expect.objectContaining({ owner: tslaAddress, type: 'FutureSwapExecution', amounts: [mintedDUSD.toFixed(8) + '@DUSD'] }))
  })

  it('should create futureswap dtoken to dusd just before the next settle block', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@TSLA' })
    await testing.generate(1)

    // move to next settle block - 1
    const nextSettleBlock = await getNextSettleBlock()
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount() - 1)

    // get minted DUSD
    const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

    const swapAmount = 1
    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // check future settled
    {
      // calclulate minted DUSD. dtoken goes for a discount.
      const mintedDUSD = new BigNumber((1 - futRewardPercentage) * 2 * swapAmount).dp(8, BigNumber.ROUND_FLOOR) // (1 - reward percentage) * TSLADUSD value * TSLA swap amount;
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
      expect(dusdMintedAfter).toStrictEqual(dusdMintedBefore.plus(mintedDUSD))

      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([mintedDUSD.toFixed(8) + '@DUSD'])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([mintedDUSD.toFixed(8) + '@DUSD'])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2203).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
  })

  it('should consider new oracle active price, if changed before futureswap execution', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@TSLA' })
    await testing.generate(1)

    let blockHeight = await testing.rpc.blockchain.getBlockCount()
    let nextSettleBlock = await getNextSettleBlock()

    // move to next settle block for better duration for the oracle price to kick in
    await testing.generate(nextSettleBlock - blockHeight)
    blockHeight = await testing.rpc.blockchain.getBlockCount()
    nextSettleBlock = await getNextSettleBlock()

    const swapAmount = 1
    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // change the oracle price
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: '2.2@TSLA', currency: 'USD' }
        ]
      }
    )
    await testing.generate(1)
    await testing.container.waitForActivePrice('TSLA/USD', '2.2')

    const blockHeightAfter = await testing.rpc.blockchain.getBlockCount()

    // check next settle block is not reached yet
    expect(blockHeightAfter).toBeLessThan(nextSettleBlock)

    // get minted DUSD
    const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

    // move to nextSettleBlock
    await testing.generate(nextSettleBlock - blockHeightAfter)

    // check future settled
    {
      // calclulate minted DUSD. dtoken goes for a discount.
      const mintedDUSD = new BigNumber((1 - futRewardPercentage) * 2.2 * swapAmount).dp(8, BigNumber.ROUND_FLOOR) // (1 - reward percentage) * TSLADUSD value * TSLA swap amount;
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
      expect(dusdMintedAfter).toStrictEqual(dusdMintedBefore.plus(mintedDUSD))

      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([mintedDUSD.toFixed(8) + '@DUSD'])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([mintedDUSD.toFixed(8) + '@DUSD'])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2203).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
  })

  it('should refund if the oracle price is invalid at futureswap execution block', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@TSLA' })
    await testing.generate(1)

    let blockHeight = await testing.rpc.blockchain.getBlockCount()
    let nextSettleBlock = await getNextSettleBlock()

    // move to next settle block
    await testing.generate(nextSettleBlock - blockHeight)
    blockHeight = await testing.rpc.blockchain.getBlockCount()
    nextSettleBlock = await getNextSettleBlock()
    const nextPriceBlock = await testing.container.getImmediatePriceBlockBeforeBlock('TSLA/USD', nextSettleBlock)

    // create the futureswap
    const swapAmount = 1
    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // check the futureswap is in effect
    const pendingFutures = await testing.container.call('listpendingfutureswaps')
    expect(pendingFutures.length).toStrictEqual(1)

    // move to nextPriceBlock - 1
    await testing.generate(nextPriceBlock - 1 - await testing.rpc.blockchain.getBlockCount())

    // change the oracle price
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: '3@TSLA', currency: 'USD' }
        ]
      }
    )
    await testing.generate(1)
    {
      // now check the price invalid
      const priceDataInvalid = await testing.rpc.oracle.getFixedIntervalPrice('TSLA/USD')
      expect(priceDataInvalid.isLive).toBeFalsy()
    }

    // get minted DUSD
    const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

    // move to nextSettleBlock
    await testing.generate(nextSettleBlock - nextPriceBlock)

    // check price is still invalid
    {
      const priceDataInvalid = await testing.rpc.oracle.getFixedIntervalPrice('TSLA/USD')
      expect(priceDataInvalid.isLive).toBeFalsy()
    }

    // check futureswap is not executed.
    {
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
      expect(dusdMintedAfter).toStrictEqual(dusdMintedBefore)

      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2203).toStrictEqual([])

    // check results can be retrived via account history
    const accountHistories = await testing.rpc.account.listAccountHistory('all', { txtype: DfTxType.FUTURE_SWAP_REFUND })
    expect(accountHistories[0]).toStrictEqual(expect.objectContaining({ owner: contractAddress, type: 'FutureSwapRefund', amounts: ['-' + swapAmount.toFixed(8) + '@TSLA'] }))
    expect(accountHistories[1]).toStrictEqual(expect.objectContaining({ owner: tslaAddress, type: 'FutureSwapRefund', amounts: [swapAmount.toFixed(8) + '@TSLA'] }))
  })

  it('should create futureswap dusd to dtoken', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@DUSD' })
    await testing.generate(1)

    const swapAmount = 1
    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@DUSD',
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // check the future is in effect
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(swapAmount.toFixed(8) + '@DUSD')
      expect(pendingFutures[0].destination).toStrictEqual('TSLA')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([swapAmount.toFixed(8) + '@DUSD'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([swapAmount.toFixed(8) + '@DUSD'])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([])
      }
    }

    // get minted TSLA
    const tslaMintedBefore = (await testing.rpc.token.getToken(idTSLA))[idTSLA].minted

    // move to next settle block
    const nextSettleBlock = await getNextSettleBlock()
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    // check future settled
    {
      // calclulate minted TSLA. dtoken goes for a premium.
      const mintedTSLA = new BigNumber((1 / (1 + futRewardPercentage)) * (1 / 2) * swapAmount).dp(8, BigNumber.ROUND_FLOOR) // (1/(1 + reward percentage)) * (DUSDTSLA) value * DUSD swap amount;
      const tslaMintedAfter = (await testing.rpc.token.getToken(idTSLA))[idTSLA].minted
      expect(tslaMintedAfter).toStrictEqual(tslaMintedBefore.plus(mintedTSLA))

      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([swapAmount.toFixed(8) + '@DUSD'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([swapAmount.toFixed(8) + '@DUSD'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([mintedTSLA.toString() + '@TSLA'])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([swapAmount.toFixed(8) + '@DUSD'])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([mintedTSLA.toString() + '@TSLA'])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2203).toStrictEqual([swapAmount.toFixed(8) + '@DUSD'])
  })

  it('should not create futureswap when DFIP2203 is not active', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@TSLA' })
    await testing.generate(1)

    // deactivate DFIP2203
    await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'false' } })
    await testing.generate(1)
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES['v0/params/dfip2203/active']).toStrictEqual('false')

    const swapAmount = 1
    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@TSLA'
    }

    const promise = testing.rpc.account.futureSwap(fswap)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nDFIP2203 not currently active\', code: -32600, method: futureswap')
  })

  it('should refund the futureswap if DFIP2203 is disabled before execution', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@TSLA' })
    await testing.generate(1)

    // create the futureswap
    const swapAmount = 1
    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    const nextSettleBlock = await getNextSettleBlock()

    // check the futureswap is in effect
    const pendingFutures = await testing.container.call('listpendingfutureswaps')
    expect(pendingFutures.length).toStrictEqual(1)

    // get minted DUSD
    const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

    // deactivate DFIP2203
    await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'false' } })
    await testing.generate(1)
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES['v0/params/dfip2203/active']).toStrictEqual('false')

    // move to nextSettleBlock
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    // check futureswap is not executed.
    {
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
      expect(dusdMintedAfter).toStrictEqual(dusdMintedBefore)

      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([swapAmount.toFixed(8) + '@TSLA'])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2203).toStrictEqual([])
  })

  it('should not create futureswap when invalid inputs given', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@TSLA' })
    await testing.generate(1)

    {
      // zero source amount is given
      const fswap: FutureSwap = {
        address: tslaAddress,
        amount: '0@TSLA'
      }
      const promise = testing.rpc.account.futureSwap(fswap)
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('RpcApiError: \': Amount out of range\', code: -3, method: futureswap')
    }
    {
      // negative source amount is given
      const fswap: FutureSwap = {
        address: tslaAddress,
        amount: '-1@TSLA'
      }
      const promise = testing.rpc.account.futureSwap(fswap)
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('RpcApiError: \': Amount out of range\', code: -3, method: futureswap')
    }
    {
      // invlaid source dtoken
      const fswap: FutureSwap = {
        address: tslaAddress,
        amount: '1@INVALID'
      }
      const promise = testing.rpc.account.futureSwap(fswap)
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('RpcApiError: \': Invalid Defi token: INVALID\', code: 0, method: futureswap')
    }
    {
      // non loan source token
      const fswap: FutureSwap = {
        address: tslaAddress,
        amount: '1@BTC'
      }
      const promise = testing.rpc.account.futureSwap(fswap)
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nCould not get source loan token 1\', code: -32600, method: futureswap')
    }
    {
      // destination is given when futureswap dtoken to dusd
      const fswap: FutureSwap = {
        address: tslaAddress,
        amount: '1@TSLA',
        destination: 'DUSD'
      }
      const promise = testing.rpc.account.futureSwap(fswap)
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nDestination should not be set when source amount is a dToken\', code: -32600, method: futureswap')
    }
    {
      // INVALID destination is given when futureswap dusd to dtoken
      const fswap: FutureSwap = {
        address: tslaAddress,
        amount: '1@DUSD',
        destination: 'INVALID'
      }
      const promise = testing.rpc.account.futureSwap(fswap)
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('RpcApiError: \'Destination token not found\', code: -5, method: futureswap')
    }
  })

  it('should not create futureswap when DFIP2203 is disabled for the dtoken', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@TSLA' })
    await testing.generate(1)

    // deactivate DFIP2203 for dtoken
    const key = 'v0/token/' + idTSLA + '/dfip2203'

    await testing.rpc.masternode.setGov({ [attributeKey]: { [key]: 'false' } })
    await testing.generate(1)
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES[key]).toStrictEqual('false')

    const swapAmount = 1
    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@TSLA'
    }

    const promise = testing.rpc.account.futureSwap(fswap)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nDFIP2203 currently disabled for token 2\', code: -32600, method: futureswap')
  })
})
