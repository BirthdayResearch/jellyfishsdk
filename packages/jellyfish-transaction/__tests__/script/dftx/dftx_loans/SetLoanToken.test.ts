import { SmartBuffer } from 'smart-buffer'
import {
  CSetLoanToken,
  SetLoanToken
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * loan : {
     *    symbol: 'Token1',
     *    name: 'Token1',
     *    priceFeedId: {token: 'Token1', currency: 'USD'},
     *    mintable: true,
     *    interest: new BigNumber(0)
     * }
     */
    '6a27446654786706546f6b656e3106546f6b656e3106546f6b656e3103555344010000000000000000',
    /**
     * loan : {
     *    symbol: 'Token2',
     *    name: 'Token2',
     *    priceFeedId: {token: 'Token2', currency: 'USD'},
     *    mintable: false,
     *    interest: new BigNumber(0)
     * }
     */
    '6a27446654786706546f6b656e3206546f6b656e3206546f6b656e3203555344000000000000000000',
    /**
     * loan : {
     *    symbol: 'Token3',
     *    name: 'Token3',
     *    priceFeedId: {token: 'Token3', currency: 'USD'},
     *    mintable: true,
     *    interest: new BigNumber(12.345678)
     * }
     */
    '6a27446654786706546f6b656e3306546f6b656e3306546f6b656e3303555344017802964900000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x67)
  })
})

const header = '6a274466547867' // OP_RETURN(0x6a) (length 39 = 0x27) CDfTx.SIGNATURE(0x44665478) CSetLoanToken.OP_CODE(0x67)
const data = '06546f6b656e3306546f6b656e3306546f6b656e3303555344017802964900000000'
// SetLoanToken.symbol[BE](06546f6b656e33)
// SetLoanToken.name[BE](06546f6b656e33)
// SetLoanToken.priceFeedId[BE] (06546f6b656e3303555344)
// SetLoanToken.mintable(01)
// SetLoanToken.interest[LE](7802964900000000)

const setLoanToken: SetLoanToken = {
  symbol: 'Token3',
  name: 'Token3',
  currencyPair: { token: 'Token3', currency: 'USD' },
  mintable: true,
  interest: new BigNumber(12.345678)
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_SET_LOAN_TOKEN(setLoanToken)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CSetLoanToken(buffer)

    expect(composable.toObject()).toStrictEqual(setLoanToken)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CSetLoanToken(setLoanToken)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
