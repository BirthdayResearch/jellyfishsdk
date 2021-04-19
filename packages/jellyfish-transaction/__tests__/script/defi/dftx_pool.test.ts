import { SmartBuffer } from 'smart-buffer'
import { CPoolSwap, PoolSwap } from '../../../src/script/defi/dftx_pool'
import { OP_CODES, toBuffer, toOPCodes } from '../../../src/script'
import BigNumber from 'bignumber.js'

describe('PoolSwap', () => {
  const header = '6a4c4f4466547873' // OP_RETURN, PUSH_DATA(44665478, 73)
  const data = '17a914c34ca9c54dc87e7e875b212ec6ba0704be3de587870000d6117e0300000017a914c34ca9c54dc87e7e875b212ec6ba0704be3de5878702ffffffffffffff7fffffffffffffff7f'
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
    maxPrice: {
      integer: new BigNumber('9223372036854775807'),
      fraction: new BigNumber('9223372036854775807')
    }
  }

  it('should bi-directional buffer-object-buffer', () => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(header + data, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(header + data)
  })

  it('should  craft dftx with OP_CODES.OP_DEFI_TX_POOL_SWAP', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_POOL_SWAP(poolSwap)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(header + data)
  })

  describe('CPoolSwap', () => {
    it('should compose from buffer to poolswap', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const cPoolSwap = new CPoolSwap(buffer)

      expect(cPoolSwap.toObject()).toEqual(poolSwap)
    })

    it('should compose from poolswap to buffer', () => {
      const cPoolSwap = new CPoolSwap(poolSwap)
      const buffer = new SmartBuffer()
      cPoolSwap.toBuffer(buffer)

      expect(buffer.toBuffer().toString('hex')).toEqual(data)
    })
  })
})
