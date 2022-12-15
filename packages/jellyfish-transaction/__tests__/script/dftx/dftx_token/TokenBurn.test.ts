import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX, TokenBalanceUInt32 } from '../../../../src/script/dftx'
import { CTokenBurn } from '../../../../src/script/dftx/dftx_token'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a2f446654784601010000000065cd1d00000000160014850e5938570fa2752353e211ab3d880b3ebfe58b000000000000',
    '6a454466547846010100000000e1f50500000000160014ad54d71e8681e0c990349070cbd17a5c567a9b9e0000000000160014ad54d71e8681e0c990349070cbd17a5c567a9b9e'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x46)
  })
})

const tokenBurnData = [
  {
    // data without context
    header: '6a2f4466547846',
    data: '01010000000065cd1d00000000160014850e5938570fa2752353e211ab3d880b3ebfe58b000000000000',
    tokenBurn: {
      amounts: [{ token: 1, amount: new BigNumber(5) }] as TokenBalanceUInt32[],
      from: {
        stack: [
          OP_CODES.OP_0,
          OP_CODES.OP_PUSHDATA_HEX_LE('850e5938570fa2752353e211ab3d880b3ebfe58b')
        ]
      },
      burnType: 0,
      variantContext: {
        variant: 0,
        context: {
          stack: []
        }
      }
    }
  },
  {
    // data with context
    header: '6a454466547846',
    data: '010100000000e1f50500000000160014ad54d71e8681e0c990349070cbd17a5c567a9b9e0000000000160014ad54d71e8681e0c990349070cbd17a5c567a9b9e',
    tokenBurn: {
      amounts: [{ token: 1, amount: new BigNumber(1) }] as TokenBalanceUInt32[],
      from: {
        stack: [
          OP_CODES.OP_0,
          OP_CODES.OP_PUSHDATA_HEX_LE('ad54d71e8681e0c990349070cbd17a5c567a9b9e')
        ]
      },
      burnType: 0,
      variantContext: {
        variant: 0,
        context: {
          stack: [
            OP_CODES.OP_0,
            OP_CODES.OP_PUSHDATA_HEX_LE('ad54d71e8681e0c990349070cbd17a5c567a9b9e')
          ]
        }
      }
    }
  }
]

tokenBurnData.forEach(({ header, tokenBurn, data }) => {
  it('should craft dftx with OP_CODES._() for burning tokens', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_TOKEN_BURN(tokenBurn)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  it('should craft dftx with OP_CODES._() for burning tokens', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_TOKEN_BURN(tokenBurn)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CTokenBurn(buffer)

      expect(composable.toObject()).toStrictEqual(tokenBurn)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CTokenBurn(tokenBurn)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)

      expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
    })
  })
})
