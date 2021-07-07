import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { CPoolSwap, PoolSwap } from '../../../../src/script/dftx/dftx_pool'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a4c4f446654787317a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870000d6117e0300000017a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870280e18e791500008000d0430300000000',
    '6a4c4f446654787317a914635794bb3db157b6dac4dcb7467710a10f03c6ac8700809698000000000017a914582328ee9beebc3fb5844964302cc0fdbb27e04c870280e18e791500008000d0430300000000',
    '6a4c4f446654787317a9148646fc3d44c92e190c18db1cf08f430e421dba9887005671518a0000000017a9148646fc3d44c92e190c18db1cf08f430e421dba988707a0860100000000000000000000000000',
    '6a4c4f446654787317a9140c1ff6de17f73dad607a2b03b5bd77b4e57327e58707d3e2a0470000000017a9140c1ff6de17f73dad607a2b03b5bd77b4e57327e5870080e18e791500008000d0430300000000',
    '6a4c4f446654787317a914094b5e971325dee0161beccc7a78592f95c27100870080397a120000000017a914094b5e971325dee0161beccc7a78592f95c27100870280e18e791500008000d0430300000000',
    '6a4c4f446654787317a914f64714403dd1b872494851ca4ed8d5071af79ea6870087b4104d0200000017a914f64714403dd1b872494851ca4ed8d5071af79ea68707a0860100000000000000000000000000',
    '6a4c5144665478731976a9140b7127e943eaa3f28536c3f046ddbdeb790f691e88ac0080889e2a0100000017a914b3a65aa3fd9c60860bebd231d71b5bc5749ff5be870280e18e791500008000d0430300000000',
    '6a4c4f446654787317a9140164e31629342622b35bc134c8e4fe7c45c42e43870205fd0b030000000017a9140164e31629342622b35bc134c8e4fe7c45c42e43870080e18e791500008000d0430300000000',
    '6a4c4f446654787317a914963a12667d64728009567ad5eb26777e1673c479870000db7d2e0000000017a914963a12667d64728009567ad5eb26777e1673c479870280e18e791500008000d0430300000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x73)
  })
})

const header = '6a4c4f4466547873' // OP_RETURN, PUSH_DATA(44665478, 73)
const data = '17a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870000d6117e0300000017a914c34ca9c54dc87e7e875b212ec6ba0704be3de58787020000000000000000002d310100000000'
const poolSwap: PoolSwap = {
  fromAmount: new BigNumber(150),
  fromScript: {
    stack: [
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('c34ca9c54dc87e7e875b212ec6ba0704be3de587'),
      OP_CODES.OP_EQUAL
    ]
  },
  fromTokenId: 0,
  toTokenId: 2,
  toScript: {
    stack: [
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('c34ca9c54dc87e7e875b212ec6ba0704be3de587'),
      OP_CODES.OP_EQUAL
    ]
  },
  maxPrice: 20000000
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_POOL_SWAP(poolSwap)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CPoolSwap(buffer)

    expect(composable.toObject()).toStrictEqual(poolSwap)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CPoolSwap(poolSwap)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
