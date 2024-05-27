import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BlockHeader } from '../../../../jellyfish-block/src/BlockHeader'
import { CBlock, Block } from '../../../../jellyfish-block/src/Block'
import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_CODES, OP_PUSHDATA, TransactionSegWit } from '@defichain/jellyfish-transaction'

describe('submit block', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  const blockHeader: BlockHeader = {
    version: 536870912,
    hashPrevBlock: 'a1cbb25b88b0a45060c5c635782ac5a562bed53b0f1d68f8eab21145ebda7566',
    hashMerkleRoot: 'b023099453883ccb6f27e9363e4c14a0237e49c6f8e285a45fdcdebb9d565c72',
    time: 1630596477,
    bits: 0x1839d282,
    stakeModifier: 'd2ee35e495f98d2657c8a1ea7b692735edc993e944cb5c6baf025ed69adc5dda',
    height: new BigNumber(1155173),
    mintedBlocks: new BigNumber(57),
    signature: '1f8e16e55310c7dc0f3203868134510552a34e77e140aff85ccef76f410ba2c1033cc3019f16c51c489d7b430d635e4deb1d4cf384c2276d8485a4ad7b3784ca39'
  }

  const firstTransaction: TransactionSegWit = {
    version: 0x4,
    marker: 0x00,
    flag: 0x01,
    vin: [
      {
        txid: '0000000000000000000000000000000000000000000000000000000000000000',
        index: 0xffffffff,
        script: {
          stack: [
            new OP_PUSHDATA(Buffer.from('65a011', 'hex'), 'little'),
            OP_CODES.OP_0
          ]
        },
        sequence: 0xffffffff
      }
    ],
    vout: [
      {
        value: new BigNumber(120.08989986),
        script: {
          stack: [
            OP_CODES.OP_DUP,
            OP_CODES.OP_HASH160,
            new OP_PUSHDATA(Buffer.from('715ee439e38a4dec1958a007a6b1c6431740e8be', 'hex'), 'little'),
            OP_CODES.OP_EQUALVERIFY,
            OP_CODES.OP_CHECKSIG
          ]
        },
        tokenId: 0
      },
      {
        value: new BigNumber(17.69101135),
        script: {
          stack: [
            OP_CODES.OP_HASH160,
            new OP_PUSHDATA(Buffer.from('dd7730517e0e4969b4e43677ff5bee682e53420a', 'hex'), 'little'),
            OP_CODES.OP_EQUAL
          ]
        },
        tokenId: 0
      },
      {
        value: new BigNumber(0),
        script: {
          stack: [
            OP_CODES.OP_RETURN,
            new OP_PUSHDATA(Buffer.from('aa21a9ed1faddee7739698eb26ef7d2a5d61d978c1de3368a03ff3e6787ced85330dab9a', 'hex'), 'little')
          ]
        },
        tokenId: 0
      }
    ],
    witness: [{
      scripts: [
        {
          hex: '0000000000000000000000000000000000000000000000000000000000000000'
        }
      ]
    }],
    lockTime: 0x00000000
  }

  const block: Block = {
    blockHeader,
    transactions: [
      firstTransaction
    ]
  }

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should submit a block', async () => {
    const composable = new CBlock(block)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)
    const hexdata = buffer.toBuffer().toString('hex')
    const promise = client.mining.submitBlock(hexdata)
    await expect(promise).resolves.not.toThrow()
  })

  it('should submit a block with different version', async () => {
    const v2Block = {
      ...block,
      blockHeader: {
        ...block.blockHeader,
        version: 2
      }
    }
    const composable = new CBlock(v2Block)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)
    const hexdata = buffer.toBuffer().toString('hex')
    const promise = client.mining.submitBlock(hexdata)
    await expect(promise).resolves.not.toThrow()
  })

  it('should throw an error if the block is not valid', async () => {
    const promise = client.mining.submitBlock('block')
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -22,
        message: 'Block decode failed',
        method: 'submitblock'
      }
    })
  })
})
