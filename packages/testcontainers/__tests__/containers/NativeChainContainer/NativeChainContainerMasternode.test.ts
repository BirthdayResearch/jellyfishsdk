import { Network } from 'testcontainers'
import { NativeChainContainer, StartedNativeChainContainer } from '../../../src'

describe('masternode', () => {
  let container: StartedNativeChainContainer

  beforeAll(async () => {
    const startedNetwork = await new Network().start()
    container = await new NativeChainContainer()
      .withNetworkMode((startedNetwork).getName())
      .withPreconfiguredRegtestMasternode()
      .withStartupTimeout(180_000)
      .start()
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
