import { Network, StartedNetwork } from 'testcontainers'
import { NativeChainContainer, StartedNativeChainContainer } from '../../../src'

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

describe('nativechain testnet: override docker image', () => {
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
  let container: NativeChainContainer
  let startedContainer: StartedNativeChainContainer
  let startedNetwork: StartedNetwork

  beforeEach(async () => {
    startedNetwork = await new Network().start()
    container = await new NativeChainContainer()
      .withNetworkMode((startedNetwork).getName())
      .withBlockchainNetwork('regtest')
      .withStartupTimeout(60_000)
  })

  afterEach(async () => {
    await startedContainer.stop()
    await startedNetwork.stop()
  })

  it('should return custom container name', async () => {
    const containerName = 'fluent-name'
    startedContainer = await container.withName(containerName).start()
    const name = startedContainer.getName()
    expect(name).toStrictEqual(`/${containerName}`)
  })

  it('should set rpcUser', async () => {
    const rpcUserStr = 'testRpcUser'
    startedContainer = await container.withRpcUser(rpcUserStr).start()
    expect(startedContainer.rpcUser).toStrictEqual(rpcUserStr)
  })

  it('should set rpcPassword', async () => {
    const rpcUserPwd = 'testRpcPassword'
    startedContainer = await container.withRpcPassword(rpcUserPwd).start()
    expect(startedContainer.rpcPassword).toStrictEqual(rpcUserPwd)
  })
})

describe('nativechain static functions', () => {
  it('should return image', () => {
    expect(typeof NativeChainContainer.image).toStrictEqual('string')
  })
})
