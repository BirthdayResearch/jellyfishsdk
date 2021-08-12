import { SmartBuffer } from 'smart-buffer'
import {
  CUpdateLoanScheme,
  UpdateLoanScheme
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a18446654784cc800000000c2eb0b0000000006736368656d65'
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

const header = '6a18446654784c' // OP_RETURN, PUSH_DATA(446654784c, 4c)
const data = 'c800000000c2eb0b0000000006736368656d65'
const updateLoanScheme: UpdateLoanScheme = {
  ratio: 200,
  rate: new BigNumber('2'),
  identifier: 'scheme'
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_UPDATE_LOAN_SCHEME(updateLoanScheme)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CUpdateLoanScheme(buffer)

    expect(composable.toObject()).toEqual(updateLoanScheme)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CUpdateLoanScheme(updateLoanScheme)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
