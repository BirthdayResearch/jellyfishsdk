import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { FutureSwap } from '@defichain/jellyfish-api-core/dist/category/account'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)

let address: any
let contractAddress: any
// let futureIntervals: any
// let listHistory: any
let symbolDFI: any
let symbolDUSD: any
let symbolTSLA: any
let symbolGOOGL: any
let symbolTWTR: any
let symbolMSFT: any
let symbolBTC: any

let futInterval = 25
let futRewardPercentage = 0.05
let attributeKey = 'ATTRIBUTES'

async function getNextSettleBlock (): Promise<number> {
  const blockCount = await testing.rpc.blockchain.getBlockCount()
  return blockCount + (futInterval - (blockCount % futInterval))
}

async function setup (): Promise<void> {
  futInterval = 25
  futRewardPercentage = 0.05
  attributeKey = 'ATTRIBUTES'

  address = GenesisKeys[0].owner.address

  contractAddress = 'bcrt1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpsqgljc'
  // futureIntervals = 25
  // listHistory = []

  symbolDFI = 'DFI'
  symbolDUSD = 'DUSD'
  symbolTSLA = 'TSLA'
  symbolGOOGL = 'GOOGL'
  symbolTWTR = 'TWTR'
  symbolMSFT = 'MSFT'
  symbolBTC = 'BTC'

  const oracleAddress = await testing.generateAddress()

  const priceFeeds = [
    { currency: 'USD', token: symbolDFI },
    { currency: 'USD', token: symbolTSLA },
    { currency: 'USD', token: symbolGOOGL },
    { currency: 'USD', token: symbolTWTR },
    { currency: 'USD', token: symbolMSFT }
  ]

  const oracleId = await testing.rpc.oracle.appointOracle(oracleAddress, priceFeeds, { weightage: 10 })
  await testing.generate(1)

  const oraclePrices = [
    { currency: 'USD', tokenAmount: '1.05@TSLA' },
    { currency: 'USD', tokenAmount: '1.05@GOOGL' },
    { currency: 'USD', tokenAmount: '1.05@TWTR' },
    { currency: 'USD', tokenAmount: '1.05@MSFT' }
  ]

  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: oraclePrices })
  await testing.generate(10)

  const metadata = {
    symbol: symbolBTC,
    name: symbolBTC,
    isDAT: true,
    collateralAddress: address
  }

  await container.call('createtoken', [metadata])
  await testing.generate(1)

  await testing.rpc.loan.setLoanToken({
    symbol: symbolDUSD,
    name: symbolDUSD,
    fixedIntervalPriceId: 'DUSD/USD',
    mintable: true,
    interest: new BigNumber(0)
  })
  await testing.generate(1)

  await testing.rpc.loan.setLoanToken({
    symbol: symbolTSLA,
    name: symbolTSLA,
    fixedIntervalPriceId: 'TSLA/USD',
    mintable: true,
    interest: new BigNumber(1)
  })
  await testing.generate(1)

  await testing.rpc.loan.setLoanToken({
    symbol: symbolGOOGL,
    name: symbolGOOGL,
    fixedIntervalPriceId: 'GOOGL/USD',
    mintable: true,
    interest: new BigNumber(1)
  })
  await testing.generate(1)

  await testing.rpc.loan.setLoanToken({
    symbol: symbolTWTR,
    name: symbolTWTR,
    fixedIntervalPriceId: 'TWTR/USD',
    mintable: true,
    interest: new BigNumber(1)
  })
  await testing.generate(1)

  await testing.rpc.loan.setLoanToken({
    symbol: symbolMSFT,
    name: symbolMSFT,
    fixedIntervalPriceId: 'MSFT/USD',
    mintable: true,
    interest: new BigNumber(1)
  })
  await testing.generate(1)

  await testing.token.mint({ symbol: symbolDUSD, amount: 100000 })
  await testing.token.mint({ symbol: symbolTSLA, amount: 100000 })
  await testing.token.mint({ symbol: symbolGOOGL, amount: 100000 })
  await testing.token.mint({ symbol: symbolTWTR, amount: 100000 })
  await testing.token.mint({ symbol: symbolMSFT, amount: 100000 })

  await testing.generate(1)
}

