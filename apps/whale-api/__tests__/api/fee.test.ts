import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '@defichain/whale-api-client'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

beforeEach(async () => {
  await container.waitForWalletBalanceGTE(15)
})

describe('estimate', () => {
  it('should be fixed fee of 0.00005000 when there are no transactions', async () => {
    const feeRate = await client.fee.estimate(10)
    expect(feeRate).toStrictEqual(0.00005000)
  })
})
