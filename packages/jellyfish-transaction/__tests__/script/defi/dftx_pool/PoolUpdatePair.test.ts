import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/defi'
import { CPoolUpdatePair, PoolUpdatePair } from '../../../../src/script/defi/dftx_pool'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    // regtest fixtures
    // height >= ClarkeQuayHeight (encoding includes customRewards)
    // status, commission
    '6a144466547875020000000100e1f505000000000000',
    // ownerAddress
    '6a2b44665478750200000000ffffffffffffffff17a91440d54b7a72387cb5c6d0125f2890eabf052f01908700',
    // customRewards 2 tokens
    '6a2c44665478750200000000ffffffffffffffff00020000000000e1f505000000000100000000a3e11100000000',
    // customRewards 1 token
    '6a2044665478750200000000ffffffffffffffff0001000000000008af2f00000000',
    // all
    '6a434466547875020000000120a107000000000017a914fd190704714762e6c30eb5b39071c1a52e6130ad87020000000000ca9a3b00000000010000000094357700000000',

    // height < ClarkeQuayHeight (exclude customRewards from being encoded)
    // all
    '6a2a44665478750300000001c0cf6a000000000017a9141205616a55fbbdd91ec97e222fae709acc4fd2c887'
  ]

  fixtures.forEach(hex => {
    const stack: any = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x75)
    expect(buffer.toString('hex')).toBe(hex)
  })
})

const header = '6a434466547875' // OP_RETURN, PUSH_DATA(44665478, 75)
const data = '020000000120a107000000000017a914fd190704714762e6c30eb5b39071c1a52e6130ad87020000000000ca9a3b00000000010000000094357700000000'
const poolUpdatePair: PoolUpdatePair = {
  poolId: 2,
  status: true,
  commission: new BigNumber('0.005'),
  ownerAddress: {
    stack: [
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('fd190704714762e6c30eb5b39071c1a52e6130ad'),
      OP_CODES.OP_EQUAL
    ]
  },
  customRewards: [
    { token: 0, amount: new BigNumber('10') },
    { token: 1, amount: new BigNumber('20') }
  ]
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_POOL_UPDATE_PAIR(poolUpdatePair)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CPoolUpdatePair(buffer)

    expect(composable.toObject()).toEqual(poolUpdatePair)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CPoolUpdatePair(poolUpdatePair)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
