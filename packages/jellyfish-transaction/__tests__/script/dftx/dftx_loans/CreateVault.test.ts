import { SmartBuffer } from 'smart-buffer'
import {
  CCreateVault,
  CreateVault
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * loan : {
     *   ownerAddress: 'bcrt1q0uajendn9xpv87jnsqgjmlad3fne9wagcxjdt2',
     *   schemeId: 'scheme1'
     * }
     */
    '6a2444665478561600147f3b2ccdb32982c3fa5380112dffad8a6792bba807736368656d6531',
    /**
     * loan : {
     *   ownerAddress: 'bcrt1q3m9fqnq7fw4jcusjjwxt39egws2njd24xa5e4c',
     *   schemeId: 'scheme2'
     * }
     */
    '6a2444665478561600148eca904c1e4bab2c7212938cb89728741539355507736368656d6532',
    /**
     * loan : {
     *   ownerAddress: 'bcrt1q0uajendn9xpv87jnsqgjmlad3fne9wagcxjdt2',
     *   schemeId: ''
     * }
     */
    '6a1d44665478561600145c51469b068db1a7af14db363a74935eb34a628f00'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x56)
  })
})

const header = '6a244466547856' // OP_RETURN(0x6a) (length 36 = 0x24) CDfTx.SIGNATURE(0x44665478) CCreateVault.OP_CODE(0x56)
// CreateVault.ownerAddress(0x1600147f3b2ccdb32982c3fa5380112dffad8a6792bba8) CreateVault.schemeId(0x07736368656d6531)
const data = '1600147f3b2ccdb32982c3fa5380112dffad8a6792bba807736368656d6531'
const createVault: CreateVault = {
  ownerAddress: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('7f3b2ccdb32982c3fa5380112dffad8a6792bba8')
    ]
  },
  schemeId: 'scheme1'
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_CREATE_VAULT(createVault)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CCreateVault(buffer)

    expect(composable.toObject()).toStrictEqual(createVault)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CCreateVault(createVault)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
