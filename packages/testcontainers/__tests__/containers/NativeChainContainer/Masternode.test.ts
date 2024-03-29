import { Network } from 'testcontainers'
import { NativeChainContainer, StartedNativeChainContainer } from '../../../src'

describe('nativechain masternode', () => {
  let container: StartedNativeChainContainer

  beforeAll(async () => {
    const startedNetwork = await new Network().start()
    container = await new NativeChainContainer()
      .withNetworkMode((startedNetwork).getName())
      .withPreconfiguredRegtestMasternode()
      .withStartupTimeout(180_000)
      .start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should generate and wait for block', async () => {
    await container.rpc.generate(4)
    const count = await container.rpc.getBlockCount()
    expect(count).toBeGreaterThan(3)
  })

  it('should waitForGenerate', async () => {
    await container.waitFor.generate(100)
    const count = await container.rpc.getBlockCount()
    expect(count).toBeGreaterThanOrEqual(100)
  })

  it('should getBestBlockHash', async () => {
    await container.waitFor.generate(100)
    const hash = await container.rpc.getBestBlockHash()
    expect(hash.length).toStrictEqual(64)
  })

  it('should waitForBlockHeight', async () => {
    const bc1: number = await container.rpc.getBlockCount()
    await container.waitFor.blockHeight(bc1 + 100)
    const bc2 = await container.rpc.getBlockCount()
    expect(bc2).toStrictEqual(bc1 + 101)
  })
})