async function settingFuturesGovVars (): Promise<void> {
  await testing.generate(150 - await testing.rpc.blockchain.getBlockCount())

  const address = await testing.generateAddress()

  const fswap: FutureSwap = {
    address,
    amount: '1@TWTR'
  }

  {
    const promise = testing.rpc.account.futureSwap(fswap)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\n' +
      'DFIP2203 not currently active\', code: -32600, method: futureswap')
  }

  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'true' } })
  await testing.generate(1)

  {
    const promise = testing.rpc.account.futureSwap(fswap)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\n' +
      'DFIP2203 not currently active\', code: -32600, method: futureswap')
  }

  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'false', 'v0/params/dfip2203/reward_pct': futRewardPercentage.toString(), 'v0/params/dfip2203/block_period': futInterval.toString() } })
  await testing.generate(1)

  {
    const promise = testing.rpc.account.futureSwap(fswap)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\n' +
      'DFIP2203 not currently active\', code: -32600, method: futureswap')
  }

  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'true' } })
  await testing.generate(1)

  {
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES['v0/params/dfip2203/active']).toStrictEqual('true')
    expect(attributes.ATTRIBUTES['v0/params/dfip2203/reward_pct']).toStrictEqual(futRewardPercentage.toString())
    expect(attributes.ATTRIBUTES['v0/params/dfip2203/block_period']).toStrictEqual(futInterval.toString())
  }

  // Disable DUSD = 2
  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/token/2/dfip2203': 'false' } })
  await testing.generate(1)

  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'true' } })
  await testing.generate(1)

  const nextFuturesBlock = await testing.rpc.blockchain.getBlockCount() + futInterval - await testing.rpc.blockchain.getBlockCount() % futInterval
  // expect(nextFuturesBlock).toStrictEqual(await testing.container.call('getfutureswapblock'))
  expect(nextFuturesBlock).toStrictEqual(175)
}

