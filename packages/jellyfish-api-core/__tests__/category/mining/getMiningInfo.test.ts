import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Mining', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getMiningInfo', async () => {
    await container.generate(1)

    const info = await client.mining.getMiningInfo()
    const mn1 = info.masternodes[0]

    expect(info.blocks).toBeGreaterThan(0)

    expect(info.currentblockweight).toBeGreaterThan(0)
    expect(info.currentblocktx).toStrictEqual(0)

    expect(info.difficulty).toBeDefined()
    expect(info.isoperator).toStrictEqual(true)

    expect(mn1.masternodeid).toBeDefined()
    expect(mn1.masternodeoperator).toBeDefined()
    expect(mn1.masternodestate).toStrictEqual('ENABLED')
    expect(mn1.generate).toStrictEqual(true)
    expect(mn1.mintedblocks).toStrictEqual(0)
    expect(mn1.lastblockcreationattempt).not.toStrictEqual('0')

    expect(info.networkhashps).toBeGreaterThan(0)
    expect(info.pooledtx).toStrictEqual(0)
    expect(info.chain).toStrictEqual('regtest')
    expect(info.warnings).toStrictEqual('')
  })
})
