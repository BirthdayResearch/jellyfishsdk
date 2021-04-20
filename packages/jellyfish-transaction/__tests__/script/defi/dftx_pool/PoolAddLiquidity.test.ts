import { SmartBuffer } from 'smart-buffer'
import { CPoolAddLiquidity, PoolAddLiquidity } from '../../../../src/script/defi/dftx_pool'
import { OP_CODES, toBuffer, toOPCodes } from '../../../../src/script'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a4c4f446654786c0117a914055f1a204428e2a826f7555bb1194cb5ea44ce74870200000000d2956e220000000002000000c68900000000000017a914055f1a204428e2a826f7555bb1194cb5ea44ce7487',
    '6a4c53446654786c011976a9147742abf9be1e2a9e42d665faf9c982c65f41315988ac0200000000fb3f0000000000000200000001000000000000001976a9147742abf9be1e2a9e42d665faf9c982c65f41315988ac',
    '6a4c53446654786c011976a9147742abf9be1e2a9e42d665faf9c982c65f41315988ac0200000000d6ff0100000000000200000008000000000000001976a9147742abf9be1e2a9e42d665faf9c982c65f41315988ac'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
  })
})

const header = '6a4c4f446654786c' // OP_RETURN, PUSH_DATA(44665478, 6c)
const data = '0117a914055f1a204428e2a826f7555bb1194cb5ea44ce74870200000000d2956e220000000002000000c68900000000000017a914055f1a204428e2a826f7555bb1194cb5ea44ce7487'
const poolAddLiquidity: PoolAddLiquidity = {
  from: [{
    balances: [
      {
        amount: new BigNumber('5.77672658'), token: 0
      },
      {
        amount: new BigNumber('0.0003527'), token: 2
      }
    ],
    script: {
      stack: [
        OP_CODES.OP_HASH160,
        OP_CODES.OP_PUSHDATA_HEX_LE('055f1a204428e2a826f7555bb1194cb5ea44ce74'),
        OP_CODES.OP_EQUAL
      ]
    }
  }],
  shareAddress: {
    stack: [
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('055f1a204428e2a826f7555bb1194cb5ea44ce74'),
      OP_CODES.OP_EQUAL
    ]
  }
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_POOL_ADD_LIQUIDITY(poolAddLiquidity)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CPoolAddLiquidity(buffer)

    expect(composable.toObject()).toEqual(poolAddLiquidity)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CPoolAddLiquidity(poolAddLiquidity)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
