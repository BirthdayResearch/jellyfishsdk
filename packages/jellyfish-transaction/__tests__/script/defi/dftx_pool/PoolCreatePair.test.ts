import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/defi'
import { CPoolCreatePair, PoolCreatePair } from '../../../../src/script/defi/dftx_pool'
import { OP_CODES, toBuffer, toOPCodes } from '../../../../src/script'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a2a4466547870000200e1f5050000000017a914462093ba56448f9b6d1d22584b3236e2555432d487010000',
    '6a2a44665478700004000000000000000017a914462093ba56448f9b6d1d22584b3236e2555432d487010000',
    '6a2a4466547870000100e1f5050000000017a91498f93e07509b6cb0d32557d1e0c2becc1a3e732d87010000',
    '6a2a4466547870000300e1f5050000000017a91498f93e07509b6cb0d32557d1e0c2becc1a3e732d87010000',
    '6a2a4466547870000580f0fa020000000017a91498f93e07509b6cb0d32557d1e0c2becc1a3e732d87010000',
    '6a2a4466547870000780f0fa020000000017a914809a32165e7eb9544f7415f3ad0cb817a1eeb0bb87010000',
    '6a2a4466547870000880f0fa020000000017a914809a32165e7eb9544f7415f3ad0cb817a1eeb0bb87000000',
    '6a2a4466547870000b00e1f5050000000017a914809a32165e7eb9544f7415f3ad0cb817a1eeb0bb87010000',
    '6a424466547870000d00e1f5050000000017a91498f93e07509b6cb0d32557d1e0c2becc1a3e732d870100020000000000e1f505000000000d00000000a3e11100000000',
    '6a484466547870000f00e1f5050000000017a91498f93e07509b6cb0d32557d1e0c2becc1a3e732d8701064446492d5356020000000000e1f505000000000d00000000a3e11100000000'
  ]

  fixtures.forEach(hex => {
    const stack: any = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x70)
    expect(buffer.toString('hex')).toBe(hex)
  })
})

const header = '6a2a4466547870' // OP_RETURN, PUSH_DATA(44665478, 70)
const data = '000880f0fa020000000017a914809a32165e7eb9544f7415f3ad0cb817a1eeb0bb87000000'
const poolCreatePair: PoolCreatePair = {
  tokenA: 0,
  tokenB: 8,
  status: false,
  commission: new BigNumber('0.5'),
  ownerAddress: {
    stack: [
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('809a32165e7eb9544f7415f3ad0cb817a1eeb0bb'),
      OP_CODES.OP_EQUAL
    ]
  },
  customRewards: [],
  pairSymbol: ''
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
