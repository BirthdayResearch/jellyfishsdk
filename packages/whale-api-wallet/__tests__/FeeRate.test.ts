import { WhaleFeeRateProvider } from '../src/FeeRate'
import { WhaleApiTestClient } from '../testing/WhaleApiTestClient'

describe('WhaleFeeRateProvider', () => {
  let whaleApiClient: WhaleApiTestClient
  let provider: WhaleFeeRateProvider
  afterEach(() => {
    whaleApiClient.clearMockReturnVal()
  })

  beforeAll(() => {
    whaleApiClient = new WhaleApiTestClient()
    provider = new WhaleFeeRateProvider(whaleApiClient)
  })

  it('should estimate', async () => {
    whaleApiClient.setMockReturnVal('fee.estimate', 100)
    const data = await provider.estimate()
    expect(data.toString()).toStrictEqual(String(100).toString())
  })
})
