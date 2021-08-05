import { SmartBuffer } from 'smart-buffer'
import {
  CRemoveOracle,
  RemoveOracle
} from '../../../../src/script/dftx/dftx_oracles'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a20446654784cc800000000e1f5050000000006736368656d650000000000000000'
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

const header = '6a2044665478' // OP_RETURN, PUSH_DATA(44665478, 4c)
const data = '4cc800000000e1f5050000000006736368656d650000000000000000'
const removeOracle: RemoveOracle = {
  oracleId: 'd1248472d78681257637f6cafb6eab9b89f4a64eb8c425208b52258994351d06'
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_REMOVE_ORACLE(removeOracle)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CRemoveOracle(buffer)

    expect(composable.toObject()).toEqual(removeOracle)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CRemoveOracle(removeOracle)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
