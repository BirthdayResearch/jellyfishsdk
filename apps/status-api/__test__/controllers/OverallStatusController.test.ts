import { StatusApiTesting } from '../../testing/StatusApiTesting'
import { ApiPagedResponse, WhaleApiClient } from '@defichain/whale-api-client'
import { WhaleApiProbeIndicator } from '../../src/modules/WhaleApiModule'
import { HealthIndicatorResult, HealthIndicatorStatus } from '@nestjs/terminus'

describe('AggregateController - Status test', () => {
  const apiTesting = StatusApiTesting.create()
  beforeAll(async () => {
    await apiTesting.start()
  })

  afterAll(async () => {
    await apiTesting.stop()
  })

  it('/overall - should get operational when Ocean and blockchain are up', async () => {
    jest
      .spyOn(apiTesting.app.get(WhaleApiProbeIndicator), 'liveness')
      .mockReturnValueOnce(getWhaleStatus('up'))

    jest
      .spyOn(apiTesting.app.get(WhaleApiClient).blocks, 'list')
      .mockReturnValueOnce(getBlockResponseWithPresetTime(25))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/overall'
    })

    expect(res.statusCode).toStrictEqual(200)
    expect(res.json()).toStrictEqual({
      status: 'operational'
    })
  })

  it('/overall - should get outage when blockchain is down', async () => {
    jest
      .spyOn(apiTesting.app.get(WhaleApiClient).blocks, 'list')
      .mockReturnValueOnce(getBlockResponseWithPresetTime(46))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/overall'
    })

    expect(res.statusCode).toStrictEqual(200)
    expect(res.json()).toStrictEqual({
      status: 'outage'
    })
  })

  it('/overall - should get degraded when blockchain degraded', async () => {
    jest
      .spyOn(apiTesting.app.get(WhaleApiClient).blocks, 'list')
      .mockReturnValueOnce(getBlockResponseWithPresetTime(36))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/overall'
    })

    expect(res.statusCode).toStrictEqual(200)
    expect(res.json()).toStrictEqual({
      status: 'degraded'
    })
  })

  it('/overall - should get outage when Ocean down', async () => {
    jest
      .spyOn(apiTesting.app.get(WhaleApiProbeIndicator), 'liveness')
      .mockReturnValueOnce(getWhaleStatus('down'))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/overall'
    })

    expect(res.statusCode).toStrictEqual(200)
    expect(res.json()).toStrictEqual({
      status: 'outage'
    })
  })
})

async function getWhaleStatus (status: HealthIndicatorStatus): Promise<HealthIndicatorResult> {
  return {
    whale: {
      status
    }
  }
}

async function getBlockResponseWithPresetTime (minutesDiff: number): Promise<ApiPagedResponse<any>> {
  const blockTime = Date.now() / 1000 - (minutesDiff * 60)

  return new ApiPagedResponse({
    data: [{
      time: blockTime,
      id: '',
      hash: '',
      previousHash: '',
      height: 0,
      version: 0,
      medianTime: 0,
      transactionCount: 0,
      difficulty: 0,
      masternode: '',
      minter: '',
      minterBlockCount: 0,
      reward: '',
      stakeModifier: '',
      merkleroot: '',
      size: 0,
      sizeStripped: 0,
      weight: 0
    }]
  }, 'GET', 'blocks')
}
