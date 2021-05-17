import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/defi'
import { CPoolCreatePair, PoolCreatePair } from '../../../../src/script/defi/dftx_pool'
import { OP_CODES, toBuffer, toOPCodes } from '../../../../src/script'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a2a4466547870000200e1f5050000000017a914462093ba56448f9b6d1d22584b3236e2555432d487010000', // commission: 1
    '6a2a44665478700004000000000000000017a914462093ba56448f9b6d1d22584b3236e2555432d487010000' // commission: 0
  ]

  fixtures.forEach(hex => {
    const stack: any = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    console.log('stack: ', stack[1].tx, stack[1].tx.data.ownerAddress)
    // console.log('comm: ', stack[1].tx.data.commission.toString())
    const buffer = toBuffer(stack)
    console.log('buffer: ', buffer)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x70)
    expect(buffer.toString('hex')).toBe(hex)
  })
})

const header = '6a2a4466547870' // OP_RETURN, PUSH_DATA(44665478, 70)
const data = '000200e1f5050000000017a914462093ba56448f9b6d1d22584b3236e2555432d487010000'
const poolCreatePair: PoolCreatePair = {
  tokenA: 0,
  tokenB: 2,
  status: false,
  commission: new BigNumber('16573246628.72733153'), // should be 1
  ownerAddress: {
    stack: [
      OP_CODES.OP_PUSHDATA_HEX_LE('462093ba56448f9b6d1d22584b3236e2555432d4'),
      OP_CODES.OP_EQUAL,
      OP_CODES.OP_PUSHDATA_HEX_LE('00'),
      OP_CODES.OP_0
    ]
  }
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_POOL_CREATE_PAIR(poolCreatePair)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CPoolCreatePair(buffer)

    expect(composable.toObject()).toEqual(poolCreatePair)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CPoolCreatePair(poolCreatePair)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
