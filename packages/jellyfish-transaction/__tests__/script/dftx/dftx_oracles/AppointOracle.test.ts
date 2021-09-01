import { SmartBuffer } from 'smart-buffer'
import {
  CAppointOracle,
  AppointOracle
} from '../../../../src/script/dftx/dftx_oracles'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a35446654786f1976a914c52fcb3c6dd28e530e5d162fee41f235bf7709cd88ac0102055445534c4103455552055445534c4103555344'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x6f)
  })
})

const header = '6a33446654786f' // OP_RETURN, PUSH_DATA(44665478, 6f)
const data = '1976a914c52fcb3c6dd28e530e5d162fee41f235bf7709cd88ac01020454534c41034555520454534c4103555344'
const appointOracle: AppointOracle = {
  script: {
    stack: [
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('c52fcb3c6dd28e530e5d162fee41f235bf7709cd'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ]
  },
  weightage: 1,
  priceFeeds: [
    {
      token: 'TSLA',
      currency: 'EUR'
    },
    {
      token: 'TSLA',
      currency: 'USD'
    }
  ]
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_APPOINT_ORACLE(appointOracle)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CAppointOracle(buffer)

    expect(composable.toObject()).toStrictEqual(appointOracle)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CAppointOracle(appointOracle)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
