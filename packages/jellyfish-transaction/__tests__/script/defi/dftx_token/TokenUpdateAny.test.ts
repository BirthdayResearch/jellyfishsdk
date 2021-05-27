import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/defi'
import { CTokenUpdateAny, TokenUpdateAny } from '../../../../src/script/defi/dftx_token'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    // regtest fixtures
    '6a37446654786ed819f622ced3616e3c02e5337b54cbf921c364e182a80925219e1f60461ee5fc034341540343415408000000000000000001'
  ]

  fixtures.forEach(hex => {
    const stack: any = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x6e)
  })
})

const header = '6a37446654786e' // OP_RETURN, PUSH_DATA(44665478, 6e)
const data = 'd819f622ced3616e3c02e5337b54cbf921c364e182a80925219e1f60461ee5fc034341540343415408000000000000000007'
const tokenUpdateAny: TokenUpdateAny = {
  symbol: 'CAT',
  name: 'CAT',
  decimal: 8,
  limit: new BigNumber('0'),
  mintable: true,
  tradeable: true,
  isDAT: true,
  creationTx: 'd819f622ced3616e3c02e5337b54cbf921c364e182a80925219e1f60461ee5fc'
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_TOKEN_UPDATE_ANY(tokenUpdateAny)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CTokenUpdateAny(buffer)

    expect(composable.toObject()).toEqual(tokenUpdateAny)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CTokenUpdateAny(tokenUpdateAny)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
