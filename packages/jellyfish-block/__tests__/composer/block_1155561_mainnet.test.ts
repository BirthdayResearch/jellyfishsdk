import { SmartBuffer } from 'smart-buffer'
import { CBlock, Block } from '../../src/block'
import { BlockHeader } from '../../src/blockHeader'
import BigNumber from 'bignumber.js'
import { OP_CODES, OP_PUSHDATA, TransactionSegWit } from '@defichain/jellyfish-transaction'

/**
 * This test compose and de-compose block 1155561 from mainnet.
 * * This block contains four transactions:
 * - a coinbase transaction
 * - a poolSwap transaction
 * - an accountToAccount transaction
 * - an utxosToAccount transaction
 */
describe('block', () => {
  const data = '0000002066a104aa38a83b7546190e0da36ea7a1da165019991e2dc2d2090010da2a196d48d0437eb7c97402da2e6d4617613362eba7ca918ea3b6850236f02075d31672941d316182d2391807e1ee2dfd91975f9b76c74ec65c9c2c3984164cea6eff66c4d4f6d8e5cc47ede9a111000000000033000000000000004120154242ed509c6b23d43dff87e812a6e33f45740625b4bc8cff9a177044b2d4c23168aea3b49fcbf47b6527505be4faaf3527bd6831fc855a76192222d9befd6c04040000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff0503e9a11100ffffffff03647becbf020000001976a914c39cd096e6fc10ac9f55a3361fab9c6bcdd6f2fb88ac005ec6b2670000000017a914dd7730517e0e4969b4e43677ff5bee682e53420a87000000000000000000266a24aa21a9edcf5072856131511d622b01840196d6b007d3278e4fefefe44727842c3ac83d1200012000000000000000000000000000000000000000000000000000000000000000000000000004000000000101c4c297c4907fbccfc7f63fb8c654e1892c9903ec29c99226bf3dcd930a338a8f010000001716001423c0d1aa4a7adb12d2259d60eb4ef2fecf0d3698ffffffff020000000000000000526a4c4f446654787317a914e3519c812a9a4d07d1af2992d3376c396cb8e471870000752b7d0000000017a914e3519c812a9a4d07d1af2992d3376c396cb8e4718701ffffffffffffff7fffffffffffffff7f00dd504d000000000017a914e3519c812a9a4d07d1af2992d3376c396cb8e471870002463043021f62908ad5efca64fa149d16240c19347a778194f07f04fef2a2911c833154f50220158c97d0283dc06627247df25f30d5e075a29a4cba782341088a198c8ed2635101210211391f86896859bb12bed62a6373cacf9c7f6142588566d3b9fc4eef08d9e64a0000000004000000000102e27a140bd2c5595f1c2c1f67cb159f0d9060fa73f9b09905827b457c26b04a68020000006a47304402200fe9da9dd20206cebe588af2a3e1ebd7b1e3c8ac33f59a58d51680cfcf3cf58b02204d37275b5f97ab5e081d09100293f5ed888155b7dc92025752c4ffcd2a0ed954012103bab6d9c6c509ef87497fb36432ca7924f25faaab1cb3281538967e180099a553feffffff2ade45e30d4b7d98b5c39451dd2736fc2b59fecac8adf8d11fb83f76f968a14d01000000171600141371e8d23e696d1675fe4e65263d899e72c7a4a5feffffff0280e7c63f0000000017a914a2d98585f36390b976b8ff2027ad83198f91738287003f6795000000000017a914d18eed6922eace265194b45d1fc19e597a8fd1a787000002473044022053484d4c0644c86b2b803d30ab619f7a6a07494166ca357825e7aa423a0fdd3402200eace3dd472c8f7757f9b7641d40083b095156e7a7661878807bfe30e59d4fbe012103b72f262bd5b444366b7ab01c482da29afebdc40f8c866937be8a7b72e2be2fd3e7a1110004000000000103ab3e9c918b8ffb812c6045f3c593edfde95c1fc6012ca45a2934452e39ac5a7f0100000017160014262efe89a61c012e3f80a817521378a4ceeb5614feffffff0b8579fe572dd7edabcfd73f59b10fd6b283909f59ada8a942b02b51ed9f58da0100000017160014be28fb0744a4b933937586d41f9af6bd030376b7feffffff33b2f47e88fdfd1db98cf8cf44b67e877e73cee4eeacdc5ba09ce0759f55320e0100000017160014f56b7dfd6c37a19e891f600b6ffdc24263623a0dfeffffff02cb6c140a000000002d6a2b44665478550117a91456a79d1313f07d4923c32246e396eb7777049d5f870100000000cb6c140a00000000000fc85c000000000017a9149582258ec42f2d40848d4f9cf93d7a61df9f5294870002473044022035e9b4c7cf93e55b41c9be7864985bd33620a85f0fb50233a02aec1456de7880022005353255a1bfbe5bce5b948f230ec11abf343f9ae4516422faf8c06b42e975fe0121024b8205c312cf1976ff47373d4f55b7bc827965de402ab16a2a5a584a00e0cd280247304402201c3701594caf3507e07e555f211c6eddbdeccbbb7de14ca15631d44c12e443ec022006af5c05be8fa239b9b97821b6268538f3bc92553a5cbf91128e3f7cac9799fa0121037761c87bc08ab7267b2803c9f55275dadc2d72271711fdb44037eec65af943a002473044022004edfb8f415310d65cd577cfc8185d63fa055ddcb769f9ac5f08f4045eae5521022027bea909424388d1e6d3c66e9a0fd7dfbe6b6d918d8883e4073972b2f3858b040121030f5dd539dd1fd43e3eee8e06316fad5eb37751c701d52758d2ab9483378c332b00000000'

  const blockHeader: BlockHeader = {
    version: 536870912,
    hashPrevBlock: '6d192ada100009d2c22d1e99195016daa1a76ea30d0e1946753ba838aa04a166',
    hashMerkleRoot: '7216d37520f0360285b6a38e91caa7eb62336117466d2eda0274c9b77e43d048',
    time: 1630608788,
    bits: 0x1839d282,
    stakeModifier: 'ed47cce5d8f6d4c466ff6eea4c1684392c9c5cc64ec7769b5f9791fd2deee107',
    height: new BigNumber(1155561),
    mintedBlocks: new BigNumber(51),
    signature: '20154242ed509c6b23d43dff87e812a6e33f45740625b4bc8cff9a177044b2d4c23168aea3b49fcbf47b6527505be4faaf3527bd6831fc855a76192222d9befd6c'
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
            new OP_PUSHDATA(Buffer.from('e9a111', 'hex'), 'little'),
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
            new OP_PUSHDATA(Buffer.from('c39cd096e6fc10ac9f55a3361fab9c6bcdd6f2fb', 'hex'), 'little'),
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
            new OP_PUSHDATA(Buffer.from('aa21a9edcf5072856131511d622b01840196d6b007d3278e4fefefe44727842c3ac83d12', 'hex'), 'little')
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
        txid: '8f8a330a93cd3dbf2692c929ec03992c89e154c6b83ff6c7cfbc7f90c497c2c4',
        index: 0x1,
        script: {
          stack: [
            new OP_PUSHDATA(Buffer.from('001423c0d1aa4a7adb12d2259d60eb4ef2fecf0d3698', 'hex'), 'little')
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
              fromAmount: new BigNumber(21),
              fromScript: {
                stack: [
                  OP_CODES.OP_HASH160,
                  OP_CODES.OP_PUSHDATA_HEX_LE('e3519c812a9a4d07d1af2992d3376c396cb8e471'),
                  OP_CODES.OP_EQUAL
                ]
              },
              fromTokenId: 0,
              toTokenId: 1,
              toScript: {
                stack: [
                  OP_CODES.OP_HASH160,
                  OP_CODES.OP_PUSHDATA_HEX_LE('e3519c812a9a4d07d1af2992d3376c396cb8e471'),
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
        value: new BigNumber(0.05066973),
        script: {
          stack: [
            OP_CODES.OP_HASH160,
            new OP_PUSHDATA(Buffer.from('e3519c812a9a4d07d1af2992d3376c396cb8e471', 'hex'), 'little'),
            OP_CODES.OP_EQUAL
          ]
        },
        tokenId: 0
      }
    ],
    witness: [{
      scripts: [
        {
          hex: '3043021f62908ad5efca64fa149d16240c19347a778194f07f04fef2a2911c833154f50220158c97d0283dc06627247df25f30d5e075a29a4cba782341088a198c8ed2635101'
        },
        {
          hex: '0211391f86896859bb12bed62a6373cacf9c7f6142588566d3b9fc4eef08d9e64a'
        }
      ]
    }],
    lockTime: 0x00000000
  }

  const thirdTransaction: TransactionSegWit = {
    version: 0x4,
    marker: 0x00,
    flag: 0x01,
    vin: [
      {
        txid: '684ab0267c457b820599b0f973fa60900d9f15cb671f2c1c5f59c5d20b147ae2',
        index: 0x2,
        script: {
          stack: [
            new OP_PUSHDATA(Buffer.from('304402200fe9da9dd20206cebe588af2a3e1ebd7b1e3c8ac33f59a58d51680cfcf3cf58b02204d37275b5f97ab5e081d09100293f5ed888155b7dc92025752c4ffcd2a0ed95401', 'hex'), 'little'),
            new OP_PUSHDATA(Buffer.from('03bab6d9c6c509ef87497fb36432ca7924f25faaab1cb3281538967e180099a553', 'hex'), 'little')
          ]
        },
        sequence: 4294967294
      },
      {
        txid: '4da168f9763fb81fd1f8adc8cafe592bfc3627dd5194c3b5987d4b0de345de2a',
        index: 0x1,
        script: {
          stack: [
            new OP_PUSHDATA(Buffer.from('00141371e8d23e696d1675fe4e65263d899e72c7a4a5', 'hex'), 'little')
          ]
        },
        sequence: 4294967294
      }
    ],
    vout: [
      {
        value: new BigNumber(10.7),
        script: {
          stack: [
            OP_CODES.OP_HASH160,
            new OP_PUSHDATA(Buffer.from('a2d98585f36390b976b8ff2027ad83198f917382', 'hex'), 'little'),
            OP_CODES.OP_EQUAL
          ]
        },
        tokenId: 0
      },
      {
        value: new BigNumber(0.09791295),
        script: {
          stack: [
            OP_CODES.OP_HASH160,
            new OP_PUSHDATA(Buffer.from('d18eed6922eace265194b45d1fc19e597a8fd1a7', 'hex'), 'little'),
            OP_CODES.OP_EQUAL
          ]
        },
        tokenId: 0
      }
    ],
    witness: [
      {
        scripts: []
      },
      {
        scripts: [
          {
            hex: '3044022053484d4c0644c86b2b803d30ab619f7a6a07494166ca357825e7aa423a0fdd3402200eace3dd472c8f7757f9b7641d40083b095156e7a7661878807bfe30e59d4fbe01'
          },
          {
            hex: '03b72f262bd5b444366b7ab01c482da29afebdc40f8c866937be8a7b72e2be2fd3'
          }
        ]
      }
    ],
    lockTime: 1155559
  }

  const fourthTransaction: TransactionSegWit = {
    version: 0x4,
    marker: 0x00,
    flag: 0x01,
    vin: [
      {
        txid: '7f5aac392e4534295aa42c01c61f5ce9fded93c5f345602c81fb8f8b919c3eab',
        index: 0x1,
        script: {
          stack: [
            new OP_PUSHDATA(Buffer.from('0014262efe89a61c012e3f80a817521378a4ceeb5614', 'hex'), 'little')
          ]
        },
        sequence: 4294967294
      },
      {
        txid: 'da589fed512bb042a9a8ad599f9083b2d60fb1593fd7cfabedd72d57fe79850b',
        index: 0x1,
        script: {
          stack: [
            new OP_PUSHDATA(Buffer.from('0014be28fb0744a4b933937586d41f9af6bd030376b7', 'hex'), 'little')
          ]
        },
        sequence: 4294967294
      },
      {
        txid: '0e32559f75e09ca05bdcaceee4ce737e877eb644cff88cb91dfdfd887ef4b233',
        index: 0x1,
        script: {
          stack: [
            new OP_PUSHDATA(Buffer.from('0014f56b7dfd6c37a19e891f600b6ffdc24263623a0d', 'hex'), 'little')
          ]
        },
        sequence: 4294967294
      }
    ],
    vout: [
      {
        value: new BigNumber(1.69110731),
        script: {
          stack: [
            OP_CODES.OP_RETURN,
            OP_CODES.OP_DEFI_TX_UTXOS_TO_ACCOUNT({
              to: [
                {
                  script: {
                    stack: [
                      OP_CODES.OP_HASH160,
                      new OP_PUSHDATA(Buffer.from('56a79d1313f07d4923c32246e396eb7777049d5f', 'hex'), 'little'),
                      OP_CODES.OP_EQUAL
                    ]
                  },
                  balances: [
                    {
                      token: 0,
                      amount: new BigNumber(1.69110731)
                    }
                  ]
                }
              ]
            })
          ]
        },
        tokenId: 0
      },
      {
        value: new BigNumber(0.06080527),
        script: {
          stack: [
            OP_CODES.OP_HASH160,
            new OP_PUSHDATA(Buffer.from('9582258ec42f2d40848d4f9cf93d7a61df9f5294', 'hex'), 'little'),
            OP_CODES.OP_EQUAL
          ]
        },
        tokenId: 0
      }
    ],
    witness: [{
      scripts: [
        {
          hex: '3044022035e9b4c7cf93e55b41c9be7864985bd33620a85f0fb50233a02aec1456de7880022005353255a1bfbe5bce5b948f230ec11abf343f9ae4516422faf8c06b42e975fe01'
        },
        {
          hex: '024b8205c312cf1976ff47373d4f55b7bc827965de402ab16a2a5a584a00e0cd28'
        }
      ]
    },
    {
      scripts: [
        {
          hex: '304402201c3701594caf3507e07e555f211c6eddbdeccbbb7de14ca15631d44c12e443ec022006af5c05be8fa239b9b97821b6268538f3bc92553a5cbf91128e3f7cac9799fa01'
        },
        {
          hex: '037761c87bc08ab7267b2803c9f55275dadc2d72271711fdb44037eec65af943a0'
        }

      ]
    },
    {
      scripts: [
        {
          hex: '3044022004edfb8f415310d65cd577cfc8185d63fa055ddcb769f9ac5f08f4045eae5521022027bea909424388d1e6d3c66e9a0fd7dfbe6b6d918d8883e4073972b2f3858b0401'
        },
        {
          hex: '030f5dd539dd1fd43e3eee8e06316fad5eb37751c701d52758d2ab9483378c332b'
        }
      ]
    }],
    lockTime: 0x00000000
  }

  const block: Block = {
    blockHeader,
    transactions: [
      firstTransaction,
      secondTransaction,
      thirdTransaction,
      fourthTransaction
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
