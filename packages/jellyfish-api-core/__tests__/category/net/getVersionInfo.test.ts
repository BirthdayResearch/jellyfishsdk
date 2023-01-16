import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { net } from '../../../src'

describe('Version information without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getVersionInfo', async () => {
    const versionInfo: net.VersionInfo = await client.net.getVersionInfo()
    expect(versionInfo.name).toStrictEqual('DeFiChain')
    expect(typeof versionInfo.version).toStrictEqual('string')
    expect(versionInfo.numericVersion).toBeGreaterThanOrEqual(0)
    expect(typeof versionInfo.userAgent).toStrictEqual('string')
    expect(versionInfo.protoVersion).toBeGreaterThanOrEqual(0)
    expect(versionInfo.protoVersionMin).toBeGreaterThanOrEqual(0)
    expect(typeof versionInfo.rpcVersion).toStrictEqual('string')
    expect(typeof versionInfo.rpcVersionMin).toStrictEqual('string')
    expect(typeof versionInfo.spv.btc.userAgent).toStrictEqual('string')
    expect(versionInfo.spv.btc.version).toBeGreaterThanOrEqual(0)
    expect(versionInfo.spv.btc.min).toBeGreaterThanOrEqual(0)
  })
})

describe('Version information with masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getVersionInfo', async () => {
    const versionInfo: net.VersionInfo = await client.net.getVersionInfo()
    expect(versionInfo.name).toStrictEqual('DeFiChain')
    expect(typeof versionInfo.version).toStrictEqual('string')
    expect(versionInfo.numericVersion).toBeGreaterThanOrEqual(0)
    expect(typeof versionInfo.userAgent).toStrictEqual('string')
    expect(versionInfo.protoVersion).toBeGreaterThanOrEqual(0)
    expect(versionInfo.protoVersionMin).toBeGreaterThanOrEqual(0)
    expect(typeof versionInfo.rpcVersion).toStrictEqual('string')
    expect(typeof versionInfo.rpcVersionMin).toStrictEqual('string')
    expect(typeof versionInfo.spv.btc.userAgent).toStrictEqual('string')
    expect(versionInfo.spv.btc.version).toBeGreaterThanOrEqual(0)
    expect(versionInfo.spv.btc.min).toBeGreaterThanOrEqual(0)
  })
})
