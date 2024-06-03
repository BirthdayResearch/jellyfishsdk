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
    expect(versionInfo).toStrictEqual({
      fullVersion: expect.stringContaining('DeFiChain'),
      name: 'DeFiChain',
      version: expect.any(String),
      numericVersion: expect.any(Number),
      protoVersion: expect.any(Number),
      protoVersionMin: expect.any(Number),
      userAgent: expect.stringContaining('DeFiChain'),
      rpcVersion: expect.any(String),
      rpcVersionMin: expect.any(String),
      spv: {
        btc: {
          version: expect.any(Number),
          min: expect.any(Number),
          userAgent: expect.any(String)
        }
      }
    })
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
    expect(versionInfo).toStrictEqual({
      fullVersion: expect.stringContaining('DeFiChain'),
      name: 'DeFiChain',
      version: expect.any(String),
      numericVersion: expect.any(Number),
      protoVersion: expect.any(Number),
      protoVersionMin: expect.any(Number),
      userAgent: expect.stringContaining('DeFiChain'),
      rpcVersion: expect.any(String),
      rpcVersionMin: expect.any(String),
      spv: {
        btc: {
          version: expect.any(Number),
          min: expect.any(Number),
          userAgent: expect.any(String)
        }
      }
    })
  })
})
