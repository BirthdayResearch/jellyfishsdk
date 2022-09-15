import { StatusApiTesting } from '../../testing/StatusApiTesting'
import { ApiPagedResponse, WhaleApiClient } from '@defichain/whale-api-client'
import { Oracle, OraclePriceFeed } from '@defichain/whale-api-client/dist/api/oracles'
import { PriceOracle, PriceTicker } from '@defichain/whale-api-client/dist/api/prices'

const apiTesting = StatusApiTesting.create()

beforeAll(async () => {
  await apiTesting.start()
  jest.spyOn(apiTesting.app.get(WhaleApiClient).oracles, 'getOracleByAddress')
    .mockReturnValue(getMockedOracle())
})

afterAll(async () => {
  await apiTesting.stop()
})

describe('OracleStatusController - Status test', () => {
  it('/oracles/<address> - should get operational as last published <= 60 mins ago', async () => {
    jest.spyOn(apiTesting.app.get(WhaleApiClient).oracles, 'getPriceFeed')
      .mockReturnValueOnce(getMockedOraclePriceFeed('df1qm7f2cx8vs9lqn8v43034nvckz6dxxpqezfh6dw', 5))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: 'oracles/df1qm7f2cx8vs9lqn8v43034nvckz6dxxpqezfh6dw'
    })
    expect(res.json()).toStrictEqual({
      status: 'operational'
    })
    expect(res.statusCode).toStrictEqual(200)
  })

  it('/oracles/<address> - should get outage as last published > 60 mins ago', async () => {
    jest.spyOn(apiTesting.app.get(WhaleApiClient).oracles, 'getPriceFeed')
      .mockReturnValueOnce(getMockedOraclePriceFeed('df1qcpp3entq53tdyklm5v0lnvqer4verr4puxchq4', 62))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: 'oracles/df1qcpp3entq53tdyklm5v0lnvqer4verr4puxchq4'
    })
    expect(res.json()).toStrictEqual({
      status: 'outage'
    })
    expect(res.statusCode).toStrictEqual(200)
  })

  it('/oracles/<address> - should get outage if no results are returned', async () => {
    jest.spyOn(apiTesting.app.get(WhaleApiClient).oracles, 'getPriceFeed')
      .mockReturnValueOnce(getMockedOraclePriceFeedEmpty('df1qm7f2cx8vs9lqn8v43034nvp0fjsnvie93j'))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: 'oracles/df1qm7f2cx8vs9lqn8v43034nvp0fjsnvie93j'
    })
    expect(res.json()).toStrictEqual({
      status: 'outage'
    })
    expect(res.statusCode).toStrictEqual(200)
  })
})

async function getMockedOraclePriceFeed (oracleAddress: string, minutesDiff: number): Promise<ApiPagedResponse<OraclePriceFeed>> {
  const blockMedianTime = Date.now() / 1000 - (minutesDiff * 60)

  return new ApiPagedResponse({
    data: [{
      block: {
        medianTime: blockMedianTime,
        hash: '',
        height: 0,
        time: 0
      },
      id: '',
      key: '',
      sort: '',
      token: '',
      currency: '',
      oracleId: '',
      txid: '',
      time: 0,
      amount: ''
    }]
  }, 'GET', `oracles/${oracleAddress}/AAPL-USD/feed`)
}

async function getMockedOraclePriceFeedEmpty (oracleAddress: string): Promise<ApiPagedResponse<OraclePriceFeed>> {
  return new ApiPagedResponse({
    data: []
  }, 'GET', `oracles/${oracleAddress}/AAPL-USD/feed`)
}

async function getMockedOracle (): Promise<Oracle> {
  return {
    id: '',
    block: {
      hash: '',
      height: 0,
      medianTime: 0,
      time: 0
    },
    ownerAddress: '',
    priceFeeds: [{
      token: '',
      currency: ''
    }],
    weightage: 0
  }
}

