import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { CTokenMint, TokenMint } from '../../../../src/script/dftx/dftx_token'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a12446654784d010200000000ca9a3b00000000',
    '6a12446654784d010200000000ea56fa00000000'
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

const header = '6a12446654784d' // OP_RETURN, PUSH_DATA(44665478, 4d)
const data = '01010000006050da6001000000'
const tokenMint: TokenMint = {
  balances: [
    {
      token: 1,
      amount: new BigNumber('59.19887456')
    }
  ]
}

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
