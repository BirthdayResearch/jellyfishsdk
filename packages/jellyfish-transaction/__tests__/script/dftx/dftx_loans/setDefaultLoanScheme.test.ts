import { SmartBuffer } from 'smart-buffer'
import {
  CSetDefaultLoanScheme,
  SetDefaultLoanScheme
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a0c446654784c06736368656d65'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x4c)
  })
})

const header = '6a0c446654784c' // OP_RETURN, PUSH_DATA(4466547864, 64)
const data = '06736368656d65'
const setDefaultLoanScheme: SetDefaultLoanScheme = {
  identifier: 'scheme'
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_SET_DEFAULT_LOAN_SCHEME(setDefaultLoanScheme)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CSetDefaultLoanScheme(buffer)

    expect(composable.toObject()).toEqual(setDefaultLoanScheme)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CSetDefaultLoanScheme(setDefaultLoanScheme)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
