import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import {
  OP_CODES,
  OP_PUSHDATA,
  CTransactionSegWit,
  TransactionSegWit,
  DeFiTransactionConstants,
  CTransaction
} from '../src'

it('should be able to use DeFiTransactionConstants constants to craft Transaction', () => {
  const hex = '04000000000101ef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a0000000000ffffffff0100e1f505000000001600143bde42dbee7e4dbe6a21b2d50ce2f0167faa815900010000000000'
  const data: TransactionSegWit = {
    version: DeFiTransactionConstants.Version,
    marker: DeFiTransactionConstants.WitnessMarker,
    flag: DeFiTransactionConstants.WitnessFlag,
    vin: [
      {
        index: 0,
        script: {
          stack: []
        },
        sequence: 0xffffffff,
        txid: '8ac60eb9575db5b2d987e29f301b5b819ea83a5c6579d282d189cc04b8e151ef'
      }
    ],
    vout: [
      {
        script: {
          stack: [
            OP_CODES.OP_0,
            new OP_PUSHDATA(Buffer.from('3bde42dbee7e4dbe6a21b2d50ce2f0167faa8159', 'hex'), 'little')
          ]
        },
        value: new BigNumber('1'),
        tokenId: 0x00
      }
    ],
    witness: [
      {
        scripts: [
          {
            hex: ''
          }
        ]
      }
    ],
    lockTime: 0x00000000
  }

  const buffer = new SmartBuffer()
  new CTransactionSegWit(data).toBuffer(buffer)
  expect(buffer.toBuffer().toString('hex')).toStrictEqual(hex)
})

it('should be able to parse a TestNet TxId: 68c7902823139c4f5e4e81993e366e3499c8c9a90b4e41dd1fc1290d3735b30d from height: 1077842', function () {
  const hex = '04000000019773a6e3791c528b87562c899a99d0a7ddde0993c6a8ac91bcc051c493abbfc4010000006a47304402203744b91813ccc61c40952606dbf5efae57e9d6bd16842014924c387add6ded8c02205bc4c72f9ec0218d10ba1d004c2c8a8af8bb2eaad952adaf4a379a4781f38703012102c55405cb45a34792189c048b78d259742fb325c5827f6a280cc8c00cbc375419ffffffff0200000000000000005a6a4c5744665478691976a9144cf2a9c08c8e20f1e72a25d08278b4af8d1cced288ac005a5779f8573200001976a9144cf2a9c08c8e20f1e72a25d08278b4af8d1cced288ac8036b6100000000000000897180200000000020f15009c45b301000000001976a9144cf2a9c08c8e20f1e72a25d08278b4af8d1cced288ac0000000000'

  const buffer = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
  const tx = new CTransaction(buffer).toObject()
  expect(tx).toStrictEqual({
    lockTime: 0,
    version: 4,
    vin: [
      {
        index: 1,
        script: {
          stack: [
            OP_CODES.OP_PUSHDATA_HEX_LE('304402203744b91813ccc61c40952606dbf5efae57e9d6bd16842014924c387add6ded8c02205bc4c72f9ec0218d10ba1d004c2c8a8af8bb2eaad952adaf4a379a4781f3870301'),
            OP_CODES.OP_PUSHDATA_HEX_LE('02c55405cb45a34792189c048b78d259742fb325c5827f6a280cc8c00cbc375419')
          ]
        },
        sequence: 4294967295,
        txid: 'c4bfab93c451c0bc91aca8c69309dedda7d0999a892c56878b521c79e3a67397'
      }
    ],
    vout: [
      {
        script: {
          stack: [
            OP_CODES.OP_RETURN,
            OP_CODES.OP_DEFI_TX_COMPOSITE_SWAP({
              poolSwap: {
                fromAmount: new BigNumber('553534.12245338'),
                fromScript: {
                  stack: [
                    OP_CODES.OP_DUP,
                    OP_CODES.OP_HASH160,
                    OP_CODES.OP_PUSHDATA_HEX_LE('4cf2a9c08c8e20f1e72a25d08278b4af8d1cced2'),
                    OP_CODES.OP_EQUALVERIFY,
                    OP_CODES.OP_CHECKSIG
                  ]
                },
                fromTokenId: 0,
                maxPrice: new BigNumber('4278.35165960'),
                toScript: {
                  stack: [
                    OP_CODES.OP_DUP,
                    OP_CODES.OP_HASH160,
                    OP_CODES.OP_PUSHDATA_HEX_LE('4cf2a9c08c8e20f1e72a25d08278b4af8d1cced2'),
                    OP_CODES.OP_EQUALVERIFY,
                    OP_CODES.OP_CHECKSIG
                  ]
                },
                toTokenId: 182
              },
              pools: [
                {
                  id: 15
                },
                {
                  id: 21
                }
              ]
            })
          ]
        },
        tokenId: 0,
        value: new BigNumber('0')
      },
      {
        script: {
          stack: [
            OP_CODES.OP_DUP,
            OP_CODES.OP_HASH160,
            OP_CODES.OP_PUSHDATA_HEX_LE('4cf2a9c08c8e20f1e72a25d08278b4af8d1cced2'),
            OP_CODES.OP_EQUALVERIFY,
            OP_CODES.OP_CHECKSIG
          ]
        },
        tokenId: 0,
        value: new BigNumber('0.2852598')
      }
    ]
  })
})
