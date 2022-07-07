import { StatusApiTesting } from '../../testing/StatusApiTesting'
import { ApiPagedResponse, WhaleApiClient } from '@defichain/whale-api-client'
import { Block } from '@defichain/whale-api-client/dist/api/blocks'

describe('BlockchainController - Status test', () => {
  const apiTesting = StatusApiTesting.create()
  beforeAll(async () => {
    await apiTesting.start()
  })

  afterAll(async () => {
    await apiTesting.stop()
  })

  it('/blockchain - should get operational', async () => {
    // Set blocktime to be less than 30 minutes
    jest
      .spyOn(apiTesting.app.get(WhaleApiClient).blocks, 'list')
      .mockReturnValueOnce(getBlockResponseWithPresetTime(25))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/blockchain'
    })

    expect(res.statusCode).toStrictEqual(200)
    expect(res.json()).toStrictEqual({
      status: 'operational'
    })
  })

  it('/blockchain - should get degraded', async () => {
    // Set blocktime to be 30-45 minutes
    jest
      .spyOn(apiTesting.app.get(WhaleApiClient).blocks, 'list')
      .mockReturnValueOnce(getBlockResponseWithPresetTime(36))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/blockchain'
    })

    expect(res.statusCode).toStrictEqual(200)
    expect(res.json()).toStrictEqual({
      status: 'degraded'
    })
  })

  it('/blockchain - should get outage', async () => {
    // Set blocktime to be greater than 45 minutes
    jest
      .spyOn(apiTesting.app.get(WhaleApiClient).blocks, 'list')
      .mockReturnValueOnce(getBlockResponseWithPresetTime(46))

    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/blockchain'
    })

    expect(res.statusCode).toStrictEqual(200)
    expect(res.json()).toStrictEqual({
      status: 'outage'
    })
  })
})

async function getBlockResponseWithPresetTime (minutesDiff: number): Promise<ApiPagedResponse<Block>> {
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
