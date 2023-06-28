import { SmartBuffer } from 'smart-buffer'
import { CEvmTx, EvmTx, OP_DEFI_TX } from '../../../../src/script/dftx'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_CODES } from '../../../../src'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
      6a - OP_RETURN
      4c - OP_PUSHDATA1
      74 - length
      44665478 - dftx
      39 - txtype
      6e - length
      f86c808504e3b292008252089494c2acef73afe7409220af7aab48f0add9e4e7ee880de0b6b3a76400008026a0be7b6f57bf2c838a48fa6e666945994b3b6f386c92f1523667c8c50f753e63c0a018226da7216224a0217bbe186a456eb943ca8bcbef3d7421d544d6fcb9ab2479 -- signed evm tx
     */
    '6a4c7444665478396ef86c808504e3b292008252089494c2acef73afe7409220af7aab48f0add9e4e7ee880de0b6b3a76400008026a0be7b6f57bf2c838a48fa6e666945994b3b6f386c92f1523667c8c50f753e63c0a018226da7216224a0217bbe186a456eb943ca8bcbef3d7421d544d6fcb9ab2479',
    '6a4c7444665478396ef86c018504e3b2920082520894585bd64cf6574abf77f216efc894940e87cad5b1880de0b6b3a76400008026a035e16fa88aa4a1d01990c3b6acb0e6d869fe4d5960992490814f65e063ba3ed7a0401a72637c21501313e1a5c8b03cd1031ea7823085c6a8f6d388caf078027d7b'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x39)
  })
})

const evmTxData: Array<{ header: string, data: string, evmTx: EvmTx }> = [
  {
    // data with context
    header: '6a4c744466547839', // OP_RETURN(6a) OP_PUSHDATA1(4c) (length 74) CDfTx.SIGNATURE(44665478) CEvmTx.OP_CODE(39)
    data: '6ef86c808504e3b292008252089494c2acef73afe7409220af7aab48f0add9e4e7ee880de0b6b3a76400008026a0be7b6f57bf2c838a48fa6e666945994b3b6f386c92f1523667c8c50f753e63c0a018226da7216224a0217bbe186a456eb943ca8bcbef3d7421d544d6fcb9ab2479',
    evmTx: {
      raw: 'f86c808504e3b292008252089494c2acef73afe7409220af7aab48f0add9e4e7ee880de0b6b3a76400008026a0be7b6f57bf2c838a48fa6e666945994b3b6f386c92f1523667c8c50f753e63c0a018226da7216224a0217bbe186a456eb943ca8bcbef3d7421d544d6fcb9ab2479'
    }
  },
  {
    header: '6a4c744466547839', // OP_RETURN(6a) OP_PUSHDATA1(4c) (length 74) CDfTx.SIGNATURE(44665478) CEvmTx.OP_CODE(39)
    data: '6ef86c018504e3b2920082520894585bd64cf6574abf77f216efc894940e87cad5b1880de0b6b3a76400008026a035e16fa88aa4a1d01990c3b6acb0e6d869fe4d5960992490814f65e063ba3ed7a0401a72637c21501313e1a5c8b03cd1031ea7823085c6a8f6d388caf078027d7b',
    evmTx: {
      raw: 'f86c018504e3b2920082520894585bd64cf6574abf77f216efc894940e87cad5b1880de0b6b3a76400008026a035e16fa88aa4a1d01990c3b6acb0e6d869fe4d5960992490814f65e063ba3ed7a0401a72637c21501313e1a5c8b03cd1031ea7823085c6a8f6d388caf078027d7b'
    }
  }
]

describe.each(evmTxData)('should craft and compose dftx',
  ({ header, data, evmTx }: { header: string, data: string, evmTx: EvmTx }) => {
    it('should craft dftx with OP_CODES._() for evm tx', () => {
      const stack = [
        OP_CODES.OP_RETURN,
        OP_CODES.OP_DEFI_TX_EVM_TX(evmTx)
      ]

      const buffer = toBuffer(stack)
      expect(buffer.toString('hex')).toStrictEqual(header + data)
    })

    describe('Composable', () => {
      it('should compose from buffer to composable', () => {
        const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
        const composable = new CEvmTx(buffer)

        expect(composable.toObject()).toStrictEqual(evmTx)
      })

      it('should compose from composable to buffer', () => {
        const composable = new CEvmTx(evmTx)
        const buffer = new SmartBuffer()
        composable.toBuffer(buffer)

        expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
      })
    })
  })
