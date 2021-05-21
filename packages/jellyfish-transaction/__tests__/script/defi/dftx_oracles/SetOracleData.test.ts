import { SmartBuffer } from 'smart-buffer'
import {
  SetOracleData,
  CSetOracleData,
} from '../../../../src/script/defi/dftx_oracles'
import BigNumber from 'bignumber.js'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/defi'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a414466547879a20977e14d213e941f1ead67b33589b6d97d1df63971be7e9565885db91f26dc597ab4887901000001055445534c41010355534480f0fa0200000000',
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

const header = '6a414466547879' // OP_RETURN, PUSH_DATA(44665478, 6f)
const data = 'a20977e14d213e941f1ead67b33589b6d97d1df63971be7e9565885db91f26dc597ab4887901000001055445534c41010355534480f0fa0200000000'

const setOracleData: SetOracleData = {
  oracleId: 'dc261fb95d8865957ebe7139f61d7dd9b68935b367ad1e1f943e214de17709a2',
  timestamp: 1621496199768,
  currencies: [
    {
      currency:"USD", 
      prices: [
        {
          token: 'TESLA',
          amount: new BigNumber('0.5')
        }
      ]
    }
  ]
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_SET_ORACLE_DATA(setOracleData)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CSetOracleData(buffer)

    expect(composable.toObject()).toEqual(setOracleData)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CSetOracleData(setOracleData)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
