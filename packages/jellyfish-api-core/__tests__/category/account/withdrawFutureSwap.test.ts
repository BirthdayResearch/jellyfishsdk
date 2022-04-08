import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { FutureSwap } from 'packages/jellyfish-api-core/src/category/account'
import { RpcApiError } from '@defichain/jellyfish-api-core'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)
let collateralAddress: string
const attributeKey = 'ATTRIBUTES'
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
    { token: 'DUSD', currency: 'USD' }
  ]

  const addr = await testing.generateAddress()
  const oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
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
    amounts: ['300@TSLA', '500@DUSD']
  })
  await testing.generate(1)

  // Futures setup
  // set the dfip2203/active to false
  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'false' } })
  await testing.generate(1)

  // set dfip2203 params
  const futInterval = 25
  const futRewardPercentage = 0.05
  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/reward_pct': `${futRewardPercentage}`, 'v0/params/dfip2203/block_period': `${futInterval}` } })
  await testing.generate(1)

  // set the dfip2203/active to true
  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'true' } })
  await testing.generate(1)

  // Retrieve and verify gov vars
  const attributes = await testing.rpc.masternode.getGov(attributeKey)
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/active']).toStrictEqual('true')
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/reward_pct']).toStrictEqual(`${futRewardPercentage}`)
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/block_period']).toStrictEqual(`${futInterval}`)
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

  it('Should withdrawFutureSwap futureswap dtoken to dusd', async () => {
    const swapAmount = 1
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@TSLA`
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    const withdrawAmount = swapAmount / 2
    const withdrawFutureSwap: FutureSwap = {
      address: tslaAddress,
      amount: `${withdrawAmount.toFixed(8)}@TSLA`
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
      expect(pendingFutures[0].source).toStrictEqual(`${(swapAmount - withdrawAmount).toFixed(8)}@TSLA`)
      expect(pendingFutures[0].destination).toStrictEqual('DUSD')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${(swapAmount - withdrawAmount).toFixed(8)}@TSLA`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${(swapAmount - withdrawAmount).toFixed(8)}@TSLA`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${withdrawAmount.toFixed(8)}@TSLA`])
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
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
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
        expect(balance).toStrictEqual([`${(withdrawAmount * 2).toFixed(8)}@TSLA`])
      }
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    expect(currentBlock).toBeLessThan(nextSettleBlock)

    // move to next settle block
    await testing.generate(nextSettleBlock - currentBlock)

    // verify that no future swap happened
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([])

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
        expect(balance).toStrictEqual([`${(withdrawAmount * 2).toFixed(8)}@TSLA`])
      }
    }
  })

  it('Should withdrawFutureSwap futureswap dusd to dtoken', async () => {
    const swapAmount = 1
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@DUSD` })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@DUSD`,
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    const oneSatoshi = 0.00000001
    const oneSatoshiFutureSwap: FutureSwap = {
      address: tslaAddress,
      amount: `${oneSatoshi.toFixed(8)}@DUSD`,
      destination: 'TSLA'
    }

    const withdrawAmount = swapAmount - oneSatoshi
    const withdrawFutureSwap: FutureSwap = {
      address: tslaAddress,
      amount: `${withdrawAmount.toFixed(8)}@DUSD`,
      destination: 'TSLA'
    }

    // withdraw a part of the future swap
    {
      const result = await testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      expect(typeof result).toStrictEqual('string')
      expect(result.length).toStrictEqual(64)
      await testing.generate(1)
    }

    // check the future swap after withdrawing first part
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(`${(swapAmount - withdrawAmount).toFixed(8)}@DUSD`)
      expect(pendingFutures[0].destination).toStrictEqual('TSLA')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${(swapAmount - withdrawAmount).toFixed(8)}@DUSD`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${(swapAmount - withdrawAmount).toFixed(8)}@DUSD`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${withdrawAmount.toFixed(8)}@DUSD`])
      }
    }

    // withdraw second part of the future swap
    {
      const result = await testing.rpc.account.withdrawFutureSwap(oneSatoshiFutureSwap)
      expect(typeof result).toStrictEqual('string')
      expect(result.length).toStrictEqual(64)
      await testing.generate(1)
    }

    // check the future after withdrawing all
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
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
        expect(balance).toStrictEqual([`${(withdrawAmount + oneSatoshi).toFixed(8)}@DUSD`])
      }
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    expect(currentBlock).toBeLessThan(nextSettleBlock)

    // move to next settle block
    await testing.generate(nextSettleBlock - currentBlock)

    // verify that no future swap happened
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([])

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
        expect(balance).toStrictEqual([`${(withdrawAmount + oneSatoshi).toFixed(8)}@DUSD`])
      }
    }
  })

  it('Should withdrawFutureSwap from multiple futureswaps dtoken to dusd', async () => {
    const swapAmount = 1
    const swapAmount2 = 10
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount * 2}@TSLA` })
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount2}@DUSD` })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@TSLA`
    }
    const fswap2: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount2}@DUSD`,
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)
    await testing.rpc.account.futureSwap(fswap)
    await testing.rpc.account.futureSwap(fswap2)
    await testing.generate(1)

    const withdrawAmount = swapAmount * 1.5
    const withdrawFutureSwap: FutureSwap = {
      address: tslaAddress,
      amount: `${withdrawAmount.toFixed(8)}@TSLA`
    }

    // withdraw from first 2 future swaps and fswap2 should not be affected
    {
      const result = await testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      expect(typeof result).toStrictEqual('string')
      expect(result.length).toStrictEqual(64)
      await testing.generate(1)
    }

    // check the future swaps after withdrawing
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(2)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(`${(swapAmount * 2 - withdrawAmount).toFixed(8)}@TSLA`)
      expect(pendingFutures[0].destination).toStrictEqual('DUSD')
      expect(pendingFutures[1].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[1].source).toStrictEqual(`${swapAmount2.toFixed(8)}@DUSD`)
      expect(pendingFutures[1].destination).toStrictEqual('TSLA')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${(swapAmount * 2 - withdrawAmount).toFixed(8)}@TSLA`, `${swapAmount2.toFixed(8)}@DUSD`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${(swapAmount * 2 - withdrawAmount).toFixed(8)}@TSLA`, `${swapAmount2.toFixed(8)}@DUSD`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${withdrawAmount.toFixed(8)}@TSLA`])
      }
    }

    const oneSatoshi = 0.00000001
    const oneSatoshiFutureSwap: FutureSwap = {
      address: tslaAddress,
      amount: `${oneSatoshi.toFixed(8)}@TSLA`
    }

    // withdraw 1 satoshi and fswap2 should not be affected
    {
      const result = await testing.rpc.account.withdrawFutureSwap(oneSatoshiFutureSwap)
      expect(typeof result).toStrictEqual('string')
      expect(result.length).toStrictEqual(64)
      await testing.generate(1)
    }

    // check the future swaps after withdrawing 1 satoshi
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(2)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(`${(swapAmount * 2 - withdrawAmount - oneSatoshi).toFixed(8)}@TSLA`)
      expect(pendingFutures[0].destination).toStrictEqual('DUSD')
      expect(pendingFutures[1].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[1].source).toStrictEqual(`${swapAmount2.toFixed(8)}@DUSD`)
      expect(pendingFutures[1].destination).toStrictEqual('TSLA')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${(swapAmount * 2 - withdrawAmount - oneSatoshi).toFixed(8)}@TSLA`, `${swapAmount2.toFixed(8)}@DUSD`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${(swapAmount * 2 - withdrawAmount - oneSatoshi).toFixed(8)}@TSLA`, `${swapAmount2.toFixed(8)}@DUSD`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${(withdrawAmount + oneSatoshi).toFixed(8)}@TSLA`])
      }
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    expect(currentBlock).toBeLessThan(nextSettleBlock)
  })

  it('Should withdrawFutureSwap from multiple futureswaps dusd to dtoken', async () => {
    const swapAmount = 1
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount * 2}@DUSD` })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@DUSD`,
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    const withdrawFutureSwap1: FutureSwap = {
      address: tslaAddress,
      amount: `${(swapAmount * 0.8).toFixed(8)}@DUSD`,
      destination: 'TSLA'
    }
    const withdrawFutureSwap2: FutureSwap = {
      address: tslaAddress,
      amount: `${(swapAmount * 1.2).toFixed(8)}@DUSD`,
      destination: 'TSLA'
    }

    // withdraw all within the same block
    {
      const result1 = await testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap1)
      expect(typeof result1).toStrictEqual('string')
      expect(result1.length).toStrictEqual(64)
      const result2 = await testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap2)
      expect(typeof result2).toStrictEqual('string')
      expect(result2.length).toStrictEqual(64)
      await testing.generate(1)
    }

    // check the future swap after withdrawing all
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
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
        expect(balance).toStrictEqual([`${(swapAmount * 2).toFixed(8)}@DUSD`])
      }
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    expect(currentBlock).toBeLessThan(nextSettleBlock)
  })

  it('Should withdrawFutureSwap futureswap dtoken to dusd with utxo', async () => {
    const swapAmount = 1
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount}@TSLA`
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    const utxo = await testing.container.fundAddress(tslaAddress, 50)

    const txid = await testing.rpc.account.withdrawFutureSwap(fswap, [utxo])
    await testing.generate(1)

    const rawtx = await testing.container.call('getrawtransaction', [txid, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)

    // check the future is in effect
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
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
        expect(balance).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      }
    }
  })

  it('Should withdrawFutureSwap futureswap dusd to dtoken with utxo', async () => {
    const swapAmount = 1
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@DUSD` })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@DUSD`,
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    const utxo = await testing.container.fundAddress(tslaAddress, 50)

    const withdrawAmount = swapAmount / 2
    const withdrawFutureSwap: FutureSwap = {
      address: tslaAddress,
      amount: `${withdrawAmount.toFixed(8)}@DUSD`,
      destination: 'TSLA'
    }

    const txid = await testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap, [utxo])
    await testing.generate(1)

    const rawtx = await testing.container.call('getrawtransaction', [txid, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)

    // check the future is in effect
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(`${(swapAmount - withdrawAmount).toFixed(8)}@DUSD`)
      expect(pendingFutures[0].destination).toStrictEqual('TSLA')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${(swapAmount - withdrawAmount).toFixed(8)}@DUSD`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${(swapAmount - withdrawAmount).toFixed(8)}@DUSD`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${withdrawAmount.toFixed(8)}@DUSD`])
      }
    }
  })

  it('Should not withdrawFutureSwap invalid futureswap dtoken to dusd', async () => {
    const swapAmount = 1
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@TSLA`
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // withdraw more than the future swap amount
    {
      const withdrawAmount = swapAmount + 0.00000001
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: `${withdrawAmount.toFixed(8)}@TSLA`
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
        amount: `${withdrawAmount.toFixed(8)}@TSLA`,
        destination: 'DUSD'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nDestination should not be set when source amount is a dToken\', code: -32600, method: withdrawfutureswap')
    }

    // Withdraw fail - try to withdraw from unavailable futureswap
    {
      const withdrawAmount = 0.5
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: `${withdrawAmount.toFixed(8)}@DUSD`,
        destination: 'TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 0.00000000 is less than 0.50000000\', code: -32600, method: withdrawfutureswap')
    }

    // Withdraw fail - Invalid Defi token: INVALID
    {
      const withdrawAmount = 0.5
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: `${withdrawAmount.toFixed(8)}@INVALID`
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \': Invalid Defi token: INVALID\', code: 0, method: withdrawfutureswap')
    }

    // withdraw from arbitrary address
    {
      const withdrawAmount = swapAmount
      const withdrawAddress = await testing.generateAddress()
      const withdrawFutureSwap: FutureSwap = {
        address: withdrawAddress,
        amount: `${withdrawAmount.toFixed(8)}@TSLA`
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 0.00000000 is less than 1.00000000\', code: -32600, method: withdrawfutureswap')
    }

    // withdraw from arbitrary utxo
    {
      const withdrawAmount = swapAmount
      const utxoAddress = await testing.generateAddress()
      const utxo = await testing.container.fundAddress(utxoAddress, 50)
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: `${withdrawAmount.toFixed(8)}@TSLA`
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap, [utxo])
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nTransaction must have at least one input from owner\', code: -32600, method: withdrawfutureswap')
    }

    // withdraw 0 amount
    {
      const withdrawAmount = 0
      const withdrawAddress = await testing.generateAddress()
      const withdrawFutureSwap: FutureSwap = {
        address: withdrawAddress,
        amount: `${withdrawAmount.toFixed(8)}@TSLA`
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \': Amount out of range\', code: -3, method: withdrawfutureswap')
    }

    // withdraw -1 amount
    {
      const withdrawAmount = -1
      const withdrawAddress = await testing.generateAddress()
      const withdrawFutureSwap: FutureSwap = {
        address: withdrawAddress,
        amount: `${withdrawAmount.toFixed(8)}@TSLA`
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \': Amount out of range\', code: -3, method: withdrawfutureswap')
    }

    // withdraw 0.1 satoshi
    {
      const withdrawAmount = 0.000000001
      const withdrawAddress = await testing.generateAddress()
      const withdrawFutureSwap: FutureSwap = {
        address: withdrawAddress,
        amount: `${withdrawAmount.toFixed(8)}@TSLA`
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \': Amount out of range\', code: -3, method: withdrawfutureswap')
    }

    // withdraw after setting ${idTSLA}/dfip2203 to false
    {
      const idTSLA = await testing.token.getTokenId('TSLA')
      await testing.rpc.masternode.setGov({ [attributeKey]: { [`v0/token/${idTSLA}/dfip2203`]: 'false' } })

      const withdrawAmount = swapAmount
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: `${withdrawAmount.toFixed(8)}@TSLA`
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'DFIP2203Tx: DFIP2203 currently disabled for token 2 (code 16)\', code: -26, method: withdrawfutureswap')

      await testing.rpc.masternode.setGov({ [attributeKey]: { [`v0/token/${idTSLA}/dfip2203`]: 'true' } })
    }

    // withdraw after setting the dfip2203/active to false
    {
      await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'false' } })

      const withdrawAmount = swapAmount
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: `${withdrawAmount.toFixed(8)}@TSLA`
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'DFIP2203Tx: DFIP2203 not currently active (code 16)\', code: -26, method: withdrawfutureswap')

      await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'true' } })
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    expect(currentBlock).toBeLessThan(nextSettleBlock)
  })

  it('Should not withdrawFutureSwap invalid futureswap dusd to dtoken', async () => {
    const swapAmount = 1
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@DUSD` })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@DUSD`,
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // withdraw more than the future swap amount
    {
      const withdrawAmount = swapAmount + 0.00000001
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: `${withdrawAmount.toFixed(8)}@DUSD`,
        destination: 'TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 1.00000000 is less than 1.00000001\', code: -32600, method: withdrawfutureswap')
    }

    // Withdraw fail - without valid destination
    {
      const withdrawAmount = 0.5
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: `${withdrawAmount.toFixed(8)}@DUSD`
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nCould not get destination loan token 0. Set valid destination.\', code: -32600, method: withdrawfutureswap')
    }

    // Withdraw fail - try to withdraw from unavailable futureswap
    {
      const withdrawAmount = 0.5
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: `${withdrawAmount.toFixed(8)}@TSLA`
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 0.00000000 is less than 0.50000000\', code: -32600, method: withdrawfutureswap')
    }

    // Withdraw fail - Invalid Defi token: INVALID
    {
      const withdrawAmount = 0.5
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: `${withdrawAmount.toFixed(8)}@INVALID`,
        destination: 'TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \': Invalid Defi token: INVALID\', code: 0, method: withdrawfutureswap')
    }

    // withdraw from arbitrary address
    {
      const withdrawAmount = swapAmount
      const withdrawAddress = await testing.generateAddress()
      const withdrawFutureSwap: FutureSwap = {
        address: withdrawAddress,
        amount: `${withdrawAmount.toFixed(8)}@DUSD`,
        destination: 'TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 0.00000000 is less than 1.00000000\', code: -32600, method: withdrawfutureswap')
    }

    // withdraw from arbitrary utxo
    {
      const withdrawAmount = swapAmount
      const utxoAddress = await testing.generateAddress()
      const utxo = await testing.container.fundAddress(utxoAddress, 50)
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: `${withdrawAmount.toFixed(8)}@DUSD`,
        destination: 'TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap, [utxo])
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nTransaction must have at least one input from owner\', code: -32600, method: withdrawfutureswap')
    }

    // withdraw 0 amount
    {
      const withdrawAmount = 0
      const withdrawAddress = await testing.generateAddress()
      const withdrawFutureSwap: FutureSwap = {
        address: withdrawAddress,
        amount: `${withdrawAmount.toFixed(8)}@DUSD`,
        destination: 'TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \': Amount out of range\', code: -3, method: withdrawfutureswap')
    }

    // withdraw -1 amount
    {
      const withdrawAmount = -1
      const withdrawAddress = await testing.generateAddress()
      const withdrawFutureSwap: FutureSwap = {
        address: withdrawAddress,
        amount: `${withdrawAmount.toFixed(8)}@DUSD`,
        destination: 'TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \': Amount out of range\', code: -3, method: withdrawfutureswap')
    }

    // withdraw 0.1 satoshi
    {
      const withdrawAmount = 0.000000001
      const withdrawAddress = await testing.generateAddress()
      const withdrawFutureSwap: FutureSwap = {
        address: withdrawAddress,
        amount: `${withdrawAmount.toFixed(8)}@DUSD`,
        destination: 'TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \': Amount out of range\', code: -3, method: withdrawfutureswap')
    }

    // withdraw after setting ${idTSLA}/dfip2203 to false
    {
      const idTSLA = await testing.token.getTokenId('TSLA')
      await testing.rpc.masternode.setGov({ [attributeKey]: { [`v0/token/${idTSLA}/dfip2203`]: 'false' } })

      const withdrawAmount = swapAmount
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: `${withdrawAmount.toFixed(8)}@DUSD`,
        destination: 'TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'DFIP2203Tx: DFIP2203 currently disabled for token 2 (code 16)\', code: -26, method: withdrawfutureswap')

      await testing.rpc.masternode.setGov({ [attributeKey]: { [`v0/token/${idTSLA}/dfip2203`]: 'true' } })
    }

    // withdraw after setting the dfip2203/active to false
    {
      await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'false' } })

      const withdrawAmount = swapAmount
      const withdrawFutureSwap: FutureSwap = {
        address: tslaAddress,
        amount: `${withdrawAmount.toFixed(8)}@DUSD`,
        destination: 'TSLA'
      }
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'DFIP2203Tx: DFIP2203 not currently active (code 16)\', code: -26, method: withdrawfutureswap')

      await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'true' } })
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    expect(currentBlock).toBeLessThan(nextSettleBlock)
  })

  it('Should not withdrawFutureSwap futureswap dtoken to dusd - at/after the settle block', async () => {
    const swapAmount = 1
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@TSLA`
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // move to next settle block
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    // check the future swap at the settle block
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)
    }

    const withdrawAmount = swapAmount / 2
    const withdrawFutureSwap: FutureSwap = {
      address: tslaAddress,
      amount: `${withdrawAmount.toFixed(8)}@TSLA`
    }

    // withdraw at the settle block
    {
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 0.00000000 is less than 0.50000000\', code: -32600, method: withdrawfutureswap')
    }
    {
      const result = testing.rpc.account.withdrawFutureSwap(fswap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 0.00000000 is less than 1.00000000\', code: -32600, method: withdrawfutureswap')
    }

    await testing.generate(1)

    // check the future swap after the settle block
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)
    }

    // withdraw after settle block
    {
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 0.00000000 is less than 0.50000000\', code: -32600, method: withdrawfutureswap')
    }
  })

  it('Should not withdrawFutureSwap futureswap dusd to dtoken - at/after the settle block', async () => {
    const swapAmount = 1
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@DUSD` })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@DUSD`,
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // move to next settle block
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    // check the future swap at the settle block
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)
    }

    const withdrawAmount = swapAmount / 2
    const withdrawFutureSwap: FutureSwap = {
      address: tslaAddress,
      amount: `${withdrawAmount.toFixed(8)}@DUSD`,
      destination: 'TSLA'
    }

    // withdraw at the settle block
    {
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 0.00000000 is less than 0.50000000\', code: -32600, method: withdrawfutureswap')
    }
    {
      const result = testing.rpc.account.withdrawFutureSwap(fswap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 0.00000000 is less than 1.00000000\', code: -32600, method: withdrawfutureswap')
    }

    await testing.generate(1)

    // check the future swap after the settle block
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)
    }

    // withdraw after settle block
    {
      const result = testing.rpc.account.withdrawFutureSwap(withdrawFutureSwap)
      await expect(result).rejects.toThrow(RpcApiError)
      await expect(result).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\namount 0.00000000 is less than 0.50000000\', code: -32600, method: withdrawfutureswap')
    }
  })
})
