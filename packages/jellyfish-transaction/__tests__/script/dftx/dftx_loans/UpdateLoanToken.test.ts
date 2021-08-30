import { SmartBuffer } from 'smart-buffer'
import {
  CUpdateLoanToken,
  UpdateLoanToken
} from '../../../../src/script/dftx/dftx_loans'
import BigNumber from 'bignumber.js'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a4c5c446654786606546f6b656e3206546f6b656e327e3898b56a30cb108da910295abc45f77a376fbdf0521bf04bc52401cda4ac3e010000000000000000133d7a00d1068bf596729f9ae883c1c8b0d186a1a1bf0685e5467ea7dcb67f20'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x66)
  })
})

const header = '6a4c5c4466547866' // OP_RETURN, PUSH_DATA(44665478, 66)
const data = '06546f6b656e3206546f6b656e327e3898b56a30cb108da910295abc45f77a376fbdf0521bf04bc52401cda4ac3e010000000000000000133d7a00d1068bf596729f9ae883c1c8b0d186a1a1bf0685e5467ea7dcb67f20'

const updateLoanToken: UpdateLoanToken = {
  tokenTx: '207fb6dca77e46e58506bfa1a186d1b0c8c183e89a9f7296f58b06d1007a3d13',
  symbol: 'Token2',
  name: 'Token2',
  priceFeedId: '3eaca4cd0124c54bf01b52f0bd6f377af745bc5a2910a98d10cb306ab598387e',
  mintable: true,
  interest: new BigNumber(0)
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_UPDATE_LOAN_TOKEN(updateLoanToken)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CUpdateLoanToken(buffer)

    expect(composable.toObject()).toEqual(updateLoanToken)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CUpdateLoanToken(updateLoanToken)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
