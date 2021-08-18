import { SmartBuffer } from 'smart-buffer'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { CICXSubmitDFCHTLC, ICXSubmitDFCHTLC } from '../../../../src/script/dftx/dftx_icxorderbook'
import { BigNumber } from '@defichain/jellyfish-json'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a4c514466547833d13ee165fbd163c95d2dff1a36d80d5e342603fb5640e4657719476d313d704900ca9a3b0000000020521a24e5418c971da262215bd30bd79f52611a63e038295b603f64fdc07f95a0050000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x33)
  })
})

const header = '6a4c514466547833' // OP_RETURN(0x6a) OP_PUSHDATA1(0x4c) (length 81 = 0x51) CDfTx.SIGNATURE(0x44665478) CICXSubmitDFCHTLC.OP_CODE(0x33)
// ICXSubmitDFCHTLC.offerTx[LE](0xd13ee165fbd163c95d2dff1a36d80d5e342603fb5640e4657719476d313d7049) ICXSubmitDFCHTLC.amount(0x00ca9a3b00000000)
// ICXSubmitDFCHTLC.hash[LE](0x20521a24e5418c971da262215bd30bd79f52611a63e038295b603f64fdc07f95) ICXSubmitDFCHTLC.timeout(0xa0050000)
const data = 'd13ee165fbd163c95d2dff1a36d80d5e342603fb5640e4657719476d313d704900ca9a3b0000000020521a24e5418c971da262215bd30bd79f52611a63e038295b603f64fdc07f95a0050000'

const submitDFCHTLC: ICXSubmitDFCHTLC = {
  offerTx: '49703d316d47197765e44056fb0326345e0dd8361aff2d5dc963d1fb65e13ed1',
  amount: new BigNumber(10),
  hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
  timeout: 1440
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_ICX_SUBMIT_DFC_HTLC(submitDFCHTLC)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CICXSubmitDFCHTLC(buffer)

    expect(composable.toObject()).toEqual(submitDFCHTLC)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CICXSubmitDFCHTLC(submitDFCHTLC)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
