import { SmartBuffer } from 'smart-buffer'
import {
  CCreateVault,
  CreateVault
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a234466547856160014cdc69f842f00a0b0e85ce16f48a07de4a260633e06736368656d65'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x56)
  })
})

const header = '6a234466547856' // OP_RETURN, PUSH_DATA(4466547856, 56)
const data = '160014cdc69f842f00a0b0e85ce16f48a07de4a260633e06736368656d65'
const createVault: CreateVault = {
  script: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('cdc69f842f00a0b0e85ce16f48a07de4a260633e')
    ]
  },
  loanSchemeId: 'scheme'
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_CREATE_VAULT(createVault)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CCreateVault(buffer)

    expect(composable.toObject()).toStrictEqual(createVault)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CCreateVault(createVault)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
