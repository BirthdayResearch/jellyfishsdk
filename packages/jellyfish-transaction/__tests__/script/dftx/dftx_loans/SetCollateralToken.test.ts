import { SmartBuffer } from 'smart-buffer'
import {
  CSetCollateralToken,
  SetCollateralToken
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * loan : {
     *    token: '1',
     *    factor: new BigNumber(0.1),
     *    priceFeedId: {token: 'Token1', currency: 'USD'}
     *    activateAfterBlock: 0
     * }
     */
    '6a1d446654786301809698000000000006546f6b656e310355534400000000',
    /**
     * loan : {
     *    token: '1',
     *    factor: new BigNumber(0.1),
     *    priceFeedId: {token: 'Token1', currency: 'USD'}
     *    activateAfterBlock: 130
     * }
     */
    '6a1d446654786301809698000000000006546f6b656e310355534482000000',
    /**
     * loan : {
     *    token: '2',
     *    factor: new BigNumber(0.2),
     *    priceFeedId: {token: 'Token2', currency: 'USD'}
     *    activateAfterBlock: 140
     * }
     */
    '6a1d446654786302002d31010000000006546f6b656e32035553448c000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x63)
  })
})

describe('SetCollateralToken', () => {
  const header = '6a1d4466547863' // OP_RETURN(0x6a) (length 29 = 0x1d) CDfTx.SIGNATURE(0x44665478) CSetCollateralToken.OP_CODE(0x63)
  // SetCollateralToken.token[LE](01)
  // SetCollateralToken.factor[LE](8096980000000000)
  // SetCollateralToken.priceFeedId[BE] (06546f6b656e3103555344)
  // SetCollateralToken.activateAfterBlock[LE] (82000000)
  const data = '01809698000000000006546f6b656e310355534482000000'
  const setCollateralToken: SetCollateralToken = {
    token: 1,
    factor: new BigNumber(0.1),
    currencyPair: { token: 'Token1', currency: 'USD' },
    activateAfterBlock: 130
  }

  it('should craft dftx with OP_CODES._()', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_SET_COLLATERAL_TOKEN(setCollateralToken)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CSetCollateralToken(buffer)

      expect(composable.toObject()).toStrictEqual(setCollateralToken)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CSetCollateralToken(setCollateralToken)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)

      expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
    })
  })
})
