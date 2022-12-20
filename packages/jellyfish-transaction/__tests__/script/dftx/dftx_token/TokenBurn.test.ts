import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { CTokenBurn } from '../../../../src/script/dftx/dftx_token'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
      * TokenBurn : {
        amounts: [{'token': 1, 'amount': new BigNumber(1)}],
        from: "bcrt1q9t4j95j0whjd4n40frg4csdk73kxuwmygjal4q",
        context: "bcrt1q9t4j95j0whjd4n40frg4csdk73kxuwmygjal4q"
      }
     */
    '6a454466547846010100000000e1f505000000001600142aeb22d24f75e4daceaf48d15c41b6f46c6e3b6400000000001600142aeb22d24f75e4daceaf48d15c41b6f46c6e3b64',
    /**
      * TokenBurn : {
        amounts: [{'token': 1, 'amount': new BigNumber(9)}],
        from: "bcrt1qpqphr5kca5urfcqyslk2jyqyh4ljgvp89s6lhn",
        context: "bcrt1qpqphr5kca5urfcqyslk2jyqyh4ljgvp89s6lhn"
      }
     */
    '6a454466547846010100000000e9a43500000000160014080371d2d8ed3834e00487eca91004bd7f2430270000000000160014080371d2d8ed3834e00487eca91004bd7f243027',
    /**
      * TokenBurn : {
        amounts: [{'token': 1, 'amount': new BigNumber(5)}],
        from: "bcrt1qeefwuhumyrvsjup0w9xu25kwys3rxlva6pqha0"
      }
     */
    '6a2f446654784601010000000065cd1d00000000160014ce52ee5f9b20d909702f714dc552ce2422337d9d000000000000'
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
    header: '6a2f4466547846', // OP_RETURN(0x6a) (length 47 = 0x2f) CDfTx.SIGNATURE(0x44665478) CTokenBurn.OP_CODE(0x46)
    // TokenBurn.amounts(0x01010000000065cd1d00000000)
    // TokenBurn.from[LE](0x160014850e5938570fa2752353e211ab3d880b3ebfe58b)
    // TokenBurn.BurnType(0x00)
    // TokenBurn.variantContext(0x0000000000)
    data: '01010000000065cd1d00000000160014850e5938570fa2752353e211ab3d880b3ebfe58b000000000000',
    tokenBurn: {
      amounts: [{ token: 1, amount: new BigNumber(5) }],
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
    header: '6a454466547846', // OP_RETURN(0x6a) (length 69 = 0x45) CDfTx.SIGNATURE(0x44665478) CTokenBurn.OP_CODE(0x46)
    // TokenBurn.amounts(0x010100000000e1f50500000000)
    // TokenBurn.from[LE](0x160014ad54d71e8681e0c990349070cbd17a5c567a9b9e)
    // TokenBurn.BurnType(0x00)
    // TokenBurn.variantContext(0x00000000160014ad54d71e8681e0c990349070cbd17a5c567a9b9e)
    data: '010100000000e1f50500000000160014ad54d71e8681e0c990349070cbd17a5c567a9b9e0000000000160014ad54d71e8681e0c990349070cbd17a5c567a9b9e',
    tokenBurn: {
      amounts: [{ token: 1, amount: new BigNumber(1) }],
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
