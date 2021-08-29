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
    '6a2544665478373bb3380de375459bf71a0b2dd4c1b392365834a5f1fbebc929415d79efd31152',
    /**
     * offer : {
     *  offerTx: c0fa315153d7ea573dd430964213a5a0216c27cc5f7156486411162a4caf8e78,
     * }
     */
    '6a254466547837788eaf4c2a1611644856715fcc276c21a0a513429630d43d57ead7535131fac0',
    /**
     * offer : {
     *  offerTx: 50e42d755e413dc152da9f1775720ba7c95930b51c0ac2f6edd790c0e36d8aaa,
     * }
     */
    '6a254466547837aa8a6de3c090d7edf6c20a1cb53059c9a70b7275179fda52c13d415e752de450'
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
  const header = '6a254466547837' // OP_RETURN(0x6a) (length 37 = 0x25) CDfTx.SIGNATURE(0x44665478) CICXCloseOffer.OP_CODE(0x37)
  const data = '3bb3380de375459bf71a0b2dd4c1b392365834a5f1fbebc929415d79efd31152' // ICXCloseOffer.offerTx[LE](0x5211d3ef795d4129c9ebfbf1a534583692b3c1d42d0b1af79b4575e30d38b33b)
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
