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
    '6a204466547866c800000080b2e60e0000000006736368656d65ffffffffffffffff'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x66)
  })
})

const header = '6a204466547866' // OP_RETURN, PUSH_DATA(44665478, 66)
const data = 'c800000080b2e60e0000000006736368656d65ffffffffffffffff'
const updateLoanScheme: UpdateLoanScheme = {
  ratio: 200,
  rate: new BigNumber('2.5'),
  identifier: 'scheme',
  update: BigInt(-1)
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
