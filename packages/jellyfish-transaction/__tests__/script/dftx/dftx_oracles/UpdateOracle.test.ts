import { SmartBuffer } from 'smart-buffer'
import {
  CUpdateOracle,
  UpdateOracle
} from '../../../../src/script/dftx/dftx_oracles'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a4c5f4466547874061d35948925528b2025c4b84ea6f4899bab6efbcaf63776258186d7728424d11976a914ad1eaafdd6edcf2260f28cb31e24117c240681ca88ac0503055445534c4103455552055445534c41034a5059055445534c4103555344'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x74)
  })
})

const header = '6a4c5c4466547874' // OP_RETURN, PUSH_DATA(5c44665478, 74)
const data = '061d35948925528b2025c4b84ea6f4899bab6efbcaf63776258186d7728424d11976a914ad1eaafdd6edcf2260f28cb31e24117c240681ca88ac05030454534c41034555520454534c41034a50590454534c4103555344'
const updateOracle: UpdateOracle = {
  script: {
    stack: [
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('ad1eaafdd6edcf2260f28cb31e24117c240681ca'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ]
  },
  oracleId: 'd1248472d78681257637f6cafb6eab9b89f4a64eb8c425208b52258994351d06',
  weightage: 5,
  priceFeeds: [
    {
      token: 'TSLA',
      currency: 'EUR'
    },
    {
      token: 'TSLA',
      currency: 'JPY'
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
    OP_CODES.OP_DEFI_TX_UPDATE_ORACLE(updateOracle)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CUpdateOracle(buffer)

    expect(composable.toObject()).toEqual(updateOracle)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CUpdateOracle(updateOracle)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
