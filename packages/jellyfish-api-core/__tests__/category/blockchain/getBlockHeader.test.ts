import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'

describe('BlockHeader', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getBlockHeader with verbosity true and return block with tx as hex', async () => {
    const blockHash = await testing.misc.waitForBlockHash(1)
    const blockHeader = await testing.rpc.blockchain.getBlockHeader(blockHash, true)

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
    const blockHash = await testing.misc.waitForBlockHash(1)
    const hash = await testing.rpc.blockchain.getBlockHeader(blockHash, false)
    expect(typeof hash).toStrictEqual('string')
  })
})
