import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/defi'
import { CTokenUpdate, TokenUpdate } from '../../../../src/script/defi/dftx_token'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    // regtest fixtures
    // 1 fixture as only 'isDAT' flag modification allowed before Bayfront fork
    // and only 'UpdateToken' is triggered while before Bayfront fork
    // https://github.com/DeFiCh/ain/blob/c7b13959cc84c6d6210927b0e2377432c0dcadeb/src/masternodes/rpc_tokens.cpp#L278
    '6a26446654784effe50b27cd4325e9a87401e833a9caccf256e0b4ea37b6c4fb038bedc1cb247100'

    // Note(canonbrother): isDAT is not updated after modified
  ]

  fixtures.forEach(hex => {
    const stack: any = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x4e)
  })
})

const header = '6a37446654784e' // OP_RETURN, PUSH_DATA(44665478, 4e)
const data = 'ffe50b27cd4325e9a87401e833a9caccf256e0b4ea37b6c4fb038bedc1cb247100'
const tokenUpdate: TokenUpdate = {
  isDAT: false,
  creationTx: 'ffe50b27cd4325e9a87401e833a9caccf256e0b4ea37b6c4fb038bedc1cb2471'
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_TOKEN_UPDATE(tokenUpdate)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CTokenUpdate(buffer)

    expect(composable.toObject()).toEqual(tokenUpdate)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CTokenUpdate(tokenUpdate)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
