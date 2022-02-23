import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Network on masternode', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should pass toggle network', async () => {
    let info = await testing.rpc.net.getNetworkInfo()
    expect(info.networkactive).toStrictEqual(true)

    let state: boolean = await testing.rpc.net.setNetworkActive(false)
    expect(state).toStrictEqual(false)

    info = await testing.rpc.net.getNetworkInfo()
    expect(info.networkactive).toStrictEqual(false)

    state = await testing.rpc.net.setNetworkActive(true)
    expect(state).toStrictEqual(true)

    info = await testing.rpc.net.getNetworkInfo()
    expect(info.networkactive).toStrictEqual(true)
  })
})

describe('Network without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should pass toggle network', async () => {
    let info = await client.net.getNetworkInfo()
    expect(info.networkactive).toStrictEqual(true)

    let state: boolean = await client.net.setNetworkActive(false)
    expect(state).toStrictEqual(false)

    info = await client.net.getNetworkInfo()
    expect(info.networkactive).toStrictEqual(false)

    state = await client.net.setNetworkActive(true)
    expect(state).toStrictEqual(true)

    info = await client.net.getNetworkInfo()
    expect(info.networkactive).toStrictEqual(true)
  })
})
