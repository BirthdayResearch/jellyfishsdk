import { MasterNodeRegTestContainer } from '../../../src'

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()

  beforeAll(async () => {
    await container.start()
    await container.generate(4)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should wait for block', async () => {
    const count = await container.getBlockCount()
    expect(count).toBeGreaterThan(3)
  })

  it('should waitForGenerate', async () => {
    await container.waitForGenerate(100)
    const count = await container.getBlockCount()
    expect(count).toBeGreaterThanOrEqual(100)
  })
})
