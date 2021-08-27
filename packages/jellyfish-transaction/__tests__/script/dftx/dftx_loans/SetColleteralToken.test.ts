import { SmartBuffer } from 'smart-buffer'
import {
  CSetCollateralToken,
  SetCollateralToken
} from '../../../../src/script/dftx/dftx_loans'
import BigNumber from 'bignumber.js'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a3244665478630180969800000000000f3017ef8d0d16cd6eda7d1175127e080840b4412f536640ecf1941bf2115b2000000000',
    '6a32446654786302002d310100000000a3bb0a79535419d32e31b7a3e372641174b284dde563c5cecbfd1d63dfc8904500000000',
    '6a3244665478630380c3c901000000008323af58991a638d12021143b8fff77d20681c43cd2ce1874f003183b047ff0800000000',
    '6a3244665478630180969800000000000f3017ef8d0d16cd6eda7d1175127e080840b4412f536640ecf1941bf2115b2082000000',
    '6a32446654786302002d310100000000a3bb0a79535419d32e31b7a3e372641174b284dde563c5cecbfd1d63dfc890458c000000',
    '6a3244665478630380c3c901000000008323af58991a638d12021143b8fff77d20681c43cd2ce1874f003183b047ff0896000000'
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

const header = '6a324466547863' // OP_RETURN, PUSH_DATA(44665478, 63)
const data = '0180969800000000000f3017ef8d0d16cd6eda7d1175127e080840b4412f536640ecf1941bf2115b2000000000'

const setCollateralToken: SetCollateralToken = {
  token: 1,
  factor: new BigNumber('0.1'),
  priceFeedId: 'c92c2cdb22e81577b66c08578d0d803acee79b06f40986d8bc93d28c124559f6',
  activateAfterBlock: 0
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
