import { SmartBuffer } from 'smart-buffer'
import {
  CRemoveOracle,
  RemoveOracle,
} from '../../../../src/script/defi/dftx_oracles'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/defi'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a35446654786f1976a914c52fcb3c6dd28e530e5d162fee41f235bf7709cd88ac0102055445534c4103455552055445534c4103555344',
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x6f)
  })
})

const header = '6a35446654786f' // OP_RETURN, PUSH_DATA(44665478, 6f)
const data = '1976a914c52fcb3c6dd28e530e5d162fee41f235bf7709cd88ac0102055445534c4103455552055445534c4103555344'
const removeOracle: RemoveOracle = {
  script: {
    stack: [
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('c52fcb3c6dd28e530e5d162fee41f235bf7709cd'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ]
  }, 
  oracleId: 'dc261fb95d8865957ebe7139f61d7dd9b68935b367ad1e1f943e214de17709a2',
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
