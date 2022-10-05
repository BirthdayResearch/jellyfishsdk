import { Network } from 'testcontainers'
import { NativeChainContainer, StartedNativeChainContainer } from '../../src/containers/Hydra/NativeChainContainer'

describe('container error handling', () => {
  let container: StartedNativeChainContainer

  beforeAll(async () => {
    const startedNetwork = await new Network().start()
    container = await new NativeChainContainer()
      .withNetworkMode((startedNetwork).getName())
      .withBlockchainNetwork('testnet')
      .withStartupTimeout(60_000)
      .start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should be able to getmininginfo and chain should be test', async () => {
    const { chain } = await container.getMiningInfo()
    expect(chain).toStrictEqual('test')
  })
})
