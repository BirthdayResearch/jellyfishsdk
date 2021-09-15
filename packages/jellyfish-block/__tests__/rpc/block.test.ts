import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { CBlock } from '@defichain/jellyfish-block'
import { SmartBuffer } from 'smart-buffer'
import BigNumber from 'bignumber.js'
import { OP_CODES } from '@defichain/jellyfish-transaction'

describe('Block', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getBlock with verbosity=1 and have same data as CBlock composer to object', async () => {
    const blockHash = await testing.misc.waitForBlockHash(1)
    const hexData = await testing.rpc.blockchain.getBlock(blockHash, 0)
    const buffer = SmartBuffer.fromBuffer(Buffer.from(hexData, 'hex'))
    const composable = new CBlock(buffer)

    const block = await testing.rpc.blockchain.getBlock(blockHash, 1)

    const composableObject = composable.toObject()
    expect(composableObject.blockHeader.version).toStrictEqual(block.version)
    expect(composableObject.blockHeader.hashPrevBlock).toStrictEqual(block.previousblockhash)
    expect(composableObject.blockHeader.hashMerkleRoot).toStrictEqual(block.merkleroot)
    expect(composableObject.blockHeader.hashMerkleRoot).toStrictEqual(block.tx[0])
    expect(composableObject.blockHeader.time).toStrictEqual(block.time)
    expect(composableObject.blockHeader.bits).toStrictEqual(parseInt(block.bits, 16))
    expect(composableObject.blockHeader.height).toStrictEqual(new BigNumber(block.height))
    expect(composableObject.blockHeader.stakeModifier).toStrictEqual(block.stakeModifier)
    expect(composableObject.blockHeader.mintedBlocks).toStrictEqual(new BigNumber(block.mintedBlocks))

    expect(composableObject.transactions.length).toStrictEqual(block.tx.length)
  })

  it('should getBlock with verbosity=2 and have same data as CBlock composer to object', async () => {
    const blockHash = await testing.misc.waitForBlockHash(1)
    const hexData = await testing.rpc.blockchain.getBlock(blockHash, 0)
    const buffer = SmartBuffer.fromBuffer(Buffer.from(hexData, 'hex'))
    const composable = new CBlock(buffer)

    const block = await testing.rpc.blockchain.getBlock(blockHash, 2)

    const composableObject = composable.toObject()
    expect(composableObject.blockHeader.version).toStrictEqual(block.version)
    expect(composableObject.blockHeader.hashPrevBlock).toStrictEqual(block.previousblockhash)
    expect(composableObject.blockHeader.hashMerkleRoot).toStrictEqual(block.merkleroot)
    expect(composableObject.blockHeader.time).toStrictEqual(block.time)
    expect(composableObject.blockHeader.bits).toStrictEqual(parseInt(block.bits, 16))
    expect(composableObject.blockHeader.height).toStrictEqual(new BigNumber(block.height))
    expect(composableObject.blockHeader.stakeModifier).toStrictEqual(block.stakeModifier)
    expect(composableObject.blockHeader.mintedBlocks).toStrictEqual(new BigNumber(block.mintedBlocks))

    expect(composableObject.transactions.length).toStrictEqual(1)
    expect(composableObject.transactions.length).toStrictEqual(block.tx.length)

    expect(composableObject.transactions[0].version).toStrictEqual(block.tx[0].version)
    expect(composableObject.transactions[0].lockTime).toStrictEqual(block.tx[0].locktime)

    expect(composableObject.transactions[0].vin.length).toStrictEqual(1)
    expect(composableObject.transactions[0].vin.length).toStrictEqual(block.tx[0].vin.length)
    expect(composableObject.transactions[0].vin[0].sequence).toStrictEqual(block.tx[0].vin[0].sequence)

    expect(composableObject.transactions[0].vout.length).toStrictEqual(3)
    expect(composableObject.transactions[0].vout.length).toStrictEqual(block.tx[0].vout.length)
    expect(composableObject.transactions[0].vout[0].value).toStrictEqual(block.tx[0].vout[0].value)
    expect(composableObject.transactions[0].vout[1].value).toStrictEqual(block.tx[0].vout[1].value)
    expect(composableObject.transactions[0].vout[2].value).toStrictEqual(block.tx[0].vout[2].value)
    expect(composableObject.transactions[0].vout[0].tokenId).toStrictEqual(block.tx[0].vout[0].tokenId)
    expect(composableObject.transactions[0].vout[1].tokenId).toStrictEqual(block.tx[0].vout[1].tokenId)
    expect(composableObject.transactions[0].vout[2].tokenId).toStrictEqual(block.tx[0].vout[2].tokenId)

    const sBuff = new SmartBuffer()
    OP_CODES.toBuffer(composableObject.transactions[0].vout[0].script.stack, sBuff)
    const asHex = sBuff.toString('hex').substring(2) // substring(2) to skip buffer length
    expect(asHex).toStrictEqual(block.tx[0].vout[0].scriptPubKey.hex)

    const sBuff1 = new SmartBuffer()
    OP_CODES.toBuffer(composableObject.transactions[0].vout[1].script.stack, sBuff1)
    const asHex1 = sBuff1.toString('hex').substring(2)
    expect(asHex1).toStrictEqual(block.tx[0].vout[1].scriptPubKey.hex)

    const sBuff2 = new SmartBuffer()
    OP_CODES.toBuffer(composableObject.transactions[0].vout[2].script.stack, sBuff2)
    const asHex2 = sBuff2.toString('hex').substring(2)
    expect(asHex2).toStrictEqual(block.tx[0].vout[2].scriptPubKey.hex)
  })
})
