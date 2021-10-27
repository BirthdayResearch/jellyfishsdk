import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient, WhaleApiException } from '../../src'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { LoanMasterNodeRegTestContainer } from '@defichain/testcontainers'

let container: LoanMasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

beforeAll(async () => {
  container = new LoanMasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

  const testing = Testing.create(container)

  const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [
    { token: 'AAPL', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'MSFT', currency: 'USD' },
    { token: 'FB', currency: 'USD' }
  ], 1])
  await testing.generate(1)

  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
    prices: [{
      tokenAmount: '1.5@AAPL',
      currency: 'USD'
    }]
  })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
    prices: [{
      tokenAmount: '2.5@TSLA',
      currency: 'USD'
    }]
  })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
    prices: [{
      tokenAmount: '3.5@MSFT',
      currency: 'USD'
    }]
  })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
    prices: [{
      tokenAmount: '4.5@FB',
      currency: 'USD'
    }]
  })
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'AAPL',
    fixedIntervalPriceId: 'AAPL/USD',
    mintable: false,
    interest: new BigNumber(0.01)
  }])
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD',
    mintable: false,
    interest: new BigNumber(0.02)
  }])
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'MSFT',
    fixedIntervalPriceId: 'MSFT/USD',
    mintable: false,
    interest: new BigNumber(0.03)
  }])
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'FB',
    fixedIntervalPriceId: 'FB/USD',
    mintable: false,
    interest: new BigNumber(0.04)
  }])
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
  it('should listLoanTokens', async () => {
    const result = await client.loan.listLoanToken()
    expect(result.length).toStrictEqual(4)
    expect(result[0]).toStrictEqual({
      tokenId: expect.any(String),
      interest: expect.any(String),
      fixedIntervalPriceId: expect.any(String),
      token: {
        collateralAddress: expect.any(String),
        creation: {
          height: expect.any(Number),
          tx: expect.any(String)
        },
        decimal: 8,
        destruction: {
          height: -1,
          tx: expect.any(String)
        },
        displaySymbol: expect.any(String),
        finalized: false,
        id: expect.any(String),
        isDAT: true,
        isLPS: false,
        limit: '0',
        mintable: false,
        minted: '0',
        name: '',
        symbol: expect.any(String),
        symbolKey: expect.any(String),
        tradeable: true
      }
    })

    expect(result[1].tokenId.length).toStrictEqual(64)
    expect(result[2].tokenId.length).toStrictEqual(64)
    expect(result[3].tokenId.length).toStrictEqual(64)
  })

  it('should listLoanTokens with pagination', async () => {
    const first = await client.loan.listLoanToken(2)

    expect(first.length).toStrictEqual(2)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken?.length).toStrictEqual(64)

    const next = await client.paginate(first)

    expect(next.length).toStrictEqual(2)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken?.length).toStrictEqual(64)

    const last = await client.paginate(next)

    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()
  })
})

describe('get', () => {
  it('should get loan token by symbol', async () => {
    const data = await client.loan.getLoanToken('AAPL')
    expect(data).toStrictEqual({
      tokenId: expect.any(String),
      fixedIntervalPriceId: 'AAPL/USD',
      interest: '0.01',
      token: {
        collateralAddress: expect.any(String),
        creation: {
          height: expect.any(Number),
          tx: expect.any(String)
        },
        decimal: 8,
        destruction: {
          height: -1,
          tx: expect.any(String)
        },
        displaySymbol: 'dAAPL',
        finalized: false,
        id: '1',
        isDAT: true,
        isLPS: false,
        limit: '0',
        mintable: false,
        minted: '0',
        name: '',
        symbol: 'AAPL',
        symbolKey: 'AAPL',
        tradeable: true
      }
    })
  })

  it('should fail due to getting non-existent or malformed loan token id', async () => {
    expect.assertions(4)
    try {
      await client.loan.getLoanToken('999')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find loan token',
        url: '/v0.0/regtest/loans/tokens/999'
      })
    }

    try {
      await client.loan.getLoanToken('$*@')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find loan token',
        url: '/v0.0/regtest/loans/tokens/$*@'
      })
    }
  })
})
