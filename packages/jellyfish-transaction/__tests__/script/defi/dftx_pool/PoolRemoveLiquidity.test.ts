import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/defi'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { CPoolRemoveLiquidity, PoolRemoveLiquidity } from '../../../../src/script/defi/dftx_pool'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a2844665478721976a91402241c4fbe4ea2dbb8d655ea64076d134a852b3b88ac0603572dc918000000',
    '6a26446654787217a914f5fe3eba6fc3fb484eadf4ee6d3364a7c9bec19487053fd0317001000000',
    '6a26446654787217a914bbf8a34b35c82638a185bc782954c5f6b3676bbb8706402543971d000000',
    '6a26446654787217a9146cfc56cf3303a155f1ae6ca157169e7b42a07bf087044614d91100000000',
    '6a26446654787217a9140164e31629342622b35bc134c8e4fe7c45c42e438705c088058601000000',
    '6a26446654787217a9140dd111af010f5254516ed2498e75cbd11bb8b2e7870c55a4230500000000',
    '6a26446654787217a9143abf0fbb5a88323815b06fe793794e01484cf42f87067a76dbf41b000000',
    '6a26446654787217a9143abf0fbb5a88323815b06fe793794e01484cf42f8706668e2a690b000000',
    '6a26446654787217a9143abf0fbb5a88323815b06fe793794e01484cf42f8706b82356c305000000',
    '6a26446654787217a9143abf0fbb5a88323815b06fe793794e01484cf42f87067d3f3c0318000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x72)
  })
})

const header = '6a284466547872' // OP_RETURN, PUSH_DATA(44665478, 72)
const data = '1976a91402241c4fbe4ea2dbb8d655ea64076d134a852b3b88ac0603572dc918000000'
const poolRemoveLiquidity: PoolRemoveLiquidity = {
  tokenId: 6,
  script: {
    stack: [
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('02241c4fbe4ea2dbb8d655ea64076d134a852b3b'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ]
  },
  amount: new BigNumber('1064.54406915')
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_POOL_REMOVE_LIQUIDITY(poolRemoveLiquidity)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CPoolRemoveLiquidity(buffer)

    expect(composable.toObject()).toStrictEqual(poolRemoveLiquidity)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CPoolRemoveLiquidity(poolRemoveLiquidity)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
