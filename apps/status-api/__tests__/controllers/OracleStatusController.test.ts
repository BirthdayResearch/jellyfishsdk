import { StatusApiTesting } from '../../testing/StatusApiTesting'
import { ApiPagedResponse, WhaleApiClient } from '@defichain/whale-api-client'
import { Oracle, OraclePriceFeed } from '@defichain/whale-api-client/dist/api/Oracles'

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
  it('/oracles/<address> - should get operational as last published < 45 mins ago', async () => {
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

  it('/oracles/<address> - should get outage as last published >= 45 mins ago', async () => {
    jest.spyOn(apiTesting.app.get(WhaleApiClient).oracles, 'getPriceFeed')
      .mockReturnValueOnce(getMockedOraclePriceFeed('df1qcpp3entq53tdyklm5v0lnvqer4verr4puxchq4', 46))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: 'oracles/df1qcpp3entq53tdyklm5v0lnvqer4verr4puxchq4'
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
