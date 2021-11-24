import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'

const container = new MasterNodeRegTestContainer()
const service = new StubService(container)
const client = new StubWhaleApiClient(service)
const testing = Testing.create(container)

let vaultId1: string

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

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
  await testing.token.mint({
    symbol: 'AAPL',
    amount: 10000
  })
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
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('list', () => {
  it('should listAuction with size only', async () => {
    const result = await client.loan.listAuction(20)
    expect(result.length).toStrictEqual(4)
    result.forEach((vault) => {
      expect(vault).toStrictEqual({
        batchCount: expect.any(Number),
        batches: expect.any(Object),
        loanScheme: expect.any(Object),
        ownerAddress: expect.any(String),
        state: expect.any(String),
        liquidationHeight: expect.any(Number),
        liquidationPenalty: expect.any(Number),
        vaultId: expect.any(String)
      })

      if (vaultId1 === vault.vaultId) {
        expect(vault.batches).toStrictEqual([
          {
            collaterals: expect.any(Array),
            highestBid: {
              amount: {
                activePrice: expect.any(Object),
                amount: '8000.00000000',
                displaySymbol: 'dAAPL',
                id: expect.any(String),
                name: expect.any(String),
                symbol: 'AAPL',
                symbolKey: 'AAPL'
              },
              owner: expect.any(String)
            },
            index: 0,
            loan: expect.any(Object)
          },
          {
            collaterals: expect.any(Array),
            index: 1,
            loan: expect.any(Object)
          }
        ])
      }
    })

    result.forEach((e) => {
      e.batches.forEach((f) => {
        expect(typeof f.index).toBe('number')
        expect(typeof f.collaterals).toBe('object')
        expect(typeof f.loan).toBe('object')
        expect(typeof f.highestBid === 'object' || f.highestBid === undefined).toBe(true)
      })
    })
  })

  it('should listAuction with size and pagination', async () => {
    const auctionList = await client.loan.listAuction()
    const first = await client.loan.listAuction(2)

    expect(first.length).toStrictEqual(2)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual(`${first[1].vaultId}${first[1].liquidationHeight}`)

    expect(first[0].vaultId).toStrictEqual(auctionList[0].vaultId)
    expect(first[1].vaultId).toStrictEqual(auctionList[1].vaultId)

    const next = await client.paginate(first)

    expect(next.length).toStrictEqual(2)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual(`${next[1].vaultId}${next[1].liquidationHeight}`)

    expect(next[0].vaultId).toStrictEqual(auctionList[2].vaultId)
    expect(next[1].vaultId).toStrictEqual(auctionList[3].vaultId)

    const last = await client.paginate(next)

    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()
  })
})
