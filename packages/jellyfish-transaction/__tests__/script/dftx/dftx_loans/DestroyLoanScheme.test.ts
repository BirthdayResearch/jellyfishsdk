import { SmartBuffer } from 'smart-buffer'
import {
  CDestroyLoanScheme,
  DestroyLoanScheme
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * loan : {
     *   identifier: 'scheme1',
     *   height: new BigNumber(0)
     * }
     */
    '6a15446654784407736368656d65310000000000000000',
    /**
     * loan : {
     *   identifier: 'scheme2',
     *   height: new BigNumber(140)
     * }
     */
    '6a15446654784407736368656d65328c00000000000000',
    /**
     * loan : {
     *   identifier: 'scheme3',
     *   height: new BigNumber(150)
     * }
     */
    '6a15446654784407736368656d65339600000000000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x44)
  })
})

const header = '6a154466547844' // OP_RETURN(0x6a) (length 21 = 0x15) CDfTx.SIGNATURE(0x44665478) CDestroyLoanScheme.OP_CODE(0x44)
// DestroyLoanScheme.identifier[BE](07736368656d6532)
// DestroyLoanScheme.height[LE](8c00000000000000)
const data = '07736368656d65328c00000000000000'
const destroyLoanScheme: DestroyLoanScheme = {
  identifier: 'scheme2',
  height: new BigNumber(140)
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_DESTROY_LOAN_SCHEME(destroyLoanScheme)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CDestroyLoanScheme(buffer)

    expect(composable.toObject()).toStrictEqual(destroyLoanScheme)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CDestroyLoanScheme(destroyLoanScheme)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
