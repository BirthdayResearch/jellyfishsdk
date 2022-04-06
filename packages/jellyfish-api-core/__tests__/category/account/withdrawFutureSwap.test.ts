import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { FutureSwap } from 'packages/jellyfish-api-core/src/category/account'
import { RpcApiError } from '@defichain/jellyfish-api-core'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)
let collateralAddress: string
let oracleId: string
const attributeKey = 'ATTRIBUTES'
let futInterval: number
let futRewardPercentage: number
const contractAddress = 'bcrt1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpsqgljc'
const swapAmount = 1

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

describe('withdrawFutureSwap', () => {
  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should withdraw futureswap dtoken to dusd - before settle block', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@TSLA' })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    const withdrawAmount = swapAmount / 2
    const withdrawFutureSwap: FutureSwap = {
      address: tslaAddress,
      amount: withdrawAmount.toString() + '@TSLA'
    }

    // withdraw half of the future swap
    {
      const result = await testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      expect(typeof result).toStrictEqual('string')
      expect(result.length).toStrictEqual(64)
      await testing.generate(1)
    }

    // check the future swap after withdrawing a half
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual((swapAmount - withdrawAmount).toFixed(8) + '@TSLA')
      expect(pendingFutures[0].destination).toStrictEqual('DUSD')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([(swapAmount - withdrawAmount).toFixed(8) + '@TSLA'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([(swapAmount - withdrawAmount).toFixed(8) + '@TSLA'])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([withdrawAmount.toFixed(8) + '@TSLA'])
      }
    }

    // withdraw second half of the future swap
    {
      const result = await testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      expect(typeof result).toStrictEqual('string')
      expect(result.length).toStrictEqual(64)
      await testing.generate(1)
    }

    // check the future after withdrawing all
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([(withdrawAmount * 2).toFixed(8) + '@TSLA'])
      }
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    const nextSettleBlock = await getNextSettleBlock()
    expect(currentBlock).toBeLessThan(nextSettleBlock)
  })

  it('should withdraw futureswap dusd to dtoken - before settle block', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@DUSD' })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@DUSD',
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    const withdrawAmount = swapAmount / 2
    const withdrawFutureSwap: FutureSwap = {
      address: tslaAddress,
      amount: withdrawAmount.toString() + '@DUSD',
      destination: 'TSLA'
    }

    // withdraw half of the future swap
    {
      const result = await testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      expect(typeof result).toStrictEqual('string')
      expect(result.length).toStrictEqual(64)
      await testing.generate(1)
    }

    // check the future swap after withdrawing a half
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual((swapAmount - withdrawAmount).toFixed(8) + '@DUSD')
      expect(pendingFutures[0].destination).toStrictEqual('TSLA')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([(swapAmount - withdrawAmount).toFixed(8) + '@DUSD'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([(swapAmount - withdrawAmount).toFixed(8) + '@DUSD'])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([withdrawAmount.toFixed(8) + '@DUSD'])
      }
    }

    // withdraw second half of the future swap
    {
      const result = await testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      expect(typeof result).toStrictEqual('string')
      expect(result.length).toStrictEqual(64)
      await testing.generate(1)
    }

    // check the future after withdrawing all
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([(withdrawAmount * 2).toFixed(8) + '@DUSD'])
      }
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    const nextSettleBlock = await getNextSettleBlock()
    expect(currentBlock).toBeLessThan(nextSettleBlock)
  })

  it('should withdraw 1 satoshi futureswap dtoken to dusd - before settle block', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@TSLA' })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    const withdrawAmount = 0.00000001
    const withdrawFutureSwap: FutureSwap = {
      address: tslaAddress,
      amount: withdrawAmount.toString() + '@TSLA'
    }

    // withdraw half of the future swap
    {
      const result = await testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      expect(typeof result).toStrictEqual('string')
      expect(result.length).toStrictEqual(64)
      await testing.generate(1)
    }

    // check the future swap after withdrawing 1 satoshi
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual((swapAmount - withdrawAmount).toFixed(8) + '@TSLA')
      expect(pendingFutures[0].destination).toStrictEqual('DUSD')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([(swapAmount - withdrawAmount).toFixed(8) + '@TSLA'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([(swapAmount - withdrawAmount).toFixed(8) + '@TSLA'])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([withdrawAmount.toFixed(8) + '@TSLA'])
      }
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    const nextSettleBlock = await getNextSettleBlock()
    expect(currentBlock).toBeLessThan(nextSettleBlock)
  })

  it('should withdraw 1 satoshi futureswap dusd to dtoken - before settle block', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@DUSD' })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@DUSD',
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    const withdrawAmount = 0.00000001
    const withdrawFutureSwap: FutureSwap = {
      address: tslaAddress,
      amount: withdrawAmount.toString() + '@DUSD',
      destination: 'TSLA'
    }

    // withdraw 1 satoshi of the future swap
    {
      const result = await testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      expect(typeof result).toStrictEqual('string')
      expect(result.length).toStrictEqual(64)
      await testing.generate(1)
    }

    // check the future swap after withdrawing 1 satoshi
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual((swapAmount - withdrawAmount).toFixed(8) + '@DUSD')
      expect(pendingFutures[0].destination).toStrictEqual('TSLA')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([(swapAmount - withdrawAmount).toFixed(8) + '@DUSD'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([(swapAmount - withdrawAmount).toFixed(8) + '@DUSD'])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([withdrawAmount.toFixed(8) + '@DUSD'])
      }
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    const nextSettleBlock = await getNextSettleBlock()
    expect(currentBlock).toBeLessThan(nextSettleBlock)
  })

  it('should not withdraw invalid futureswap dtoken to dusd - before settle block', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@TSLA' })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // withdraw more than the future swap amount
    {
      const withdrawAmount = swapAmount + 0.00000001
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: withdrawAmount.toString() + '@TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 1.00000000 is less than 1.00000001\', code: -32600, method: withdrawfutureswap')
    }

    // Withdraw fail - Destination should not be set when source amount is a dToken
    {
      const withdrawAmount = 0.5
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: withdrawAmount.toString() + '@TSLA',
        destination: 'DUSD'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nDestination should not be set when source amount is a dToken\', code: -32600, method: withdrawfutureswap')
    }

    // Withdraw fail - amount 0.00000000 is less than 0.50000000
    {
      const withdrawAmount = 0.5
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: withdrawAmount.toString() + '@DUSD',
        destination: 'TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 0.00000000 is less than 0.50000000\', code: -32600, method: withdrawfutureswap')
    }

    // Withdraw fail - Invalid Defi token: NANA
    {
      const withdrawAmount = 0.5
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: withdrawAmount.toString() + '@NANA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \': Invalid Defi token: NANA\', code: 0, method: withdrawfutureswap')
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    const nextSettleBlock = await getNextSettleBlock()
    expect(currentBlock).toBeLessThan(nextSettleBlock)
  })

  it('should not withdraw invalid futureswap dusd to dtoken - before settle block', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@DUSD' })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@DUSD',
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // withdraw more than the future swap amount
    {
      const withdrawAmount = swapAmount + 0.00000001
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: withdrawAmount.toString() + '@DUSD',
        destination: 'TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 1.00000000 is less than 1.00000001\', code: -32600, method: withdrawfutureswap')
    }

    // Withdraw fail - Could not get destination loan token 0. Set valid destination
    {
      const withdrawAmount = 0.5
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: withdrawAmount.toString() + '@DUSD'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nCould not get destination loan token 0. Set valid destination.\', code: -32600, method: withdrawfutureswap')
    }

    // Withdraw fail - amount 0.00000000 is less than 0.50000000
    {
      const withdrawAmount = 0.5
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: withdrawAmount.toString() + '@TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 0.00000000 is less than 0.50000000\', code: -32600, method: withdrawfutureswap')
    }

    // Withdraw fail - Invalid Defi token: NANA
    {
      const withdrawAmount = 0.5
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: withdrawAmount.toString() + '@NANA',
        destination: 'TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \': Invalid Defi token: NANA\', code: 0, method: withdrawfutureswap')
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    const nextSettleBlock = await getNextSettleBlock()
    expect(currentBlock).toBeLessThan(nextSettleBlock)
  })

  it('should not withdraw futureswap dtoken to dusd - after settle block', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@TSLA' })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // move to next settle block
    const nextSettleBlock = await getNextSettleBlock()
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    const withdrawAmount = swapAmount / 2
    const withdrawFutureSwap: FutureSwap = {
      address: tslaAddress,
      amount: withdrawAmount.toString() + '@TSLA'
    }

    // withdraw half of the future swap
    {
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 0.00000000 is less than 0.50000000\', code: -32600, method: withdrawfutureswap')
    }
  })

  it('should not withdraw futureswap dusd to dtoken - after settle block', async () => {
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@DUSD' })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: swapAmount.toString() + '@DUSD',
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // move to next settle block
    const nextSettleBlock = await getNextSettleBlock()
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    const withdrawAmount = swapAmount / 2
    const withdrawFutureSwap: FutureSwap = {
      address: tslaAddress,
      amount: withdrawAmount.toString() + '@DUSD',
      destination: 'TSLA'
    }

    // withdraw half of the future swap
    {
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 0.00000000 is less than 0.50000000\', code: -32600, method: withdrawfutureswap')
    }
  })
})
