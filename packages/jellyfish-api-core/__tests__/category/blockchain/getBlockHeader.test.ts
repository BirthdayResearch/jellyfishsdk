import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { blockchain } from '../../../src'
import waitForExpect from 'wait-for-expect'

describe('BlockHeader', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  /**
   * Wait for block hash to reach a certain height
   */
  async function waitForBlockHash (height: number): Promise<string> {
    await waitForExpect(async () => {
      const info = await client.blockchain.getBlockchainInfo()
      expect(info.blocks).toBeGreaterThan(height)
    })

    return await client.blockchain.getBlockHash(height)
  }

  it('should getBlockHeader with verbosity true and return block with tx as hex', async () => {
    const blockHash = await waitForBlockHash(1)
    const blockHeader: blockchain.BlockHeader = await client.blockchain.getBlockHeader(blockHash, true)

    expect(blockHeader.hash.length).toStrictEqual(64)

    expect(blockHeader.confirmations).toBeGreaterThanOrEqual(2)
    expect(blockHeader.height).toBeGreaterThanOrEqual(1)

    expect(blockHeader.version).toBeGreaterThanOrEqual(536870912)
    expect(blockHeader.versionHex).toStrictEqual('20000000')
    expect(blockHeader.merkleroot.length).toStrictEqual(64)

    expect(blockHeader.time).toBeGreaterThan(1)
    expect(blockHeader.mediantime).toBeGreaterThan(1)

    expect(blockHeader.bits).toStrictEqual('207fffff')
    expect(blockHeader.difficulty).toBeGreaterThan(0)

    expect(blockHeader.chainwork.length).toStrictEqual(64)
    expect(blockHeader.nTx).toBeGreaterThanOrEqual(1)
    expect(blockHeader.previousblockhash.length).toStrictEqual(64)
    expect(blockHeader.nextblockhash.length).toStrictEqual(64)
  })

  it('should getBlockHeader with verbosity false and return a string that is serialized, hex-encoded data for block header', async () => {
    const blockHash = await waitForBlockHash(1)
    const hash: string = await client.blockchain.getBlockHeader(blockHash, false)
    expect(typeof hash).toStrictEqual('string')
  })
})
