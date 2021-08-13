import { SmartBuffer } from 'smart-buffer'
import {
  CCreateVoc, CreateProposal
} from '../../../../src/script/dftx/dftx_governance'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a2744665478450300000000000000000002166e657720766f7465206f6620636f6e666964656e6365'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x45)
  })
})

describe('createVoc', () => {
  const header = '6a274466547845' // OP_RETURN, PUSH_DATA(44665478, 45)
  const data = '0300000000000000000002166e657720766f7465206f6620636f6e666964656e6365'
  const CreateProposal: CreateProposal = {
    type: 0x03,
    title: 'new vote of confidence',
    amount: new BigNumber(0),
    address: {
      stack: []
    },
    cycles: 2
  }

  it('should craft dftx with OP_CODES._()', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_CREATE_VOC(CreateProposal)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CCreateVoc(buffer)

      expect(composable.toObject()).toEqual(CreateProposal)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CCreateVoc(CreateProposal)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)

      expect(buffer.toBuffer().toString('hex')).toEqual(data)
    })
  })
})
