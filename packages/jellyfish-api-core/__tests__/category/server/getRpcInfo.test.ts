import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('Server on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getRpcInfo', async () => {
    await waitForExpect(async () => {
      const info = await client.server.getRpcInfo()
      expect(info.active_commands.length).toBeGreaterThan(0)
    })

    // const info = await client.mining.getMiningInfo()
    // const mn1 = info.masternodes[0]
    //
    // expect(info.blocks).toBeGreaterThan(0)
    //
    // expect(info.currentblockweight).toBeGreaterThan(0)
    // expect(info.currentblocktx).toStrictEqual(0)
    //
    // expect(info.difficulty).toBeDefined()
    // expect(info.isoperator).toStrictEqual(true)
    //
    // expect(mn1.masternodeid).toBeDefined()
    // expect(mn1.masternodeoperator).toBeDefined()
    // expect(mn1.masternodestate).toStrictEqual('ENABLED')
    // expect(mn1.generate).toStrictEqual(true)
    // expect(mn1.mintedblocks).toStrictEqual(0)
    // expect(mn1.lastblockcreationattempt).not.toStrictEqual('0')
    //
    // expect(info.networkhashps).toBeGreaterThan(0)
    // expect(info.pooledtx).toStrictEqual(0)
    // expect(info.chain).toStrictEqual('regtest')
    // expect(info.warnings).toStrictEqual('')
  })
})

describe('Server not on masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getRpcInfo', async () => {
    await waitForExpect(async () => {
      const info = await client.server.getRpcInfo()
      expect(info.active_commands.length).toBeGreaterThan(0)
    })

    // const info = await client.mining.getMiningInfo()
    // const mn1 = info.masternodes[0]
    //
    // expect(info.blocks).toBeGreaterThan(0)
    //
    // expect(info.currentblockweight).toBeGreaterThan(0)
    // expect(info.currentblocktx).toStrictEqual(0)
    //
    // expect(info.difficulty).toBeDefined()
    // expect(info.isoperator).toStrictEqual(true)
    //
    // expect(mn1.masternodeid).toBeDefined()
    // expect(mn1.masternodeoperator).toBeDefined()
    // expect(mn1.masternodestate).toStrictEqual('ENABLED')
    // expect(mn1.generate).toStrictEqual(true)
    // expect(mn1.mintedblocks).toStrictEqual(0)
    // expect(mn1.lastblockcreationattempt).not.toStrictEqual('0')
    //
    // expect(info.networkhashps).toBeGreaterThan(0)
    // expect(info.pooledtx).toStrictEqual(0)
    // expect(info.chain).toStrictEqual('regtest')
    // expect(info.warnings).toStrictEqual('')
  })
})
