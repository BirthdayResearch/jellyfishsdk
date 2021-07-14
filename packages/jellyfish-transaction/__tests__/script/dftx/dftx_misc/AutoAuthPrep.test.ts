import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { CAutoAuthPrep } from '../../../../src/script/dftx/dftx_misc'

it('should bi-directional buffer-object-buffer', () => {
  // AutoAuthPrep literally has no data, only header
  const fixtures = [
    '6a054466547841'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x41)
  })
})

/**
 * using autoAuthPrep sample from
 * https://explorer.defichain.io/#/DFI/mainnet/tx/362266760fbe1743c9077dadac100cc98b122308bb063420dc32cea1dace755c
 */
const header = '6a054466547841' // OP_RETURN 44665478 41

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_AUTO_AUTH_PREP()
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header)
})

describe('Composable', () => {
  // essentially do not require 2 tests
  // no data needed, constructor accept no argument
  it('should compose from buffer to composable', () => {
    const composable = new CAutoAuthPrep()
    expect(composable.toObject()).toStrictEqual({})
  })

  it('should compose from composable to buffer', () => {
    const composable = new CAutoAuthPrep()
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)
    expect(buffer.toBuffer().toString('hex')).toStrictEqual('') // no data
  })
})
