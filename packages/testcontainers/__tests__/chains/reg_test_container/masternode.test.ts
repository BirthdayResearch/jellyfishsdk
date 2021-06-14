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
      const info = await container.getMiningInfo()
      expect(info.blocks).toBeGreaterThan(3)
    })
  })

  it('should wait for block', async () => {
    await container.waitForBlock(4)

    const count = await container.getBlockCount()
    expect(count).toBeGreaterThan(3)
  })
})
