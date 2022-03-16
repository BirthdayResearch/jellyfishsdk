import { AddressBalanceRepo } from '../src/models/AddressBalance'
import { RichListService } from '../src/modules/RichListModule'
import { RichListApiTesting } from '../testing/RichListApiTesting'

let testing!: RichListApiTesting

describe('RichListApi E2E', () => {
  beforeAll(async () => {
    testing = await RichListApiTesting.create()
    await testing.start()
  })

  afterAll(async () => {
    await testing.stop()
  })

  it.skip('should update rich list after bootstrap', async () => {
    // TODO(chen): fix this is not working for now
    const richListService = await testing.app.get<RichListService>('RICH_LIST_CORE_SERVICE')
    const addrBalanceRepo = await testing.app.get<AddressBalanceRepo>(AddressBalanceRepo)
    await richListService.consumeAddressQueue()
    const richList = await addrBalanceRepo.list({ limit: 100, order: 'ASC', partition: '-1' })
    expect(richList.length).toBeGreaterThan(0)
  })
})
