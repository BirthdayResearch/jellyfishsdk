import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { SmartBuffer } from 'smart-buffer'
import { CBlockHeader } from '../../src/blockHeader'
import BigNumber from 'bignumber.js'

describe('BlockHeader', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  /**
   * Wait for block hash to reach a certain height
   */
  async function waitForBlockHash (height: number): Promise<string> {
    await testing.container.waitForBlockHeight(height)
    return await testing.rpc.blockchain.getBlockHash(height)
  }

  it('should getBlockHeader with verbosity=true and have same data as CBlockHeader composer to object', async () => {
    const blockHash = await waitForBlockHash(1)
    const hexData = await testing.rpc.blockchain.getBlockHeader(blockHash, false)
    const buffer = SmartBuffer.fromBuffer(Buffer.from(hexData, 'hex'))
    const composable = new CBlockHeader(buffer)

    const blockHeader = await testing.rpc.blockchain.getBlockHeader(blockHash, true)

    const composableObject = composable.toObject()
    expect(composableObject.version).toStrictEqual(blockHeader.version)
    expect(composableObject.hashPrevBlock).toStrictEqual(blockHeader.previousblockhash)
    expect(composableObject.hashMerkleRoot).toStrictEqual(blockHeader.merkleroot)
    expect(composableObject.time).toStrictEqual(blockHeader.time)
    expect(composableObject.bits).toStrictEqual(parseInt(blockHeader.bits, 16))
    expect(composableObject.height).toStrictEqual(new BigNumber(blockHeader.height))
  })
})
