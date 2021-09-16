import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Block', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getBlock with verbosity 0 and return just a string that is serialized, hex-encoded data for block', async () => {
    const blockHash = await testing.misc.waitForBlockHash(1)
    const hash = await testing.rpc.blockchain.getBlock(blockHash, 0)
    expect(typeof hash).toStrictEqual('string')
  })

  it('should getBlock with verbosity 1 and return block with tx as hex', async () => {
    const blockHash = await testing.misc.waitForBlockHash(1)
    const block = await testing.rpc.blockchain.getBlock(blockHash, 1)

    expect(block.hash.length).toStrictEqual(64)

    expect(block.confirmations).toBeGreaterThanOrEqual(2)
    expect(block.strippedsize).toBeGreaterThanOrEqual(360)

    expect(block.size).toBeGreaterThanOrEqual(396)
    expect(block.weight).toBeGreaterThanOrEqual(1476)
    expect(block.height).toBeGreaterThanOrEqual(1)

    expect(block.masternode.length).toStrictEqual(64)
    expect(block.minter.length).toStrictEqual(34) // legacy address length

    expect(block.mintedBlocks).toBeGreaterThanOrEqual(1)
    expect(block.stakeModifier.length).toStrictEqual(64)
    expect(block.version).toBeGreaterThanOrEqual(536870912)
    expect(block.versionHex).toStrictEqual('20000000')
    expect(block.merkleroot.length).toStrictEqual(64)

    expect(block.tx.length).toBeGreaterThanOrEqual(1)
    expect(block.tx[0].length).toStrictEqual(64)

    expect(block.time).toBeGreaterThan(1)
    expect(block.mediantime).toBeGreaterThan(1)

    expect(block.bits).toStrictEqual('207fffff')
    expect(block.difficulty).toBeGreaterThan(0)

    expect(block.chainwork.length).toStrictEqual(64)
    expect(block.nTx).toBeGreaterThanOrEqual(1)
    expect(block.previousblockhash.length).toStrictEqual(64)
  })

  it('should getBlock with verbosity 2 and return block with tx as RawText', async () => {
    const blockHash = await testing.misc.waitForBlockHash(1)
    const block = await testing.rpc.blockchain.getBlock(blockHash, 2)

    expect(block.tx.length).toBeGreaterThanOrEqual(1)
    expect(block.tx[0].vin[0].coinbase).toStrictEqual('5100')
    expect(block.tx[0].vin[0].sequence).toBeGreaterThanOrEqual(4294967295)

    expect(block.tx[0].vout[0].n).toStrictEqual(0)
    expect(block.tx[0].vout[0].value.toString(10)).toStrictEqual('76')
    expect(block.tx[0].vout[0].value instanceof BigNumber).toBeTruthy()

    expect(block.tx[0].vout[0].scriptPubKey.asm).toStrictEqual('OP_DUP OP_HASH160 8857c8c3ce618fe7ae5f8ee11ecc8ea421a1d829 OP_EQUALVERIFY OP_CHECKSIG')
    expect(block.tx[0].vout[0].scriptPubKey.hex).toStrictEqual('76a9148857c8c3ce618fe7ae5f8ee11ecc8ea421a1d82988ac')
    expect(block.tx[0].vout[0].scriptPubKey.reqSigs).toBeGreaterThanOrEqual(1)
    expect(block.tx[0].vout[0].scriptPubKey.type).toStrictEqual('pubkeyhash')
    expect(block.tx[0].vout[0].scriptPubKey.addresses[0].length).toStrictEqual(34)

    expect(block.tx[0].vout[0].tokenId).toStrictEqual(0)
  })
})
