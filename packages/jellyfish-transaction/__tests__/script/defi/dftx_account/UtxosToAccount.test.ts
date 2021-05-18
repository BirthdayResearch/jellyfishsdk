import { SmartBuffer } from 'smart-buffer'
import { CUtxosToAccount, UtxosToAccount } from '../../../../src/script/defi/dftx_account'
import { OP_CODES, toBuffer, toOPCodes } from '../../../../src/script'
import BigNumber from 'bignumber.js'
import { OP_DEFI_TX } from '../../../../src/script/defi'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a2b44665478550117a91445903c2015cce2e8c3ac5fc13db388ccfd23d56387010000000059b8fa4004000000',
    '6a2b44665478550117a91445903c2015cce2e8c3ac5fc13db388ccfd23d5638701000000004e32624204000000',
    '6a2b44665478550117a914ea0e3fde9a9d281e348b3d05bc83d7da95eb631e8701000000004b44140000000000',
    '6a2d4466547855011976a9142d34be7852e3741b974bec9c49e3b99ee08b89d888ac0100000000d705140b00000000',
    '6a2b44665478550117a914462633e915dc1670f353568b8774da38c555bc2b87010000000074cab42901000000',
    '6a2b44665478550117a914f5fe3eba6fc3fb484eadf4ee6d3364a7c9bec194870100000000afce935200000000',
    '6a2b44665478550117a91469d2048d15b991eeebdd1e6b8391b5414da3ece58701000000009c81a20100000000',
    '6a2b44665478550117a91491b76ba9a57e3821ab4b623265f20ef551e6c4cd8701000000006fd1190000000000',
    '6a2b44665478550117a914a6adde29e5ebe8592cbf83fca196c0b363ad9278870100000000bcdc41eb04000000',
    '6a2b44665478550117a914a6adde29e5ebe8592cbf83fca196c0b363ad92788701000000005fa6480000000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x55)
  })
})

const header = '6a2b4466547855' // OP_RETURN 44665478 55
const data = '0117a91445903c2015cce2e8c3ac5fc13db388ccfd23d56387010000000059b8fa4004000000'
const utxosToAccount: UtxosToAccount = {
  to: [{
    balances: [
      {
        amount: new BigNumber('182.70042201'), token: 0
      }
    ],
    script: {
      stack: [
        OP_CODES.OP_HASH160,
        OP_CODES.OP_PUSHDATA_HEX_LE('45903c2015cce2e8c3ac5fc13db388ccfd23d563'),
        OP_CODES.OP_EQUAL
      ]
    }
  }]
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_UTXOS_TO_ACCOUNT(utxosToAccount)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CUtxosToAccount(buffer)
    expect(composable.toObject()).toEqual(utxosToAccount)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CUtxosToAccount(utxosToAccount)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
