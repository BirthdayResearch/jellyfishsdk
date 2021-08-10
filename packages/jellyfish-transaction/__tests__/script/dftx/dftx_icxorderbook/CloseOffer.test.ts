import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { CICXCloseOffer, ICXCloseOffer } from '../../../../src/script/dftx/dftx_icxorderbook'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * offer : {
     *  offerTx: 5211d3ef795d4129c9ebfbf1a534583692b3c1d42d0b1af79b4575e30d38b33b,
     * }
     */
    '6a2544665478373bb3380de375459bf71a0b2dd4c1b392365834a5f1fbebc929415d79efd31152'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x37)
  })
})

describe('CloseOffer', () => {
  const header = '6a254466547837' // OP_RETURN PUSH_DATA(44665478, 37)
  const data = '3bb3380de375459bf71a0b2dd4c1b392365834a5f1fbebc929415d79efd31152'
  const closeOffer: ICXCloseOffer = {
    offerTx: '5211d3ef795d4129c9ebfbf1a534583692b3c1d42d0b1af79b4575e30d38b33b'
  }

  it('should craft dftx with OP_CODES._()', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_ICX_CLOSE_OFFER(closeOffer)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CICXCloseOffer(buffer)
      expect(composable.toObject()).toStrictEqual(closeOffer)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CICXCloseOffer(closeOffer)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)

      expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
    })
  })
})
