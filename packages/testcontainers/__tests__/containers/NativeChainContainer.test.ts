import { Network } from 'testcontainers'
import { NativeChainContainer, StartedNativeChainContainer } from '../../src/containers/NativeChainContainer'

describe('nativechain mainnet', () => {
  let container: StartedNativeChainContainer

  beforeAll(async () => {
    const startedNetwork = await new Network().start()
    container = await new NativeChainContainer()
      .withNetworkMode((startedNetwork).getName())
      .withBlockchainNetwork('mainnet')
      .withStartupTimeout(60_000)
      .start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should be able to getmininginfo and chain should be main', async () => {
    const { chain } = await container.getMiningInfo()
    expect(chain).toStrictEqual('main')
  })
})

describe('nativechain testnet', () => {
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

describe('native testnet: override docker image', () => {
  let container: StartedNativeChainContainer

  beforeAll(async () => {
    const startedNetwork = await new Network().start()
    container = await new NativeChainContainer('defi/defichain:1.6.4')
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

describe('nativechain regtest', () => {
  let container: StartedNativeChainContainer

  beforeAll(async () => {
    const startedNetwork = await new Network().start()
    container = await new NativeChainContainer()
      .withNetworkMode((startedNetwork).getName())
      .withBlockchainNetwork('regtest')
      .withStartupTimeout(60_000)
      .start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should be able to getmininginfo and chain should be regtest', async () => {
    const { chain } = await container.getMiningInfo()
    expect(chain).toStrictEqual('regtest')
  })
})

describe('nativechain fluency', () => {
  let container: StartedNativeChainContainer

  const containerName = 'fluent-name'

  beforeAll(async () => {
    const startedNetwork = await new Network().start()
    container = await new NativeChainContainer()
      .withNetworkMode((startedNetwork).getName())
      .withBlockchainNetwork('regtest')
      .withName(containerName)
      .withStartupTimeout(60_000)
      .start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should return custom container name', async () => {
    const name = container.getName()
    expect(name).toStrictEqual(`/${containerName}`)
  })
})
