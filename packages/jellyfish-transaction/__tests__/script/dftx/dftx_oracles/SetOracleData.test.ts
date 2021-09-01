import { SmartBuffer } from 'smart-buffer'
import {
  SetOracleData,
  CSetOracleData
} from '../../../../src/script/dftx/dftx_oracles'
import BigNumber from 'bignumber.js'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a414466547879061d35948925528b2025c4b84ea6f4899bab6efbcaf63776258186d7728424d1bc29a7600000000001055445534c41010355534400e1f50500000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x79)
  })
})

const header = '6a404466547879' // OP_RETURN, PUSH_DATA(44665478, 79)
const data = '061d35948925528b2025c4b84ea6f4899bab6efbcaf63776258186d7728424d1bc29a76000000000010454534c41010355534400e1f50500000000'

const setOracleData: SetOracleData = {
  oracleId: 'd1248472d78681257637f6cafb6eab9b89f4a64eb8c425208b52258994351d06',
  timestamp: new BigNumber('1621567932'),
  tokens: [
    {
      token: 'TSLA',
      prices: [
        {
          currency: 'USD',
          amount: new BigNumber('1.0')
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
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CSetOracleData(buffer)

    expect(composable.toObject()).toStrictEqual(setOracleData)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CSetOracleData(setOracleData)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
