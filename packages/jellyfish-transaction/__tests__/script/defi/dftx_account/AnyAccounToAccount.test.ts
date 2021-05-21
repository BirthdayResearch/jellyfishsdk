import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/defi'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { AnyAccountToAccount, CAnyAccountToAccount } from '../../../../src/script/defi/dftx_account'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a4c9d44665478610317a91457188c8b982570fe69ed6b99ce0489a9ea482023870100000000f28302000000000017a914d6e3de1c51f22e580944bb6a1647f1d22f0159c787010000000038a9d855020000001976a914016d3983837e91768af05e7fbbd956995c0ea37088ac010000000046030b00000000000117a914d6e3de1c51f22e580944bb6a1647f1d22f0159c78701000000007030e65502000000',
    '6a4c5144665478610117a914fad0d4ab78412ec38e7a0b118e51e147e947e02d870100000000f6ba3e75020000000117a914fad0d4ab78412ec38e7a0b118e51e147e947e02d870100000000f6ba3e7502000000',
    '6a4c5144665478610117a914f9038d01ce94d1b063d38fb580b1c85f927094a8870100000000b6d3ce1d000000000117a914fb61bf557ad5548558c054255026c858c8fefc83870100000000b6d3ce1d00000000',
    '6a4c5144665478610117a9147983732a70b6bdc52f3a3cc1bd1a35017f69ecb887010300000000ca9a3b000000000117a914fb3cc0b39e5634578c914f132a1eba0ac9992feb87010300000000ca9a3b00000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x61)
  })
})

/**
 * using accountToUtxos sample from DFI mainnet
 * https://explorer.defichain.io/#/DFI/mainnet/tx/76409014d03f23b7b2522143003d98ee09341cf86300099e8e620d5dab4587e4
 */
const header = '6a4c9d4466547861' // OP_RETURN 44665478 61
const data = '0317a91457188c8b982570fe69ed6b99ce0489a9ea482023870100000000f28302000000000017a914d6e3de1c51f22e580944bb6a1647f1d22f0159c787010000000038a9d855020000001976a914016d3983837e91768af05e7fbbd956995c0ea37088ac010000000046030b00000000000117a914d6e3de1c51f22e580944bb6a1647f1d22f0159c78701000000007030e65502000000'
const anyAccountToAccount: AnyAccountToAccount = {
  from: [
    {
      balances: [
        {
          amount: new BigNumber('0.0016485'), token: 0
        }
      ],
      script: {
        stack: [
          OP_CODES.OP_HASH160,
          OP_CODES.OP_PUSHDATA_HEX_LE('57188c8b982570fe69ed6b99ce0489a9ea482023'),
          OP_CODES.OP_EQUAL
        ]
      }
    },
    {
      balances: [
        {
          amount: new BigNumber('100.30197048'), token: 0
        }
      ],
      script: {
        stack: [
          OP_CODES.OP_HASH160,
          OP_CODES.OP_PUSHDATA_HEX_LE('d6e3de1c51f22e580944bb6a1647f1d22f0159c7'),
          OP_CODES.OP_EQUAL
        ]
      }
    },
    {
      balances: [
        {
          amount: new BigNumber('0.00721734'), token: 0
        }
      ],
      script: {
        stack: [
          OP_CODES.OP_DUP,
          OP_CODES.OP_HASH160,
          OP_CODES.OP_PUSHDATA_HEX_LE('016d3983837e91768af05e7fbbd956995c0ea370'),
          OP_CODES.OP_EQUALVERIFY,
          OP_CODES.OP_CHECKSIG
        ]
      }
    }
  ],
  to: [{
    balances: [
      {
        amount: new BigNumber('100.31083632'), token: 0
      }
    ],
    script: {
      stack: [
        OP_CODES.OP_HASH160,
        OP_CODES.OP_PUSHDATA_HEX_LE('d6e3de1c51f22e580944bb6a1647f1d22f0159c7'),
        OP_CODES.OP_EQUAL
      ]
    }
  }]
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_ANY_ACCOUNT_TO_ACCOUNT(anyAccountToAccount)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CAnyAccountToAccount(buffer)
    expect(composable.toObject()).toStrictEqual(anyAccountToAccount)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CAnyAccountToAccount(anyAccountToAccount)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
