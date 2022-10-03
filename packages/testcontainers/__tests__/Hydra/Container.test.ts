import { NativeChainContainer, StartedNativeChainContainer } from '../../src/containers/Hydra/NativeChainContainer'

describe('container error handling', () => {
  let container: StartedNativeChainContainer

  beforeAll(async () => {
    container = await new NativeChainContainer().start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should be able to getmininginfo and chain should be test', async () => {
    const { chain } = await container.getMiningInfo()
    expect(chain).toStrictEqual('test')
  })
})
