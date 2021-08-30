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
     *    priceFeedId: 6d98cfa8b62b9ebe7cfbdf9f533949bea5bd18a8fd3d33d6aa49c1ad6bec15ce
     *    mintable: true,
     *    interest: new BigNumber(0)
     * }
     */
    '6a3c446654786706546f6b656e3106546f6b656e31ce15ec6badc149aad6333dfda818bda5be4939539fdffb7cbe9e2bb6a8cf986d010000000000000000',
    /**
     * loan : {
     * symbol: 'Token2',
     * name: 'Token2',
     * priceFeedId: 6d98cfa8b62b9ebe7cfbdf9f533949bea5bd18a8fd3d33d6aa49c1ad6bec15ce
     * mintable: false,
     * interest: new BigNumber(0)
     * }
     */
    '6a3c446654786706546f6b656e3206546f6b656e32ce15ec6badc149aad6333dfda818bda5be4939539fdffb7cbe9e2bb6a8cf986d000000000000000000',
    /**
     * loan : {
     * symbol: 'Token3',
     * name: 'Token3',
     * priceFeedId：6d98cfa8b62b9ebe7cfbdf9f533949bea5bd18a8fd3d33d6aa49c1ad6bec15ce
     * mintable: true,
     * interest: new BigNumber(12345)
     * }
     */
    '6a3c446654786706546f6b656e3306546f6b656e33ce15ec6badc149aad6333dfda818bda5be4939539fdffb7cbe9e2bb6a8cf986d010019ef6d1f010000'
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

const header = '6a3c4466547867' // OP_RETURN(0x6a) (length 60 = 0x3c) CDfTx.SIGNATURE(0x44665478) CSetLoanToken.OP_CODE(0x67)
const data = '06546f6b656e3106546f6b656e31ce15ec6badc149aad6333dfda818bda5be4939539fdffb7cbe9e2bb6a8cf986d010000000000000000'
// SetLoanToken.symbol[BE](06546f6b656e31)
// SetLoanToken.name[BE](06546f6b656e31)
// SetLoanToken.priceFeedId[LE] (ce15ec6badc149aad6333dfda818bda5be4939539fdffb7cbe9e2bb6a8cf986d)
// SetLoanToken.mintable (01)
// SetLoanToken.interest (0000000000000000)

const setLoanToken: SetLoanToken = {
  symbol: 'Token1',
  name: 'Token1',
  priceFeedId: '6d98cfa8b62b9ebe7cfbdf9f533949bea5bd18a8fd3d33d6aa49c1ad6bec15ce',
  mintable: true,
  interest: new BigNumber(0)
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
