import { RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('BlockchainInfo', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getBlockchainInfo', async () => {
    const info = await client.blockchain.getBlockchainInfo()

    expect(info.chain).toStrictEqual('regtest')
    expect(info.blocks).toStrictEqual(0)
    expect(info.headers).toStrictEqual(0)

    expect(info.bestblockhash.length).toStrictEqual(64)
    expect(info.difficulty).toBeGreaterThan(0)
    expect(info.mediantime).toBeGreaterThan(1550000000)

    expect(info.verificationprogress).toStrictEqual(1)
    expect(info.initialblockdownload).toStrictEqual(true)
    expect(info.chainwork.length).toStrictEqual(64)
    expect(info.size_on_disk).toBeGreaterThan(0)
    expect(info.pruned).toStrictEqual(false)

    expect(info.softforks.amk.type).toStrictEqual('buried')
    expect(info.softforks.amk.active).toStrictEqual(true)
    expect(info.softforks.amk.height).toStrictEqual(0)

    expect(info.softforks.segwit.type).toStrictEqual('buried')
    expect(info.softforks.segwit.active).toStrictEqual(true)
    expect(info.softforks.segwit.height).toStrictEqual(0)
  })
})