describe('OracleStatusController - Oracle Active Status test', () => {
  it('/oracles/<token>-<currency> - should get operational if 3 or more active', async () => {
    jest.spyOn(apiTesting.app.get(WhaleApiClient).prices, 'getOracles')
      .mockReturnValueOnce(getMockedPriceOracle(3))

    jest.spyOn(apiTesting.app.get(WhaleApiClient).prices, 'get')
      .mockReturnValueOnce(getMockedPriceTicker(3))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: 'oracles/AMZN/USD'
    })
    expect(res.json()).toStrictEqual({
      status: 'operational'
    })
    expect(res.statusCode).toStrictEqual(200)
  })

  it('/oracles/<token>-<currency> - should get outage if less than 3 active', async () => {
    jest.spyOn(apiTesting.app.get(WhaleApiClient).prices, 'getOracles')
      .mockReturnValueOnce(getMockedPriceOracle(3))

    jest.spyOn(apiTesting.app.get(WhaleApiClient).prices, 'get')
      .mockReturnValueOnce(getMockedPriceTicker(2))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: 'oracles/DFI/USD'
    })
    expect(res.json()).toStrictEqual({
      status: 'outage'
    })
    expect(res.statusCode).toStrictEqual(200)
  })

  it('/oracles/<token>-<currency> - should get outage if less than 75% active', async () => {
    jest.spyOn(apiTesting.app.get(WhaleApiClient).prices, 'getOracles')
      .mockReturnValueOnce(getMockedPriceOracle(5))

    jest.spyOn(apiTesting.app.get(WhaleApiClient).prices, 'get')
      .mockReturnValueOnce(getMockedPriceTicker(3))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: 'oracles/GME/USD'
    })
    expect(res.json()).toStrictEqual({
      status: 'outage'
    })
    expect(res.statusCode).toStrictEqual(200)
  })

  it('/oracles/<token>-<currency> - should get data from cache', async () => {
    jest.spyOn(apiTesting.app.get(WhaleApiClient).prices, 'getOracles')
      .mockReturnValueOnce(getMockedPriceOracle(5))

    jest.spyOn(apiTesting.app.get(WhaleApiClient).prices, 'get')
      .mockReturnValueOnce(getMockedPriceTicker(3))

    const res1 = await apiTesting.app.inject({
      method: 'GET',
      url: 'oracles/ETH/USD'
    })
    const result1 = res1.json()

    // These value for the mock will not be used as it will get the results from the cache
    // If these mock values are invoked, the test will fail
    jest.spyOn(apiTesting.app.get(WhaleApiClient).prices, 'getOracles')
      .mockReturnValueOnce(getMockedPriceOracle(5))

    jest.spyOn(apiTesting.app.get(WhaleApiClient).prices, 'get')
      .mockReturnValueOnce(getMockedPriceTicker(5))

    const res2 = await apiTesting.app.inject({
      method: 'GET',
      url: 'oracles/ETH/USD'
    })
    const result2 = res2.json()

    expect(result1).toStrictEqual(result2)
  })

  it('/oracles/<token>-<currency> - should not get data from cache after 5 seconds', async () => {
    jest.spyOn(apiTesting.app.get(WhaleApiClient).prices, 'getOracles')
      .mockReturnValueOnce(getMockedPriceOracle(5))

    jest.spyOn(apiTesting.app.get(WhaleApiClient).prices, 'get')
      .mockReturnValueOnce(getMockedPriceTicker(3))

    const res1 = await apiTesting.app.inject({
      method: 'GET',
      url: 'oracles/ETH/USD'
    })
    const result1 = res1.json()

    // Wait for 5 seconds for cache to be invalidated
    await new Promise((resolve) => setTimeout(resolve, 5000))

    jest.spyOn(apiTesting.app.get(WhaleApiClient).prices, 'getOracles')
      .mockReturnValueOnce(getMockedPriceOracle(5))

    jest.spyOn(apiTesting.app.get(WhaleApiClient).prices, 'get')
      .mockReturnValueOnce(getMockedPriceTicker(5))

    const res2 = await apiTesting.app.inject({
      method: 'GET',
      url: 'oracles/ETH/USD'
    })
    const result2 = res2.json()

    expect(result1).not.toStrictEqual(result2)
  })
})

async function getMockedPriceOracle (numberOfOracles: number): Promise<ApiPagedResponse<PriceOracle>> {
  const data = []

  while (numberOfOracles-- > 0) {
    data.push({
      feed: {
        id: '',
        key: '',
        sort: '',
        token: '',
        currency: '',
        oracleId: '',
        txid: '',
        time: 0,
        amount: '',
        block: {
          hash: '',
          height: 0,
          time: 0,
          medianTime: 0
        }
      },
      key: '',
      oracleId: '',
      token: '',
      id: '',
      block: {
        hash: '',
        height: 0,
        medianTime: 0,
        time: 0
      },
      currency: '',
      weightage: 0
    })
  }
  return new ApiPagedResponse({
    data: data
  }, 'GET', 'getOracles')
}

async function getMockedPriceTicker (active: number): Promise<PriceTicker> {
  return {
    id: '',
    price: {
      id: '',
      key: '',
      sort: '',
      token: '',
      currency: '',
      aggregated: {
        amount: '',
        weightage: 0,
        oracles: {
          active: active,
          total: 0
        }
      },
      block: {
        hash: '',
        height: 0,
        time: 0,
        medianTime: 0
      }
    },
    sort: ''
  }
}
