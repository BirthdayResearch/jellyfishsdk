import { MasterNodeRegTestContainer } from '../../../src'

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.generate(4)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should wait for block', async () => {
    const count = await container.getBlockCount()
    expect(count).toBeGreaterThan(3)
  })
})
