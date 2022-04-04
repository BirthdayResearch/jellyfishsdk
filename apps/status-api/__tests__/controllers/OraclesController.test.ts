import { StatusApiTesting } from '../../testing/StatusApiTesting'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { Oracle } from '@defichain/whale-api-client/dist/api/Oracles'

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
      .mockReturnValueOnce(getOracle(5))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: 'oracles?address=df1qm7f2cx8vs9lqn8v43034nvckz6dxxpqezfh6dw'
    })
    expect(res.json()).toStrictEqual({
      status: 'operational'
    })
    expect(res.statusCode).toStrictEqual(200)
  })

  it('/status/oracles?address=<address> -should get outage', async () => {
    jest
      .spyOn(apiTesting.app.get(WhaleApiClient).oracles, 'getOracleByAddress')
      .mockReturnValueOnce(getOracle(18))

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

async function getOracle (minutesDiff: number): Promise<Oracle> {
  const blockMedianTime = Date.now() / 1000 - (minutesDiff * 60)

  return {
    id: '',
    block: {
      hash: '',
      height: 0,
      medianTime: blockMedianTime,
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
