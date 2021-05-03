import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import { net } from '../../src'

describe('non masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getConnectionCount', async () => {
    const count = await client.net.getConnectionCount()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  it('should getNetworkInfo', async () => {
    const info: net.NetworkInfo = await client.net.getNetworkInfo()
    expect(info.version).toBeGreaterThanOrEqual(0)
    expect(typeof info.subversion).toBe('string')
    expect(info.protocolversion).toBeGreaterThanOrEqual(0)
    expect(typeof info.localservices).toBe('string')
    expect(typeof info.localrelay).toBe('boolean')
    expect(info.timeoffset).toBeGreaterThanOrEqual(0)
    expect(info.connections).toBeGreaterThanOrEqual(0)
    expect(typeof info.networkactive).toBe('boolean')

    const networks = info.networks

    for (let i = 0; i < networks.length; i += 1) {
      const network = networks[i]
      expect(['ipv4', 'ipv6', 'onion']).toContain(network.name)
      expect(typeof network.limited).toBe('boolean')
      expect(typeof network.reachable).toBe('boolean')
      expect(typeof network.proxy).toBe('string')
      expect(typeof network.proxy_randomize_credentials).toBe('boolean')
    }

    expect(info.relayfee).toBeGreaterThanOrEqual(0)
    expect(info.incrementalfee).toBeGreaterThanOrEqual(0)

    const localaddresses = info.localaddresses

    for (let i = 0; i < localaddresses.length; i += 1) {
      const localaddress = localaddresses[i]
      expect(localaddress.address).toBe('string')
      expect(localaddress.port).toBeGreaterThanOrEqual(0)
      expect(localaddress.port).toBeLessThanOrEqual(65535)
      expect(localaddress.score).toBeGreaterThanOrEqual(0)
    }

    expect(typeof info.warnings).toBe('string')
  })
})

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getConnectionCount', async () => {
    const count = await client.net.getConnectionCount()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  it('should getNetworkInfo', async () => {
    const info: net.NetworkInfo = await client.net.getNetworkInfo()
    expect(info.version).toBeGreaterThanOrEqual(0)
    expect(typeof info.subversion).toBe('string')
    expect(info.protocolversion).toBeGreaterThanOrEqual(0)
    expect(typeof info.localservices).toBe('string')
    expect(typeof info.localrelay).toBe('boolean')
    expect(info.timeoffset).toBeGreaterThanOrEqual(0)
    expect(info.connections).toBeGreaterThanOrEqual(0)
    expect(typeof info.networkactive).toBe('boolean')

    const networks = info.networks

    for (let i = 0; i < networks.length; i += 1) {
      const network = networks[i]
      expect(['ipv4', 'ipv6', 'onion']).toContain(network.name)
      expect(typeof network.limited).toBe('boolean')
      expect(typeof network.reachable).toBe('boolean')
      expect(typeof network.proxy).toBe('string')
      expect(typeof network.proxy_randomize_credentials).toBe('boolean')
    }

    expect(info.relayfee).toBeGreaterThanOrEqual(0)
    expect(info.incrementalfee).toBeGreaterThanOrEqual(0)

    const localaddresses = info.localaddresses

    for (let i = 0; i < localaddresses.length; i += 1) {
      const localaddress = localaddresses[i]
      expect(localaddress.address).toBe('string')
      expect(localaddress.port).toBeGreaterThanOrEqual(0)
      expect(localaddress.port).toBeLessThanOrEqual(65535)
      expect(localaddress.score).toBeGreaterThanOrEqual(0)
    }

    expect(typeof info.warnings).toBe('string')
  })
})
