import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { CTokenMint, TokenMint } from '../../../../src/script/dftx/dftx_token'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a13446654784d010200000000ca9a3b0000000000',
    '6a13446654784d010200000000ea56fa0000000000',
    '6a29446654784d010100000000e1f50500000000160014dd527be30bedb3de69fee5ebe32af430686cfe3f'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x4d)
  })
})

const tokenMintData: Array<{ header: string, data: string, tokenMint: TokenMint }> = [
  {
    header: '6a13446654784d', // OP_RETURN(0x6a) (length 19 = 0x13) CDfTx.SIGNATURE(0x44665478) CTokenMint.OP_CODE(0x4d)
    // TokenMint.balances(0x01010000006050da6001000000)
    // TokenMint.to[LE](00)
    data: '01010000006050da600100000000',
    tokenMint: {
      balances: [
        {
          token: 1,
          amount: new BigNumber('59.19887456')
        }
      ],
      to: {
        stack: []
      }
    }
  },
  {
    header: '6a29446654784d', // OP_RETURN(0x6a) (length 69 = 0x29) CDfTx.SIGNATURE(0x44665478) CTokenMint.OP_CODE(0x4d)
    // TokenMint.balances(0x010100000000e1f50500000000)
    // TokenMint.to(160014ad54d71e8681e0c990349070cbd17a5c567a9b9e)
    data: '010100000000e1f50500000000160014ad54d71e8681e0c990349070cbd17a5c567a9b9e',
    tokenMint:
    {
      balances: [
        {
          token: 1,
          amount: new BigNumber('1')
        }
      ],
      to: {
        stack: [
          OP_CODES.OP_0,
          OP_CODES.OP_PUSHDATA_HEX_LE('ad54d71e8681e0c990349070cbd17a5c567a9b9e')
        ]
      }
    }
  }
]

describe.each(tokenMintData)('should craft and compose dftx',
  ({ header, tokenMint, data }: { header: string, data: string, tokenMint: TokenMint }) => {
    it('should craft dftx with OP_CODES._()', () => {
      const stack = [
        OP_CODES.OP_RETURN,
        OP_CODES.OP_DEFI_TX_TOKEN_MINT(tokenMint)
      ]

      const buffer = toBuffer(stack)
      expect(buffer.toString('hex')).toStrictEqual(header + data)
    })

    describe('Composable', () => {
      it('should compose from buffer to composable', () => {
        const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
        const composable = new CTokenMint(buffer)

        expect(composable.toObject()).toStrictEqual(tokenMint)
      })

      it('should compose from composable to buffer', () => {
        const composable = new CTokenMint(tokenMint)
        const buffer = new SmartBuffer()
        composable.toBuffer(buffer)

        expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
      })
    })

    it('should craft dftx with OP_CODES._()', () => {
      const stack = [
        OP_CODES.OP_RETURN,
        OP_CODES.OP_DEFI_TX_TOKEN_MINT(tokenMint)
      ]

      const buffer = toBuffer(stack)
      expect(buffer.toString('hex')).toStrictEqual(header + data)
    })

    describe('Composable', () => {
      it('should compose from buffer to composable', () => {
        const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
        const composable = new CTokenMint(buffer)

        expect(composable.toObject()).toStrictEqual(tokenMint)
      })

      it('should compose from composable to buffer', () => {
        const composable = new CTokenMint(tokenMint)
        const buffer = new SmartBuffer()
        composable.toBuffer(buffer)

        expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
      })
    })
  })
