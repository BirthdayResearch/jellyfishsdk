import { SmartBuffer } from 'smart-buffer'
import {
  CSetColleteralToken,
  SetColleteralToken
} from '../../../../src/script/dftx/dftx_loans'
import BigNumber from 'bignumber.js'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a3244665478630100e1f50500000000f65945128cd293bcd88609f4069be7ce3a800d8d57086cb67715e822db2c2cc900000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x63)
  })
})

const header = '6a324466547863' // OP_RETURN, PUSH_DATA(44665478, 4c)
const data = '0100e1f50500000000f65945128cd293bcd88609f4069be7ce3a800d8d57086cb67715e822db2c2cc9'

const setColleteralToken: SetColleteralToken = {
  token: 1,
  factor: new BigNumber('1'),
  priceFeedId: 'c92c2cdb22e81577b66c08578d0d803acee79b06f40986d8bc93d28c124559f6'
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_SET_COLLETERAL_TOKEN(setColleteralToken)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CSetColleteralToken(buffer)

    expect(composable.toObject()).toEqual(setColleteralToken)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CSetColleteralToken(setColleteralToken)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
