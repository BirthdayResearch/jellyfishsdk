import { SmartBuffer } from 'smart-buffer'
import { CBlock, Block } from '../../src/block'
import { BlockHeader } from '../../src/blockHeader'
import BigNumber from 'bignumber.js'
import { OP_CODES, OP_PUSHDATA, TransactionSegWit } from '@defichain/jellyfish-transaction'

/**
 * This test compose and de-compose block 1155163 from mainnet.
 * This block contains two transactions:
 * - a coinbase transaction
 * - a poolSwap transaction
 */
describe('block', () => {
  const data = '000000206675daeb4511b2eaf8681d0f3bd5be62a5c52a7835c6c56050a4b0885bb2cba1725c569dbbdedc5fa485e2f8c6497e23a0144c3e36e9276fcb3c8853940923b07ded306182d23918da5ddc9ad65e02af6b5ccb44e993c9ed3527697beaa1c857268df995e435eed265a01100000000003900000000000000411f8e16e55310c7dc0f3203868134510552a34e77e140aff85ccef76f410ba2c1033cc3019f16c51c489d7b430d635e4deb1d4cf384c2276d8485a4ad7b3784ca3902040000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff050365a01100ffffffff0322a5cacb020000001976a914715ee439e38a4dec1958a007a6b1c6431740e8be88ac004f5772690000000017a914dd7730517e0e4969b4e43677ff5bee682e53420a87000000000000000000266a24aa21a9ed1faddee7739698eb26ef7d2a5d61d978c1de3368a03ff3e6787ced85330dab9a00012000000000000000000000000000000000000000000000000000000000000000000000000004000000000101264b604bddc7623e5aa0097a3582097e85b42d6fa3b8085b9496508c5b0968a1010000001716001488dee44b8c0b47ba4a113f81547f79d8b4154797ffffffff020000000000000000526a4c4f446654787317a914660f90572f48d0e7c6dfceca76a2d2a305592f4c8700807c814a0000000017a9142b065049ed5251fbb179a16f64ca84bd65d3ef4e8702ffffffffffffff7fffffffffffffff7f003e9e0d000000000017a914660f90572f48d0e7c6dfceca76a2d2a305592f4c870002473044022058b1a14269be7ad103f37590d3acbe59c40bf832e64096f8f4e0ae1adb5ebee50220379bb0278f21c41882edcf24ba1c224de1913205d93c253d4b075727f54c4f8c012102c2d10780c52025250de1c213fac287b06291203bbeb658d5886e885a8932c1c700000000'

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

  const secondTransaction: TransactionSegWit = {
    version: 0x4,
    marker: 0x00,
    flag: 0x01,
    vin: [
      {
        txid: 'a168095b8c5096945b08b8a36f2db4857e0982357a09a05a3e62c7dd4b604b26',
        index: 0x1,
        script: {
          stack: [
            new OP_PUSHDATA(Buffer.from('001488dee44b8c0b47ba4a113f81547f79d8b4154797', 'hex'), 'little')
          ]
        },
        sequence: 0xffffffff
      }
    ],
    vout: [
      {
        value: new BigNumber(0),
        script: {
          stack: [
            OP_CODES.OP_RETURN,
            OP_CODES.OP_DEFI_TX_POOL_SWAP({
              fromAmount: new BigNumber(12.5),
              fromScript: {
                stack: [
                  OP_CODES.OP_HASH160,
                  OP_CODES.OP_PUSHDATA_HEX_LE('660f90572f48d0e7c6dfceca76a2d2a305592f4c'),
                  OP_CODES.OP_EQUAL
                ]
              },
              fromTokenId: 0,
              toTokenId: 2,
              toScript: {
                stack: [
                  OP_CODES.OP_HASH160,
                  OP_CODES.OP_PUSHDATA_HEX_LE('2b065049ed5251fbb179a16f64ca84bd65d3ef4e'),
                  OP_CODES.OP_EQUAL
                ]
              },
              maxPrice: new BigNumber('9223372036854775807')
            })
          ]
        },
        tokenId: 0
      },
      {
        value: new BigNumber(0.00892478),
        script: {
          stack: [
            OP_CODES.OP_HASH160,
            new OP_PUSHDATA(Buffer.from('660f90572f48d0e7c6dfceca76a2d2a305592f4c', 'hex'), 'little'),
            OP_CODES.OP_EQUAL
          ]
        },
        tokenId: 0
      }
    ],
    witness: [{
      scripts: [
        {
          hex: '3044022058b1a14269be7ad103f37590d3acbe59c40bf832e64096f8f4e0ae1adb5ebee50220379bb0278f21c41882edcf24ba1c224de1913205d93c253d4b075727f54c4f8c01'
        },
        {
          hex: '02c2d10780c52025250de1c213fac287b06291203bbeb658d5886e885a8932c1c7'
        }
      ]
    }],
    lockTime: 0x00000000
  }

  const block: Block = {
    blockHeader,
    transactions: [
      firstTransaction,
      secondTransaction
    ]
  }

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CBlock(buffer)

      expect(composable.toObject()).toStrictEqual(block)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CBlock(block)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)

      expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
    })
  })
})
