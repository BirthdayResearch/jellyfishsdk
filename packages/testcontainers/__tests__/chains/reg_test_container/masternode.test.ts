import { MasterNodeRegTestContainer } from '../../../src'
import waitForExpect from 'wait-for-expect'

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should auto generate coin in master node mode', async () => {
    await waitForExpect(async () => {
      const info = await container.getMintingInfo()
      expect(info.blocks).toBeGreaterThan(3)
    })
  })
})
