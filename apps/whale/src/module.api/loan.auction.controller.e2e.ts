import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '@src/e2e.module'
import BigNumber from 'bignumber.js'
import { LoanController } from '@src/module.api/loan.controller'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: LoanController

let vaultId1: string

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  const testing = Testing.create(container)
  controller = app.get(LoanController)

  const collateralAddress = await testing.generateAddress()
  await testing.token.dfi({
    address: collateralAddress,
    amount: 300000
  })
  await testing.token.create({
    symbol: 'BTC',
    collateralAddress
  })
  await testing.generate(1)
  await testing.token.mint({
    symbol: 'BTC',
    amount: 11
  })
  await testing.generate(1)

  // Loan scheme
  await testing.container.call('createloanscheme', [100, 1, 'default'])
  await testing.generate(1)

  // Price oracle
  const addr = await testing.generateAddress()
  const priceFeeds = [
    {
      token: 'DFI',
      currency: 'USD'
    },
    {
      token: 'BTC',
      currency: 'USD'
    },
    {
      token: 'AAPL',
      currency: 'USD'
    },
    {
      token: 'TSLA',
      currency: 'USD'
    },
    {
      token: 'MSFT',
      currency: 'USD'
    },
    {
      token: 'FB',
      currency: 'USD'
    }
  ]
  const oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
  await testing.generate(1)

  const timestamp = Math.floor(new Date().getTime() / 1000)
  await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '1@DFI',
      currency: 'USD'
    }]
  })
  await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '10000@BTC',
      currency: 'USD'
    }]
  })
  await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2@AAPL',
      currency: 'USD'
    }]
  })
  await testing.generate(1)
  await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2@TSLA',
      currency: 'USD'
    }]
  })
  await testing.generate(1)
  await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2@MSFT',
      currency: 'USD'
    }]
  })
  await testing.generate(1)
  await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2@FB',
      currency: 'USD'
    }]
  })
  await testing.generate(1)

  // Collateral tokens
  await testing.rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })
  await testing.rpc.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'BTC/USD'
  })
  await testing.generate(1)

  // Loan token
  await testing.rpc.loan.setLoanToken({
    symbol: 'AAPL',
    fixedIntervalPriceId: 'AAPL/USD'
  })
  await testing.generate(1)
  await testing.token.mint({ symbol: 'AAPL', amount: 10000 })
  await testing.generate(1)
  await testing.rpc.loan.setLoanToken({
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await testing.generate(1)
  await testing.rpc.loan.setLoanToken({
    symbol: 'MSFT',
    fixedIntervalPriceId: 'MSFT/USD'
  })
  await testing.generate(1)
  await testing.rpc.loan.setLoanToken({
    symbol: 'FB',
    fixedIntervalPriceId: 'FB/USD'
  })
  await testing.generate(1)

  // Vault 1
  vaultId1 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
  await testing.generate(1)

  await testing.container.call('deposittovault', [vaultId1, collateralAddress, '10000@DFI'])
  await testing.generate(1)
  await testing.container.call('deposittovault', [vaultId1, collateralAddress, '0.5@BTC'])
  await testing.generate(1)

  await testing.container.call('takeloan', [{
    vaultId: vaultId1,
    amounts: '7500@AAPL'
  }])
  await testing.generate(1)

  // Vault 2
  const vaultId2 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
  await testing.generate(1)

  await testing.container.call('deposittovault', [vaultId2, collateralAddress, '20000@0DFI'])
  await testing.generate(1)
  await testing.container.call('deposittovault', [vaultId2, collateralAddress, '1@BTC'])
  await testing.generate(1)

  await testing.container.call('takeloan', [{
    vaultId: vaultId2,
    amounts: '15000@TSLA'
  }])
  await testing.generate(1)

  // Vault 3
  const vaultId3 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
  await testing.generate(1)

  await testing.container.call('deposittovault', [vaultId3, collateralAddress, '30000@DFI'])
  await testing.generate(1)
  await testing.container.call('deposittovault', [vaultId3, collateralAddress, '1.5@BTC'])
  await testing.generate(1)

  await testing.container.call('takeloan', [{
    vaultId: vaultId3,
    amounts: '22500@MSFT'
  }])
  await testing.generate(1)

  // Vault 4
  const vaultId4 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
  await testing.generate(1)

  await testing.container.call('deposittovault', [vaultId4, collateralAddress, '40000@DFI'])
  await testing.generate(1)
  await testing.container.call('deposittovault', [vaultId4, collateralAddress, '2@BTC'])
  await testing.generate(1)

  await testing.container.call('takeloan', [{
    vaultId: vaultId4,
    amounts: '30000@FB'
  }])
  await testing.generate(1)

  {
    // If there is no liquidation, return an empty array object
    const data = await testing.rpc.loan.listAuctions()
    expect(data).toStrictEqual([])
  }

  {
    const vault1 = await testing.rpc.loan.getVault(vaultId1)
    expect(vault1.state).toStrictEqual('active')

    const vault2 = await testing.rpc.loan.getVault(vaultId2)
    expect(vault2.state).toStrictEqual('active')

    const vault3 = await testing.rpc.loan.getVault(vaultId3)
    expect(vault3.state).toStrictEqual('active')

    const vault4 = await testing.rpc.loan.getVault(vaultId4)
    expect(vault4.state).toStrictEqual('active')
  }

  // Going to liquidate the vaults by price increase of the loan tokens
  await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2.2@AAPL',
      currency: 'USD'
    }]
  })
  await testing.generate(1)
  await testing.container.waitForActivePrice('AAPL/USD', '2.2')
  await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2.2@TSLA',
      currency: 'USD'
    }]
  })
  await testing.container.waitForActivePrice('TSLA/USD', '2.2')
  await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2.2@MSFT',
      currency: 'USD'
    }]
  })
  await testing.generate(1)
  await testing.container.waitForActivePrice('MSFT/USD', '2.2')
  await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2.2@FB',
      currency: 'USD'
    }]
  })
  await testing.generate(1)
  await testing.container.waitForActivePrice('FB/USD', '2.2')
  await testing.generate(1)

  const [auction1, auction2, auction3, auction4] = await testing.rpc.loan.listAuctions()
  {
    const vault1 = await testing.rpc.loan.getVault(auction1.vaultId)
    expect(vault1.state).toStrictEqual('inLiquidation')

    const vault2 = await testing.rpc.loan.getVault(auction2.vaultId)
    expect(vault2.state).toStrictEqual('inLiquidation')

    const vault3 = await testing.rpc.loan.getVault(auction3.vaultId)
    expect(vault3.state).toStrictEqual('inLiquidation')

    const vault4 = await testing.rpc.loan.getVault(auction4.vaultId)
    expect(vault4.state).toStrictEqual('inLiquidation')
  }

  await testing.rpc.account.sendTokensToAddress({}, { [collateralAddress]: ['8000@AAPL'] })
  await testing.generate(1)

  const txid = await testing.container.call('placeauctionbid', [vaultId1, 0, collateralAddress, '8000@AAPL'])
  expect(typeof txid).toStrictEqual('string')
  expect(txid.length).toStrictEqual(64)
  await testing.generate(1)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('list', () => {
  it('should listAuctions', async () => {
    const result = await controller.listAuction({ size: 100 })
    expect(result.data.length).toStrictEqual(4)
    result.data.forEach((e) =>
      expect(e).toStrictEqual({
        batchCount: expect.any(Number),
        batches: expect.any(Object),
        loanScheme: expect.any(Object),
        ownerAddress: expect.any(String),
        state: expect.any(String),
        liquidationHeight: expect.any(Number),
        liquidationPenalty: expect.any(Number),
        vaultId: expect.any(String)
      }
      ))

    result.data.forEach((e) =>
      e.batches.forEach((f) => {
        expect(typeof f.index).toBe('number')
        expect(typeof f.collaterals).toBe('object')
        expect(typeof f.loan).toBe('object')
        expect(typeof f.highestBid === 'object' || f.highestBid === undefined).toBe(true)
      })
    )
  })

  it('should listAuctions with pagination', async () => {
    const first = await controller.listAuction({ size: 2 })
    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual(`${first.data[1].vaultId}${first.data[1].liquidationHeight}`)

    const next = await controller.listAuction({
      size: 2,
      next: first.page?.next
    })
    expect(next.data.length).toStrictEqual(2)
    expect(next.page?.next).toStrictEqual(`${next.data[1].vaultId}${next.data[1].liquidationHeight}`)

    const last = await controller.listAuction({
      size: 2,
      next: next.page?.next
    })
    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toBeUndefined()
  })

  it('should listAuctions with an empty object if size 100 next 51f6233c4403f6ce113bb4e90f83b176587f401081605b8a8bb723ff3b0ab5b6 300 which is out of range', async () => {
    const result = await controller.listAuction({ size: 100, next: '51f6233c4403f6ce113bb4e90f83b176587f401081605b8a8bb723ff3b0ab5b6300' })

    expect(result.data.length).toStrictEqual(0)
    expect(result.page).toBeUndefined()
  })
})
