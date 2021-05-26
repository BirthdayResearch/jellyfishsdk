import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/defi'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { CCreateMasterNode, CreateMasterNode } from '../../../../src/script/defi/dftx_masternode'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a1a44665478430121978f97842d623b79acecd7201a60538c13e935', // undefined operator pkh, use collateral pkh
    '6a2e446654784301742b337e0f40d5f229a89d3a26d53ae1093b6cff21978f97842d623b79acecd7201a60538c13e935' // specify another operator pkh
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x43)
  })
})

describe('without `operatorPubKeyHash`', () => {
  const header = '6a1a4466547843' // OP_RETURN (length 26 = 0x1a), PUSH_DATA(44665478, 43)
  const data = '01742b337e0f40d5f229a89d3a26d53ae1093b6cff'
  const createMasterNode: CreateMasterNode = {
    type: 0x01,
    collateralPubKeyHash: '742b337e0f40d5f229a89d3a26d53ae1093b6cff'
  }

  it('should craft dftx with OP_CODES._()', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_CREATE_MASTER_NODE(createMasterNode)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CCreateMasterNode(buffer)
      expect(composable.toObject()).toStrictEqual(createMasterNode)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CCreateMasterNode(createMasterNode)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)

      expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
    })
  })
})

describe('with `operatorPubKeyHash`', () => {
  const header = '6a2e4466547843' // OP_RETURN (length 46 = 0x2e), PUSH_DATA(44665478, 43)
  const data = '01742b337e0f40d5f229a89d3a26d53ae1093b6cff21978f97842d623b79acecd7201a60538c13e935'
  const createMasterNode: CreateMasterNode = {
    type: 0x01,
    collateralPubKeyHash: '742b337e0f40d5f229a89d3a26d53ae1093b6cff',
    operatorPubKeyHash: '21978f97842d623b79acecd7201a60538c13e935'
  }

  it('should craft dftx with OP_CODES._()', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_CREATE_MASTER_NODE(createMasterNode)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CCreateMasterNode(buffer)
      expect(composable.toObject()).toStrictEqual(createMasterNode)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CCreateMasterNode(createMasterNode)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)

      expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
    })

    it('should reject if `CCreateMasterNode.operatorPubKeyHash` is not 20 bytes long', () => {
      const composable = new CCreateMasterNode({
        type: 0x01,
        collateralPubKeyHash: '742b337e0f40d5f229a89d3a26d53ae1093b6cff',
        operatorPubKeyHash: '21978f97842d623b79acecd7201a60538c13e9'
      })
      const buffer = new SmartBuffer()
      expect(() =>
        composable.toBuffer(buffer)
      ).toThrow('ComposableBuffer.optionalHex.toBuffer invalid as length != getter().length')
    })
  })
})
