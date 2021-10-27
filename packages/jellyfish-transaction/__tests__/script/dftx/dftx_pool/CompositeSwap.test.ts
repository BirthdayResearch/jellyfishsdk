import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { DfTx, OP_DEFI_TX } from '../../../../src/script/dftx'
import { CCompositeSwap, OP_CODES, CompositeSwap } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a4c4f446654786917a9140806eb42b6d5bb69726909fb6da34a9152afdf048701c7b3240d0000000017a9140806eb42b6d5bb69726909fb6da34a9152afdf048700ffffffffffffff7fffffffffffffff7f',
    '6a4c4f446654786917a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870000d6117e0300000017a914c34ca9c54dc87e7e875b212ec6ba0704be3de58787022fe28e7915000080ffcf430300000000',
    '6a4c4f446654786917a914635794bb3db157b6dac4dcb7467710a10f03c6ac8700809698000000000017a914582328ee9beebc3fb5844964302cc0fdbb27e04c87022fe28e7915000080ffcf430300000000',
    '6a4c4f446654786917a9148646fc3d44c92e190c18db1cf08f430e421dba9887005671518a0000000017a9148646fc3d44c92e190c18db1cf08f430e421dba988707a0860100000000000000000000000000',
    '6a4c4f446654786917a9140c1ff6de17f73dad607a2b03b5bd77b4e57327e58707d3e2a0470000000017a9140c1ff6de17f73dad607a2b03b5bd77b4e57327e587002fe28e7915000080ffcf430300000000',
    '6a4c4f446654786917a914094b5e971325dee0161beccc7a78592f95c27100870080397a120000000017a914094b5e971325dee0161beccc7a78592f95c2710087022fe28e7915000080ffcf430300000000',
    '6a4c4f446654786917a914f64714403dd1b872494851ca4ed8d5071af79ea6870087b4104d0200000017a914f64714403dd1b872494851ca4ed8d5071af79ea68707a0860100000000000000000000000000',
    '6a4c5144665478691976a9140b7127e943eaa3f28536c3f046ddbdeb790f691e88ac0080889e2a0100000017a914b3a65aa3fd9c60860bebd231d71b5bc5749ff5be87022fe28e7915000080ffcf430300000000',
    '6a4c4f446654786917a9140164e31629342622b35bc134c8e4fe7c45c42e43870205fd0b030000000017a9140164e31629342622b35bc134c8e4fe7c45c42e4387002fe28e7915000080ffcf430300000000',
    '6a4c4f446654786917a914963a12667d64728009567ad5eb26777e1673c479870000db7d2e0000000017a914963a12667d64728009567ad5eb26777e1673c47987022fe28e7915000080ffcf430300000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x69)
  })
})

const header = '6a4c4f4466547869' // OP_RETURN, PUSH_DATA(44665478, 69)
const data = '17a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870000d6117e0300000017a914c34ca9c54dc87e7e875b212ec6ba0704be3de58787029a030000000000003088020200000000'

