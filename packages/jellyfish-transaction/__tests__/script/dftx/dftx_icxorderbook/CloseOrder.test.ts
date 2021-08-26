import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { CICXCloseOrder, ICXCloseOrder } from '../../../../src/script/dftx/dftx_icxorderbook'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * closeOrder: {
     *    "orderTx": "5211d3ef795d4129c9ebfbf1a534583692b3c1d42d0b1af79b4575e30d38b33b"
     * }
     */
    '6a2544665478363bb3380de375459bf71a0b2dd4c1b392365834a5f1fbebc929415d79efd31152',
    /**
     * closeOrder: {
     *    "orderTx": "6eea5d13d23565e3f4553853694aba7dfff6a000621024e60a11f07b64861db5"
     * }
     */
    '6a254466547836b51d86647bf0110ae624106200a0f6ff7dba4a69533855f4e36535d2135dea6e',
    /**
     * closeOrder: {
     *    "orderTx": "33c5647b20a62cd8bac0b9f59741a03c803ec56adaa6ac6357c3160bb5889de4"
     * }
     */
    '6a254466547836e49d88b50b16c35763aca6da6ac53e803ca04197f5b9c0bad82ca6207b64c533'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x36)
  })
})

describe('CloseOrder', () => {
  const header = '6a254466547836' // OP_RETURN(0x6a) (length 37 = 0x25) CDfTx.SIGNATURE(0x44665478) CICXCloseOrder.OP_CODE(0x36)
  const data = '3bb3380de375459bf71a0b2dd4c1b392365834a5f1fbebc929415d79efd31152' // ICXCloseOrder.orderTx[BE](0x5211d3ef795d4129c9ebfbf1a534583692b3c1d42d0b1af79b4575e30d38b33b)
  const closeOrder: ICXCloseOrder = {
    orderTx: '5211d3ef795d4129c9ebfbf1a534583692b3c1d42d0b1af79b4575e30d38b33b'
  }

  it('should craft dftx with OP_CODES._()', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_ICX_CLOSE_ORDER(closeOrder)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CICXCloseOrder(buffer)
      expect(composable.toObject()).toStrictEqual(closeOrder)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CICXCloseOrder(closeOrder)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)

      expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
    })
  })
})
