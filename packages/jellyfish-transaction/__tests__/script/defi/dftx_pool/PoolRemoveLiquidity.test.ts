import { SmartBuffer } from 'smart-buffer'
import {
  CPoolRemoveLiquidity,
  PoolRemoveLiquidity
} from '../../../../src/script/defi/dftx_pool'
import { OP_CODES, toBuffer, toOPCodes } from '../../../../src/script'
import BigNumber from 'bignumber.js'
import { OP_DEFI_TX } from '../../../../src/script/defi'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a26446654787217a914055f1a204428e2a826f7555bb1194cb5ea44ce74870550a9fe0700000000'
    // TODO(fuxingloh): to add more valid test cases
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x72)
  })
})

const header = '6a264466547872' // OP_RETURN, PUSH_DATA(44665478, 72)
const data = '17a914055f1a204428e2a826f7555bb1194cb5ea44ce74870550a9fe0700000000'
const poolRemoveLiquidity: PoolRemoveLiquidity = {
  tokenId: 5,
  script: {
    stack: [
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('055f1a204428e2a826f7555bb1194cb5ea44ce74'),
      OP_CODES.OP_EQUAL
    ]
  },
  amount: new BigNumber('1.3413')
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_POOL_REMOVE_LIQUIDITY(poolRemoveLiquidity)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CPoolRemoveLiquidity(buffer)

    expect(composable.toObject()).toEqual(poolRemoveLiquidity)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CPoolRemoveLiquidity(poolRemoveLiquidity)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
