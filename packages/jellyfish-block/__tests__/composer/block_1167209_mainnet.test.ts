import { SmartBuffer } from 'smart-buffer'
import { CBlock, Block } from '../../src/block'
import { BlockHeader } from '../../src/blockHeader'
import BigNumber from 'bignumber.js'
import { OP_CODES, OP_PUSHDATA, Transaction, TransactionSegWit } from '@defichain/jellyfish-transaction'

/**
 * This test compose and de-compose block 1167209 from mainnet.
 * This block contains two transactions:
 * - a coinbase transaction as TransactionSegWit
 * - a poolSwap transaction as Transaction
 */
describe('block', () => {
  const data = '000000203969fdb58a856363565340027d3012c3ad17305a9543576a95b1deff761bc95ffa8bb2e3306e269c65028779c7efb07c3def7cb8cebfc66d607626e65d499de2987e36612c253d18855c9fbae0f50689bf1eef73daf2d6eb3377403b08433f5a7ab9f758abfc6b9d69cf1100000000003f00000000000000411f13e6c482d230a503b949d1dce41682cda8d1ca9f15fd769f3188fdb3c9ff0af636883bf8a2e61458d1fe22fdf815e95c5cb9f00af692599a200d9927ffadda6202040000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff050369cf1100ffffffff03647becbf020000001976a91419df0f70df5ad9da44d1950df237b238a0d0da5b88ac005ec6b2670000000017a914dd7730517e0e4969b4e43677ff5bee682e53420a87000000000000000000266a24aa21a9ed504e19f2fae67c44376480a3b28a9cb248547e64791964aeeb71e0d0bd5371c500012000000000000000000000000000000000000000000000000000000000000000000000000004000000017f63a7cd3ce29b8fae447098c8b553b6da0eb1fe790708fa4373ecc78f2197ed010000006a473044022032f42efff3c01b7a33262fe3ab285c290e1d4fc0b84053728957e253a10c3c7502204ce9bf0fc1927be26aecc1cdd8a2dd19a799afdcc89009862f7aad99e09a61c7012102ab345d93fa6c97dfb53ee4f51feb90f4e4464e816e7c124530eedc2cef11f3f1ffffffff020000000000000000566a4c5344665478731976a914e7f22ec3b393cb9dbefe0ec9477fe98e88ab96b188ac0000438ecb030000001976a914e7f22ec3b393cb9dbefe0ec9477fe98e88ab96b188ac07ffffffffffffff7fffffffffffffff7f007ff0c304000000001976a914e7f22ec3b393cb9dbefe0ec9477fe98e88ab96b188ac0000000000'

  const blockHeader: BlockHeader = {
    version: 536870912,
    hashPrevBlock: '5fc91b76ffdeb1956a5743955a3017adc312307d024053566363858ab5fd6939',
    hashMerkleRoot: 'e29d495de62676606dc6bfceb87cef3d7cb0efc7798702659c266e30e3b28bfa',
    time: 1630961304,
    bits: 406660396,
    stakeModifier: '9d6bfcab58f7b97a5a3f43083b407733ebd6f2da73ef1ebf8906f5e0ba9f5c85',
    height: new BigNumber(1167209),
    mintedBlocks: new BigNumber(63),
    signature: '1f13e6c482d230a503b949d1dce41682cda8d1ca9f15fd769f3188fdb3c9ff0af636883bf8a2e61458d1fe22fdf815e95c5cb9f00af692599a200d9927ffadda62'
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
            new OP_PUSHDATA(Buffer.from('69cf11', 'hex'), 'little'),
            OP_CODES.OP_0
          ]
        },
        sequence: 0xffffffff
      }
    ],
    vout: [
      {
        value: new BigNumber(118.09880932),
        script: {
          stack: [
            OP_CODES.OP_DUP,
            OP_CODES.OP_HASH160,
            new OP_PUSHDATA(Buffer.from('19df0f70df5ad9da44d1950df237b238a0d0da5b', 'hex'), 'little'),
            OP_CODES.OP_EQUALVERIFY,
            OP_CODES.OP_CHECKSIG
          ]
        },
        tokenId: 0
      },
      {
        value: new BigNumber(17.39769438),
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
            new OP_PUSHDATA(Buffer.from('aa21a9ed504e19f2fae67c44376480a3b28a9cb248547e64791964aeeb71e0d0bd5371c5', 'hex'), 'little')
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

  const secondTransaction: Transaction = {
    version: 0x4,
    vin: [
      {
        txid: 'ed97218fc7ec7343fa080779feb10edab653b5c8987044ae8f9be23ccda7637f',
        index: 0x1,
        script: {
          stack: [
            new OP_PUSHDATA(Buffer.from('3044022032f42efff3c01b7a33262fe3ab285c290e1d4fc0b84053728957e253a10c3c7502204ce9bf0fc1927be26aecc1cdd8a2dd19a799afdcc89009862f7aad99e09a61c701', 'hex'), 'little'),
            new OP_PUSHDATA(Buffer.from('02ab345d93fa6c97dfb53ee4f51feb90f4e4464e816e7c124530eedc2cef11f3f1', 'hex'), 'little')
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
              fromAmount: new BigNumber(163),
              fromScript: {
                stack: [
                  OP_CODES.OP_DUP,
                  OP_CODES.OP_HASH160,
                  OP_CODES.OP_PUSHDATA_HEX_LE('e7f22ec3b393cb9dbefe0ec9477fe98e88ab96b1'),
                  OP_CODES.OP_EQUALVERIFY,
                  OP_CODES.OP_CHECKSIG
                ]
              },
              fromTokenId: 0,
              toTokenId: 7,
              toScript: {
                stack: [
                  OP_CODES.OP_DUP,
                  OP_CODES.OP_HASH160,
                  OP_CODES.OP_PUSHDATA_HEX_LE('e7f22ec3b393cb9dbefe0ec9477fe98e88ab96b1'),
                  OP_CODES.OP_EQUALVERIFY,
                  OP_CODES.OP_CHECKSIG
                ]
              },
              maxPrice: new BigNumber('9223372036854775807')
            })
          ]
        },
        tokenId: 0
      },
      {
        value: new BigNumber(0.79949951),
        script: {
          stack: [
            OP_CODES.OP_DUP,
            OP_CODES.OP_HASH160,
            OP_CODES.OP_PUSHDATA_HEX_LE('e7f22ec3b393cb9dbefe0ec9477fe98e88ab96b1'),
            OP_CODES.OP_EQUALVERIFY,
            OP_CODES.OP_CHECKSIG
          ]
        },
        tokenId: 0
      }
    ],
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
