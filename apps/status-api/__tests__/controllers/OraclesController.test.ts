import { StatusApiTesting } from '../../testing/StatusApiTesting'
import { ApiPagedResponse, WhaleApiClient } from '@defichain/whale-api-client'
import { Oracle, OraclePriceFeed } from '@defichain/whale-api-client/dist/api/Oracles'

const apiTesting = StatusApiTesting.create()

beforeAll(async () => {
  await apiTesting.start()
})

afterAll(async () => {
  await apiTesting.stop()
})

describe('OracleStatusController - Status test', () => {
  it('/oracles?address=<address> - should get operational', async () => {
    jest
      .spyOn(apiTesting.app.get(WhaleApiClient).oracles, 'getOracleByAddress')
      .mockReturnValueOnce(getOracle('df1qm7f2cx8vs9lqn8v43034nvckz6dxxpqezfh6dw'))

    jest
      .spyOn(apiTesting.app.get(WhaleApiClient).oracles, 'getPriceFeed')
      .mockReturnValueOnce(getOraclePriceFeed('df1qm7f2cx8vs9lqn8v43034nvckz6dxxpqezfh6dw', 5))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: 'oracles?address=df1qm7f2cx8vs9lqn8v43034nvckz6dxxpqezfh6dw'
    })
    expect(res.json()).toStrictEqual({
      status: 'operational'
    })
    expect(res.statusCode).toStrictEqual(200)
  })

  it('/oracles?address=<address> -should get outage', async () => {
    jest
      .spyOn(apiTesting.app.get(WhaleApiClient).oracles, 'getOracleByAddress')
      .mockReturnValueOnce(getOracle('df1qcpp3entq53tdyklm5v0lnvqer4verr4puxchq4'))

    jest
      .spyOn(apiTesting.app.get(WhaleApiClient).oracles, 'getPriceFeed')
      .mockReturnValueOnce(getOraclePriceFeed('df1qcpp3entq53tdyklm5v0lnvqer4verr4puxchq4', 46))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: 'oracles?address=df1qcpp3entq53tdyklm5v0lnvqer4verr4puxchq4'
    })
    expect(res.json()).toStrictEqual({
      status: 'outage'
    })
    expect(res.statusCode).toStrictEqual(200)
  })
})

async function getOraclePriceFeed (oracleAddress: string, minutesDiff: number): Promise<ApiPagedResponse<OraclePriceFeed>> {
  const blockMedianTime = Date.now() / 1000 - (minutesDiff * 60)

  return new ApiPagedResponse({
    data: [{
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
        medianTime: blockMedianTime,
        time: 0
      }
    }]
  }, 'GET', `oracles/${oracleAddress}/AAPL-USD/feed`)
}

async function getOracle (oracleAddress: string): Promise<Oracle> {
  return {
    id: '',
    block: {
      hash: '',
      height: 0,
      medianTime: 0,
      time: 0
    },
    ownerAddress: oracleAddress,
    priceFeeds: [{
      token: '',
      currency: ''
    }],
    weightage: 0
  }
}
