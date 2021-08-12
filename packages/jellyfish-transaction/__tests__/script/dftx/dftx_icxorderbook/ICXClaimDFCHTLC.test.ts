import { SmartBuffer } from 'smart-buffer'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { CICXClaimDFCHTLC, ICXClaimDFCHTLC } from '../../../../src/script/dftx/dftx_icxorderbook'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a464466547835da660ff1965fbdce08cf5ae1b75178abd6a9882d3206e0bf3a1fc7abd1ba969a20f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x35)
  })
})

const header = '6a464466547835' // OP_RETURN(0x6a) (length 70 = 0x46) CDfTx.SIGNATURE(0x44665478) CICXClaimDFCHTLC.OP_CODE(0x35)
// ICXClaimDFCHTLC.dfcHTLCTx[LE](0xda660ff1965fbdce08cf5ae1b75178abd6a9882d3206e0bf3a1fc7abd1ba969a) ICXClaimDFCHTLC.seed(0x20f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef)
const data = 'da660ff1965fbdce08cf5ae1b75178abd6a9882d3206e0bf3a1fc7abd1ba969a20f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef'

const claimDFCHTLC: ICXClaimDFCHTLC = {
  dfcHTLCTx: '9a96bad1abc71f3abfe006322d88a9d6ab7851b7e15acf08cebd5f96f10f66da',
  seed: 'f75a61ad8f7a6e0ab701d5be1f5d4523a9b534571e4e92e0c4610c6a6784ccef'
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_ICX_CLAIM_DFC_HTLC(claimDFCHTLC)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CICXClaimDFCHTLC(buffer)

    expect(composable.toObject()).toEqual(claimDFCHTLC)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CICXClaimDFCHTLC(claimDFCHTLC)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
