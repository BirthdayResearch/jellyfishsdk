import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import BigNumber from 'bignumber.js'
import { FutureSwap } from '@defichain/jellyfish-api-core/dist/category/account'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient
let testing: Testing
let colAddr: string
let fromAddr: string
let fromAddr1: string
const attributeKey = 'ATTRIBUTES'

async function setup (): Promise<void> {
  colAddr = await testing.generateAddress()
  await testing.token.dfi({ address: colAddr, amount: 300000 })
  await testing.token.create({ symbol: 'BTC', collateralAddress: colAddr })
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

  await testing.rpc.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(0.5),
    fixedIntervalPriceId: 'BTC/USD'
  })

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
  const vaultId = await testing.rpc.vault.createVault({
    ownerAddress: vaultAddr,
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.vault.depositToVault({
    vaultId: vaultId, from: colAddr, amount: '100000@DFI'
  })
  await testing.generate(1)

  // wait till the price valid.
  await testing.container.waitForPriceValid('TSLA/USD')
  await testing.container.waitForPriceValid('DUSD/USD')

  // take multiple loans
  await testing.rpc.loan.takeLoan({
    vaultId: vaultId,
    to: colAddr,
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

async function swap (
  addr: string, amt: number, fromToken: string, toToken?: string
): Promise<void> {
  await testing.rpc.account.accountToAccount(colAddr, { [addr]: `${amt}@${fromToken}` })
  await testing.generate(1)

  const fswap: FutureSwap = {
    address: addr,
    amount: `${amt}@${fromToken}`
  }
  if (toToken !== undefined) {
    fswap.destination = toToken
  }
  await testing.rpc.account.futureSwap(fswap)
  await testing.generate(1)
}

async function withdraw (
  addr: string, amt: number, fromToken: string, toToken?: string
): Promise<void> {
  const fswap: FutureSwap = {
    address: addr,
    amount: `${amt}@${fromToken}`
  }
  if (toToken !== undefined) {
    fswap.destination = toToken
  }
  await testing.rpc.account.withdrawFutureSwap(fswap)
  await testing.generate(1)
}

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)
  testing = Testing.create(container)

  await testing.container.start()
  await testing.container.waitForWalletCoinbaseMaturity()
  await service.start()

  await setup()

  const current = await testing.container.getBlockCount()
  const next = await testing.container.call('getfutureswapblock')
  await testing.generate(next - current)

  {
    fromAddr = await testing.generateAddress()
    await swap(fromAddr, 1.92, 'TSLA')
    await swap(fromAddr, 2.3576, 'TSLA')
    await swap(fromAddr, 3.487004, 'DUSD', 'TSLA')
    await swap(fromAddr, 5.67751, 'DUSD', 'TSLA')
    await swap(fromAddr, 0.8, 'TSLA')

    await withdraw(fromAddr, 0.0005, 'DUSD', 'TSLA')
    await withdraw(fromAddr, 4.444, 'TSLA')
  }

  {
    fromAddr1 = await testing.generateAddress()
    await swap(fromAddr1, 5.78, 'TSLA')
    await swap(fromAddr1, 24.000256, 'DUSD', 'TSLA')

    await withdraw(fromAddr1, 24.000256, 'DUSD', 'TSLA')
    await withdraw(fromAddr1, 5.78, 'TSLA')
  }

  const height = await testing.container.getBlockCount()
  await testing.generate(1)
  await service.waitForIndexedHeight(height)
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await testing.container.stop()
  }
})

it('should listFutureSwap', async () => {
  const list = await client.address.listFutureSwap(fromAddr, 30)

  {
    const first = await client.address.listFutureSwap(fromAddr, 3)
    expect(first.length).toStrictEqual(3)
    expect(first.hasNext).toStrictEqual(true)
    expect(first[0].id).toStrictEqual(list[0].id)
    expect(first[1].id).toStrictEqual(list[1].id)
    expect(first[2].id).toStrictEqual(list[2].id)

    const next = await client.address.listFutureSwap(fromAddr, 3, first.nextToken)
    expect(next.length).toStrictEqual(3)
    expect(next.hasNext).toStrictEqual(true)
    expect(next[0].id).toStrictEqual(list[3].id)
    expect(next[1].id).toStrictEqual(list[4].id)
    expect(next[2].id).toStrictEqual(list[5].id)

    const last = await client.address.listFutureSwap(fromAddr, 3, next.nextToken)
    expect(last.length).toStrictEqual(1)
    expect(last.hasNext).toStrictEqual(false)
    expect(last[0].id).toStrictEqual(list[6].id)
  }

  {
    const res = await client.address.listFutureSwap(fromAddr1, 30)
    expect(res.length).toStrictEqual(4)
    expect(res.hasNext).toStrictEqual(false)
  }
})

it('should get empty as non-existent', async () => {
  const addr = await testing.generateAddress()
  const empty = await client.address.listFutureSwap(addr, 30)
  expect(empty.length).toStrictEqual(0)
})
