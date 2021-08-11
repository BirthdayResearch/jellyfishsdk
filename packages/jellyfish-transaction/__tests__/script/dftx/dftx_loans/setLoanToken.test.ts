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
    '6a3e44665478670341424308414243544f4b454e328285aa986441e079aeab23539995ad48699121817788b6fccbca4b74710c1d00e1f5050000000000000001'
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

const header = '6a3e4466547867' // OP_RETURN, PUSH_DATA(4466547867, 67)
const data = '0341424308414243544f4b454e328285aa986441e079aeab23539995ad48699121817788b6fccbca4b74710c1d00e1f5050000000000000001'
const setLoanToken: SetLoanToken = {
  symbol: 'ABC',
  name: 'ABCTOKEN',
  priceFeedId: '1d0c71744bcacbfcb688778121916948ad95995323abae79e0416498aa858232',
  mintable: true,
  interest: new BigNumber(1)
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
