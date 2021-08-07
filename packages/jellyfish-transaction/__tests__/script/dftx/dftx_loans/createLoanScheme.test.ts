import { SmartBuffer } from 'smart-buffer'
import {
  CCreateLoanScheme,
  CreateLoanScheme
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a19446654784cc800000000c817a8040000000764656661756c74'
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

const header = '6a19446654784c' // OP_RETURN, PUSH_DATA(446654784c, 4c)
const data = 'c800000000c817a8040000000764656661756c74'
const createLoanScheme: CreateLoanScheme = {
  minColRatio: 200,
  interestRate: new BigNumber('200'),
  id: 'default'
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_CREATE_LOAN_SCHEME(createLoanScheme)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CCreateLoanScheme(buffer)

    expect(composable.toObject()).toEqual(createLoanScheme)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CCreateLoanScheme(createLoanScheme)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
