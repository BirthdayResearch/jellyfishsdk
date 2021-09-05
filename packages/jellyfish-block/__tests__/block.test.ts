import { SmartBuffer } from 'smart-buffer'
import { CBlock, Block } from '../src/block'
import { BlockHeader } from '../src/blockHeader'
import BigNumber from 'bignumber.js'
import { OP_CODES, OP_PUSHDATA, TransactionSegWit, Transaction } from '@defichain/jellyfish-transaction'

describe('block with transaction as TransactionSegWit', () => {
  const data = '000000207b8a4f55907404fb75651bba54ded7b45f3629a128e07a7642ed70fb74db44d754a004227cc77dd273b77735edfd171724d00101810111507d59d96fbd58bc6bf95f2e61ffff7f20bfcf142527f23b7d84dd2cb32efe154b0b65a6989b2d3b3d650023a3af2ed8fd01000000000000000100000000000000411f8587945d6d6a83804f1444d11699ac63ac3410be733a4366accbe59a522f20e31cf6de9ef74ebc2bffdb6cdfa620789abfd19af12f1535e924008ff7b9f318a101040000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff025100ffffffff0300ccfec4010000001976a9148857c8c3ce618fe7ae5f8ee11ecc8ea421a1d82988ac000057a6160000000017a914d33d91b421ec4d8d2af5e94e12ec58ea0009191e87000000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9000120000000000000000000000000000000000000000000000000000000000000000000000000'

  const blockHeader: BlockHeader = {
    version: 536870912,
    hashPrevBlock: 'd744db74fb70ed42767ae028a129365fb4d7de54ba1b6575fb047490554f8a7b',
    hashMerkleRoot: '6bbc58bd6fd9597d501101810101d0241717fded3577b773d27dc77c2204a054',
    time: 1630429177,
    bits: 0x207fffff,
    stakeModifier: 'fdd82eafa32300653d3b2d9b98a6650b4b15fe2eb32cdd847d3bf2272514cfbf',
    height: new BigNumber(1),
    mintedBlocks: new BigNumber(1),
    signature: '1f8587945d6d6a83804f1444d11699ac63ac3410be733a4366accbe59a522f20e31cf6de9ef74ebc2bffdb6cdfa620789abfd19af12f1535e924008ff7b9f318a1'
  }

  const transaction: TransactionSegWit = {
    version: 0x4,
    marker: 0x00,
    flag: 0x01,
    vin: [{
      txid: '0000000000000000000000000000000000000000000000000000000000000000',
      index: 0xffffffff,
      script: {
        stack: [
          OP_CODES.OP_1,
          OP_CODES.OP_0
        ]
      },
      sequence: 0xffffffff
    }],
    vout: [
      {
        value: new BigNumber(76),
        script: {
          stack: [
            OP_CODES.OP_DUP,
            OP_CODES.OP_HASH160,
            new OP_PUSHDATA(Buffer.from('8857c8c3ce618fe7ae5f8ee11ecc8ea421a1d829', 'hex'), 'little'),
            OP_CODES.OP_EQUALVERIFY,
            OP_CODES.OP_CHECKSIG
          ]
        },
        tokenId: 0
      },
      {
        value: new BigNumber(3.8),
        script: {
          stack: [
            OP_CODES.OP_HASH160,
            new OP_PUSHDATA(Buffer.from('d33d91b421ec4d8d2af5e94e12ec58ea0009191e', 'hex'), 'little'),
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
            new OP_PUSHDATA(Buffer.from('aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9', 'hex'), 'little')
          ]
        },
        tokenId: 0
      }
    ],
    witness: [
      {
        scripts: [
          {
            hex: '0000000000000000000000000000000000000000000000000000000000000000'
          }
        ]
      }
    ],
    lockTime: 0x00000000
  }

  const block: Block = {
    blockHeader,
    transactions: [
      transaction
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

describe('block with transaction as Transaction', () => {
  const data = '000000207b8a4f55907404fb75651bba54ded7b45f3629a128e07a7642ed70fb74db44d754a004227cc77dd273b77735edfd171724d00101810111507d59d96fbd58bc6bf95f2e61ffff7f20bfcf142527f23b7d84dd2cb32efe154b0b65a6989b2d3b3d650023a3af2ed8fd01000000000000000100000000000000411f8587945d6d6a83804f1444d11699ac63ac3410be733a4366accbe59a522f20e31cf6de9ef74ebc2bffdb6cdfa620789abfd19af12f1535e924008ff7b9f318a1010400000002fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f0000000000eeffffffef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a0100000000ffffffff02202cb206000000001976a9148280b37df378db99f66f85c95a783a76ac7a6d5988ac009093510d000000001976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac0011000000'

  const blockHeader: BlockHeader = {
    version: 536870912,
    hashPrevBlock: 'd744db74fb70ed42767ae028a129365fb4d7de54ba1b6575fb047490554f8a7b',
    hashMerkleRoot: '6bbc58bd6fd9597d501101810101d0241717fded3577b773d27dc77c2204a054',
    time: 1630429177,
    bits: 0x207fffff,
    stakeModifier: 'fdd82eafa32300653d3b2d9b98a6650b4b15fe2eb32cdd847d3bf2272514cfbf',
    height: new BigNumber(1),
    mintedBlocks: new BigNumber(1),
    signature: '1f8587945d6d6a83804f1444d11699ac63ac3410be733a4366accbe59a522f20e31cf6de9ef74ebc2bffdb6cdfa620789abfd19af12f1535e924008ff7b9f318a1'
  }

  const transaction: Transaction = {
    version: 0x00000004,
    vin: [
      {
        index: 0,
        script: {
          stack: []
        },
        sequence: 4294967278,
        txid: '9f96ade4b41d5433f4eda31e1738ec2b36f6e7d1420d94a6af99801a88f7f7ff'
      },
      {
        index: 1,
        script: {
          stack: []
        },
        sequence: 4294967295,
        txid: '8ac60eb9575db5b2d987e29f301b5b819ea83a5c6579d282d189cc04b8e151ef'
      }
    ],
    vout: [
      {
        value: new BigNumber('1.1234'),
        script: {
          stack: [
            OP_CODES.OP_DUP,
            OP_CODES.OP_HASH160,
            new OP_PUSHDATA(Buffer.from('8280b37df378db99f66f85c95a783a76ac7a6d59', 'hex'), 'little'),
            OP_CODES.OP_EQUALVERIFY,
            OP_CODES.OP_CHECKSIG
          ]
        },
        tokenId: 0x00
      },
      {
        value: new BigNumber('2.2345'),
        script: {
          stack: [
            OP_CODES.OP_DUP,
            OP_CODES.OP_HASH160,
            new OP_PUSHDATA(Buffer.from('3bde42dbee7e4dbe6a21b2d50ce2f0167faa8159', 'hex'), 'little'),
            OP_CODES.OP_EQUALVERIFY,
            OP_CODES.OP_CHECKSIG
          ]
        },
        tokenId: 0x00
      }
    ],
    lockTime: 0x00000011
  }

  const block: Block = {
    blockHeader,
    transactions: [
      transaction
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
