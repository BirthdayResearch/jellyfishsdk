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
     *    priceFeedId: 1aebaa5def9093a82dabeeb34f3ec29cc41db50229fd24a2793d5b8dfbc2e8b3
     *    activateAfterBlock: new BigNumber(0)
     * }
     */
    '6a324466547863018096980000000000b3e8c2fb8d5b3d79a224fd2902b51dc49cc23e4fb3eeab2da89390ef5daaeb1a00000000',
    /**
     * loan : {
     *    token: '1',
     *    factor: new BigNumber(0.1),
     *    priceFeedId: 1aebaa5def9093a82dabeeb34f3ec29cc41db50229fd24a2793d5b8dfbc2e8b3
     *    activateAfterBlock: new BigNumber(130)
     * }
     */
    '6a324466547863018096980000000000b3e8c2fb8d5b3d79a224fd2902b51dc49cc23e4fb3eeab2da89390ef5daaeb1a82000000',
    /**
     * loan : {
     *    token: '2',
     *    factor: new BigNumber(0.2),
     *    priceFeedId: 9f93d1d056c79082d8fee54079d38b986ca78654f84c90a97335a71df390e50d
     *    activateAfterBlock: new BigNumber(140)
     * }
     */
    '6a32446654786302002d3101000000000de590f31da73573a9904cf85486a76c988bd37940e5fed88290c756d0d1939f8c000000'
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
  const header = '6a324466547863' // OP_RETURN(0x6a) (length 32 = 0x20) CDfTx.SIGNATURE(0x44665478) CSetCollateralToken.OP_CODE(0x63)
  // SetCollateralToken.token[LE](01)
  // SetCollateralToken.factor[LE](8096980000000000)
  // SetCollateralToken.priceFeedId[LE] (b3e8c2fb8d5b3d79a224fd2902b51dc49cc23e4fb3eeab2da89390ef5daaeb1a)
  // SetCollateralToken.activateAfterBlock[LE] (82000000)
  const data = '018096980000000000b3e8c2fb8d5b3d79a224fd2902b51dc49cc23e4fb3eeab2da89390ef5daaeb1a82000000'
  const setCollateralToken: SetCollateralToken = {
    token: 1,
    factor: new BigNumber('0.1'),
    priceFeedId: '1aebaa5def9093a82dabeeb34f3ec29cc41db50229fd24a2793d5b8dfbc2e8b3',
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
