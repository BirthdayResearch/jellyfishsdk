import { SmartBuffer } from 'smart-buffer'
import {
  CSetLoanToken,
  SetLoanToken
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a3c446654786706546f6b656e3106546f6b656e31ea2aab6e885ba08b02775a7ef63c0f6c59c7c24bd5fb13a6209a4cf55645a325010000000000000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x67)
  })
})

const header = '6a3c4466547867' // OP_RETURN, PUSH_DATA(4466547867, 67)
const data = '06546f6b656e3106546f6b656e31ea2aab6e885ba08b02775a7ef63c0f6c59c7c24bd5fb13a6209a4cf55645a325010000000000000000'
const setLoanToken: SetLoanToken = {
  symbol: 'Token1',
  name: 'Token1',
  priceFeedId: '25a34556f54c9a20a613fbd54bc2c7596c0f3cf67e5a77028ba05b886eab2aea',
  mintable: true,
  interest: new BigNumber(0)
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_SET_LOAN_TOKEN(setLoanToken)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CSetLoanToken(buffer)

    expect(composable.toObject()).toEqual(setLoanToken)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CSetLoanToken(setLoanToken)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
