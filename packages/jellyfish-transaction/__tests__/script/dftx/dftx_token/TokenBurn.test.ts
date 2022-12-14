import { SmartBuffer } from 'smart-buffer'
import { TokenBalanceUInt32 } from '../../../../src/script/dftx'
import { CTokenBurn } from '../../../../src/script/dftx/dftx_token'
import { OP_CODES } from '../../../../src/script'
import { toBuffer } from '../../../../src/script/_buffer'
import BigNumber from 'bignumber.js'

const header = '6a2f4466547846'
const data = '010100000000e1f50500000000160014dea80af07d6df7fa45b1066cd0e7e3a2a2a9053a000000000000'

const tokenBalance: TokenBalanceUInt32 = {
  token: 1,
  amount: new BigNumber('1')
}
const tokenBurn = {
  amounts: [tokenBalance],
  from: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('dea80af07d6df7fa45b1066cd0e7e3a2a2a9053a')
    ]
  },
  burnType: 0,
  context: {
    stack: []
  }
}

it('should craft dftx with OP_CODES._() for burning tokens without context', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_TOKEN_BURN(tokenBurn)
  ]
  const buffer = toBuffer(stack)

  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CTokenBurn(buffer)

    expect(composable.toObject()).toStrictEqual(tokenBurn)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CTokenBurn(tokenBurn)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
