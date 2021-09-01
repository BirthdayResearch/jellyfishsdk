import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { CTokenCreate, TokenCreate } from '../../../../src/script/dftx/dftx_token'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import BigNumber from 'bignumber.js'

/**
 * using createToken sample from
 * https://explorer.defichain.com/#/DFI/mainnet/tx/8a5066b4ea77c8d0b705ba94f47585f944ae587700f0f43f8655d01f38921f40
 * https://explorer.defichain.com/#/DFI/mainnet/tx/baeddea27199a9e9001133f18942353dc79a765f0c437a1eda550f7675dc6b8b
 * https://explorer.defichain.com/#/DFI/mainnet/tx/11fb90953bbd2a8f8649c116e6071dc73d428c5eba97c5a4a6dac550df2ab78c
 */
it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a1b44665478540342544307426974636f696e08000000000000000003',
    '6a19446654785404474f4c4404476f6c6408000000000000000003',
    '6a224466547854035753420e77616c6c7374726565746265747308000000000000000003',

    // regtest fixtures
    '6a174466547854034748490347484908000000000000000004',
    '6a174466547854034a4b4c034a4b4c08000000000000000000',
    '6a174466547854034d4e4f034d4e4f08000000000000000001',
    '6a174466547854035051520350515208000000000000000007',
    '6a174466547854034142430341424308000000000000000005'
  ]

  fixtures.forEach(hex => {
    const stack: any = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x54)
  })
})

const header = '6a224466547854' // OP_RETURN, PUSH_DATA(44665478, 54)
const data = '035753420e77616c6c7374726565746265747308000000000000000003'
const tokenCreate: TokenCreate = {
  symbol: 'WSB',
  name: 'wallstreetbets',
  decimal: 8,
  limit: new BigNumber('0'),
  mintable: true,
  tradeable: true,
  isDAT: false
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_TOKEN_CREATE(tokenCreate)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CTokenCreate(buffer)

    expect(composable.toObject()).toStrictEqual(tokenCreate)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CTokenCreate(tokenCreate)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