describe('futuresSwap', () => {
  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
    await settingFuturesGovVars()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('Test dToken to DUSD', async () => {
    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/params/dfip2203/active']).toStrictEqual('true')
      expect(attributes.ATTRIBUTES['v0/params/dfip2203/reward_pct']).toStrictEqual(futRewardPercentage.toString())
      expect(attributes.ATTRIBUTES['v0/params/dfip2203/block_period']).toStrictEqual(futInterval.toString())
    }

    const addressMSFT = await testing.generateAddress()
    const addressGOOGL = await testing.generateAddress()
    const addressTSLA = await testing.generateAddress()
    const addressTWTR = await testing.generateAddress()

    await testing.rpc.account.accountToAccount(address, {
      [addressMSFT]: '1@MSFT'
    })
    await testing.generate(1)

    await testing.rpc.account.accountToAccount(address, {
      [addressGOOGL]: '1@GOOGL'
    })
    await testing.generate(1)

    {
      const account = await testing.rpc.account.getAccount(addressGOOGL)
      console.log(account)
    }

    await testing.rpc.account.accountToAccount(address, {
      [addressTSLA]: '1@TSLA'
    })
    await testing.generate(1)

    await testing.rpc.account.accountToAccount(address, {
      [addressTWTR]: '1@TWTR'
    })
    await testing.generate(1)

    {
      const fswap: FutureSwap = {
        address: addressTWTR,
        amount: '1@TWTR'
      }

      await testing.rpc.account.futureSwap(fswap)
      await testing.generate(1)
    }

    {
      const fswap: FutureSwap = {
        address: addressTSLA,
        amount: '1@TSLA'
      }

      await testing.rpc.account.futureSwap(fswap)
      await testing.generate(1)
    }

    {
      const fswap: FutureSwap = {
        address: addressGOOGL,
        amount: '1@GOOGL'
      }

      await testing.rpc.account.futureSwap(fswap)
      await testing.generate(1)
    }

    {
      const fswap: FutureSwap = {
        address: addressMSFT,
        amount: '1@MSFT'
      }

      await testing.rpc.account.futureSwap(fswap)
      await testing.generate(1)
    }

    const pendingFutures = await testing.container.call('listpendingfutureswaps')

    expect(pendingFutures).toStrictEqual(
      [
        {
          owner: addressMSFT,
          source: '1.00000000@MSFT',
          destination: 'DUSD'
        },
        {
          owner: addressGOOGL,
          source: '1.00000000@GOOGL',
          destination: 'DUSD'
        },
        {
          owner: addressTSLA,
          source: '1.00000000@TSLA',
          destination: 'DUSD'
        },
        {
          owner: addressTWTR,
          source: '1.00000000@TWTR',
          destination: 'DUSD'
        }
      ])

    {
      const result = await testing.container.call('getpendingfutureswaps', [addressMSFT])

      expect(result).toStrictEqual({
        owner: addressMSFT,
        values: [{
          source: '1.00000000@MSFT',
          destination: 'DUSD'
        }]
      }
      )
    }

    {
      const result = await testing.container.call('getpendingfutureswaps', [addressGOOGL])

      expect(result).toStrictEqual({
        owner: addressGOOGL,
        values: [{
          source: '1.00000000@GOOGL',
          destination: 'DUSD'
        }]
      }
      )
    }

    {
      const result = await testing.container.call('getpendingfutureswaps', [addressTSLA])

      expect(result).toStrictEqual({
        owner: addressTSLA,
        values: [{
          source: '1.00000000@TSLA',
          destination: 'DUSD'
        }]
      }
      )
    }

    {
      const result = await testing.container.call('getpendingfutureswaps', [addressTWTR])
      expect(result).toStrictEqual({
        owner: addressTWTR,
        values: [{
          source: '1.00000000@TWTR',
          destination: 'DUSD'
        }]
      }
      )
    }

    {
      const account = await testing.rpc.account.getAccount(contractAddress)
      console.log(account)
    }

    const info = await testing.rpc.account.getBurnInfo()
    expect(info.dfip2203).toStrictEqual([])

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual(
        [
          '1.00000000@TSLA',
          '1.00000000@GOOGL',
          '1.00000000@TWTR',
          '1.00000000@MSFT'
        ]
      )
    }

    // const idDUSD = await testing.token.getTokenId('DUSD')
    // const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

    // move to next settle block
    const nextSettleBlock = await getNextSettleBlock()
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    // check future settled
    {
      // calclulate minted TSLA. dtoken goes for a premium.
      const mintedTSLA = new BigNumber((1 / (1 + futRewardPercentage)) * (1 / 2) * 1).dp(8, BigNumber.ROUND_FLOOR) // (1/(1 + reward percentage)) * (DUSDTSLA) value * DUSD swap amount;

      const idDUSD = await testing.token.getTokenId('DUSD')
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

      console.log(mintedTSLA.toString())
      console.log(dusdMintedAfter.toString())
    }

    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      console.log(pendingFutures)

      // And other getPendingFuturesSwap call
    }

    {
      const account = await testing.rpc.account.getAccount(contractAddress)
      console.log(account)
    }

    {
      const account = await testing.rpc.account.getAccount(addressGOOGL)
      console.log(account)
    }
  })

  it('Test DUSD to dToken', async () => {
    const addressTSLA = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(address, {
      [addressTSLA]: '1.05@DUSD'
    })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: addressTSLA,
      amount: '1.05@DUSD',
      destination: 'TSLA'
    }

    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures).toStrictEqual(
        [
          {
            owner: addressTSLA,
            source: '1.05000000@DUSD',
            destination: 'TSLA'
          }
        ])
    }

    const result = await testing.container.call('getpendingfutureswaps', [addressTSLA])
    expect(result).toStrictEqual({
      owner: addressTSLA,
      values: [{
        source: '1.05000000@DUSD',
        destination: 'TSLA'
      }]
    }
    )

    {
      const info = await testing.rpc.account.getBurnInfo()
      expect(info.dfip2203).toStrictEqual([])
    }

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual(['1.05000000@DUSD'])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()
    }

    // let total_tsla: BigNumber

    // {
    //   const idTSLA = await testing.token.getTokenId('TSLA')
    //   const tslaMintedBefore = (await testing.rpc.token.getToken(idTSLA))[idTSLA].minted
    //   total_tsla = tslaMintedBefore
    // }

    const nextSettleBlock = await getNextSettleBlock()
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    {
      const info = await testing.rpc.account.getBurnInfo()
      expect(info.dfip2203).toStrictEqual(['1.05000000@DUSD'])
    }

    // {
    //   const idTSLA = await testing.token.getTokenId('TSLA')
    //   const tslaMintedBefore = (await testing.rpc.token.getToken(idTSLA))[idTSLA].minted
    //   // const new_total_tsla = tslaMintedBefore
    //   // expect(new_total_tsla).toStrictEqual(total_tsla.plus(new BigNumber(1)))
    // }

    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures).toStrictEqual([])
    }

    {
      const account = await testing.rpc.account.getAccount(contractAddress)
      expect(account).toStrictEqual('1.05000000@DUSD')
    }

    {
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual(
        [
          '1.05000000@DUSD'
        ]
      )
    }

    {
      const account = await testing.rpc.account.getAccount(addressTSLA)
      expect(account).toStrictEqual(
        ['1.05000000@DUSD']
      )
    }
  })
})