const compositeSwap: CompositeSwap = {
  swapInfo: {
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
    maxPrice: new BigNumber('922.33720368')
  },
  poolIDs: [2, 4]
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_COMPOSITE_SWAP(compositeSwap)
  ]

  const buffer = toBuffer(stack)
  console.log(buffer.toString('hex'))
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CCompositeSwap(buffer)

    expect(composable.toObject()).toStrictEqual(compositeSwap)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CCompositeSwap(compositeSwap)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })

  it('should bi-directional with two digits precision for 1.92', () => {
    const poolSwapTwoDecimalPrecision = {
      ...compositeSwap,
      maxPrice: new BigNumber('1.92')
    }

    const composable = new CCompositeSwap(poolSwapTwoDecimalPrecision)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    const hex = buffer.toBuffer().toString('hex')

    const buffer2 = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    const composable2 = new CCompositeSwap(buffer2)

    expect(composable2.toObject()).toStrictEqual(poolSwapTwoDecimalPrecision)
  })

  it('should bi-directional with seven digits precision for 0.00000003', () => {
    const poolSwapEightnDecimalPrecision = {
      ...compositeSwap,
      maxPrice: new BigNumber('0.00000003')
    }

    const composable = new CCompositeSwap(poolSwapEightnDecimalPrecision)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    const hex = buffer.toBuffer().toString('hex') // "17a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870000d6117e0300000017a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870200000000000000000300000000000000"

    const buffer2 = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    const composable2 = new CCompositeSwap(buffer2)

    expect(composable2.toObject()).toStrictEqual(poolSwapEightnDecimalPrecision)
  })

  it('should bi-directional with two digits precision for 2.0', () => {
    const poolSwapFromDivision = {
      ...compositeSwap,
      maxPrice: new BigNumber(100 / 50)
    }

    const composable = new CCompositeSwap(poolSwapFromDivision)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    const hex = buffer.toBuffer().toString('hex')
    const buffer2 = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    const composable2 = new CCompositeSwap(buffer2)

    expect(composable2.toObject()).toStrictEqual(poolSwapFromDivision)
  })

  it('should bi-directional with UInt64MAX', () => {
    const poolSwapUint64MAX = {
      ...compositeSwap,
      maxPrice: new BigNumber('18446744073709551615')
    }

    const composable = new CCompositeSwap(poolSwapUint64MAX)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    const hex = buffer.toBuffer().toString('hex') // "17a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870000d6117e0300000017a914c34ca9c54dc87e7e875b212ec6ba0704be3de5878702ffffffffffffffff0000000000000000"

    const buffer2 = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    const composable2 = new CCompositeSwap(buffer2)

    expect(composable2.toObject()).toStrictEqual(poolSwapUint64MAX)
  })

  it('should bi-directional with UInt64MAX HIGH precision', () => {
    const poolSwapUint64MAXHighPrecision = {
      ...compositeSwap,
      maxPrice: new BigNumber('18446744073709551615.99999999')
    }

    const composable = new CCompositeSwap(poolSwapUint64MAXHighPrecision)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    const hex = buffer.toBuffer().toString('hex') // "17a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870000d6117e0300000017a914c34ca9c54dc87e7e875b212ec6ba0704be3de5878702ffffffffffffffffffe0f50500000000"

    const buffer2 = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    const composable2 = new CCompositeSwap(buffer2)

    expect(composable2.toObject()).toStrictEqual(poolSwapUint64MAXHighPrecision)
  })

  it('should throw an error when more than 8 decimals', () => {
    const poolSwapNineDecimalPrecision = {
      ...compositeSwap,
      maxPrice: new BigNumber('1.999999999')
    }

    expect(() => {
      const composable = new CCompositeSwap(poolSwapNineDecimalPrecision)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)
    }).toThrow('Too many decimals to be correctly represented. Will lose precision with more than 8 decimals')
  })

  it.skip('should throw an error when reading more than 8 decimals from buffer', () => {
    const hex = '17a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870000d6117e0300000017a914c34ca9c54dc87e7e875b212ec6ba0704be3de5878702ffffffffffffffffffe0f505ffffffff'

    expect(() => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
      const composable = new CCompositeSwap(buffer)

      expect(composable.toObject()).toStrictEqual(compositeSwap)
    }).toThrow('Too many decimals read from buffer. Will lose precision with more than 8 decimals')
  })
})

describe('maxPrice inconsistency should parse from buffer into consistent variant regardless', () => {
  // both present the same DfTx
  const inconsistent = '6a4c4f446654786917a9141084ef98bacfecbc9f140496b26516ae55d79bfa870000e1f5050000000017a914bb7642fd3a9945fd75aff551d9a740768ac7ca7b87010000000000000000fcb9a6f002000000'
  const consistent = '6a4c4f446654786917a9141084ef98bacfecbc9f140496b26516ae55d79bfa870000e1f5050000000017a914bb7642fd3a9945fd75aff551d9a740768ac7ca7b87017e00000000000000fcfba10100000000'

  it('should be non bi-directional due to inconsistent buffer', () => {
    const stack = toOPCodes(SmartBuffer.fromBuffer(Buffer.from(inconsistent, 'hex')))
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).not.toStrictEqual(inconsistent)
    expect(buffer.toString('hex')).toStrictEqual(consistent)
  })

  it('should be bi-directional when using consistent buffer', () => {
    const stack = toOPCodes(SmartBuffer.fromBuffer(Buffer.from(consistent, 'hex')))
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(consistent)
  })

  it('inconsistent should parse as', () => {
    const stack = toOPCodes(SmartBuffer.fromBuffer(Buffer.from(inconsistent, 'hex')))

    const tx = (stack[1] as OP_DEFI_TX).tx as DfTx<CompositeSwap>
    expect(tx.type).toStrictEqual(0x69)
    expect(tx.data).toStrictEqual(expect.objectContaining({
      fromTokenId: 0,
      toTokenId: 1,
      fromAmount: new BigNumber(1),
      maxPrice: new BigNumber('126.2739302')
    }))
  })

  it('both should parse as', () => {
    const stackInconsistent = toOPCodes(SmartBuffer.fromBuffer(Buffer.from(inconsistent, 'hex')))
    const stackConsistent = toOPCodes(SmartBuffer.fromBuffer(Buffer.from(consistent, 'hex')))

    expect(stackConsistent).toStrictEqual(stackInconsistent)
  })
})
