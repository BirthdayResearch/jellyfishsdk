import { SmartBuffer } from 'smart-buffer'
import {
  CUpdateLoanToken,
  UpdateLoanToken
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * loan : {
     *    symbol: 'Token2',
     *    name: 'Token2',
     *    currencyPair: { token: 'Token2', currency: 'USD' },
     *    mintable: true,
     *    interest: new BigNumber(0)
     *    tokenTx: '207fb6dca77e46e58506bfa1a186d1b0c8c183e89a9f7296f58b06d1007a3d13',
     * }
     */
    '6a47446654786606546f6b656e3206546f6b656e3206546f6b656e3203555344010000000000000000133d7a00d1068bf596729f9ae883c1c8b0d186a1a1bf0685e5467ea7dcb67f20',
    /**
     * loan : {
     *    symbol: 'Token3',
     *    name: 'Token3',
     *    currencyPair: { token: 'Token3', currency: 'USD' },
     *    mintable: false,
     *    interest: new BigNumber(0)
     *    tokenTx: '207fb6dca77e46e58506bfa1a186d1b0c8c183e89a9f7296f58b06d1007a3d13',
     * }
     */
    '6a47446654786606546f6b656e3306546f6b656e3306546f6b656e3303555344000000000000000000133d7a00d1068bf596729f9ae883c1c8b0d186a1a1bf0685e5467ea7dcb67f20',
    /**
     * loan : {
     *    symbol: 'Token4',
     *    name: 'Token4',
     *    currencyPair: { token: 'Token4', currency: 'USD' },
     *    mintable: true,
     *    interest: new BigNumber(12.345678)
     *    tokenTx: '207fb6dca77e46e58506bfa1a186d1b0c8c183e89a9f7296f58b06d1007a3d13',
     * }
     */
    '6a47446654786606546f6b656e3406546f6b656e3406546f6b656e3403555344017802964900000000133d7a00d1068bf596729f9ae883c1c8b0d186a1a1bf0685e5467ea7dcb67f20'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x66)
  })
})

const header = '6a474466547866' // OP_RETURN(0x6a) (length 71 = 0x47) CDfTx.SIGNATURE(0x44665478) CSetLoanToken.OP_CODE(0x66)
const data = '06546f6b656e3406546f6b656e3406546f6b656e3403555344017802964900000000133d7a00d1068bf596729f9ae883c1c8b0d186a1a1bf0685e5467ea7dcb67f20'
// UpdateLoanToken.symbol[BE](06546f6b656e34)
// UpdateLoanToken.name[BE](06546f6b656e34)
// UpdateLoanToken.currencyPair[BE] (06546f6b656e3403555344)
// UpdateLoanToken.mintable(01)
// UpdateLoanToken.interest[LE](7802964900000000)
// UpdateLoanToken.tokenTx[LE](133d7a00d1068bf596729f9ae883c1c8b0d186a1a1bf0685e5467ea7dcb67f20)
const updateLoanToken: UpdateLoanToken = {
  symbol: 'Token4',
  name: 'Token4',
  currencyPair: { token: 'Token4', currency: 'USD' },
  mintable: true,
  interest: new BigNumber(12.345678),
  tokenTx: '207fb6dca77e46e58506bfa1a186d1b0c8c183e89a9f7296f58b06d1007a3d13'
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_UPDATE_LOAN_TOKEN(updateLoanToken)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CUpdateLoanToken(buffer)

    expect(composable.toObject()).toStrictEqual(updateLoanToken)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CUpdateLoanToken(updateLoanToken)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
