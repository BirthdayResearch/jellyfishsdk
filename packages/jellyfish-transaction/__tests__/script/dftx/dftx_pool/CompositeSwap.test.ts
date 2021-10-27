import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { CCompositeSwap, OP_CODES, CompositeSwap } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a4c51446654786917a9140806eb42b6d5bb69726909fb6da34a9152afdf048701c7b3240d0000000017a9140806eb42b6d5bb69726909fb6da34a9152afdf048700ffffffffffffff7fffffffffffffff7f0105', // single pool id, can use simple poolswap instead
    '6a4c52446654786917a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870000d6117e0300000017a914c34ca9c54dc87e7e875b212ec6ba0704be3de58787022fe28e7915000080ffcf430300000000020102',
    '6a4c53446654786917a914635794bb3db157b6dac4dcb7467710a10f03c6ac8700809698000000000017a914582328ee9beebc3fb5844964302cc0fdbb27e04c87022fe28e7915000080ffcf43030000000003020406',
    '6a4c5444665478691976a9140b7127e943eaa3f28536c3f046ddbdeb790f691e88ac0080889e2a0100000017a914b3a65aa3fd9c60860bebd231d71b5bc5749ff5be87022fe28e7915000080ffcf430300000000020204' // longer swap info data
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

const header = '6a4c524466547869' // OP_RETURN, (length = 0x52), PUSH_DATA(44665478, 69)
const data = '17a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870000d6117e0300000017a914c34ca9c54dc87e7e875b212ec6ba0704be3de58787029a030000000000003088020200000000020204'

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
    const poolSwapTwoDecimalPrecision: CompositeSwap = {
      swapInfo: {
        ...compositeSwap.swapInfo,
        maxPrice: new BigNumber('1.92')
      },
      poolIDs: compositeSwap.poolIDs
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
      swapInfo: {
        ...compositeSwap.swapInfo,
        maxPrice: new BigNumber('0.00000003')
      },
      poolIDs: compositeSwap.poolIDs
    }

    const composable = new CCompositeSwap(poolSwapEightnDecimalPrecision)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    const hex = buffer.toBuffer().toString('hex') // "17a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870000d6117e0300000017a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870200000000000000000300000000000000"

    const buffer2 = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    const composable2 = new CCompositeSwap(buffer2)

    expect(composable2.toObject()).toStrictEqual(poolSwapEightnDecimalPrecision)
  })
})
