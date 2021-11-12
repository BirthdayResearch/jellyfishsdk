import { SmartBuffer } from 'smart-buffer'
import {
  CUpdateVault,
  UpdateVault
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * updateVault : {
     *   vaultId: 496c8375e38c42bd410f23a66feb92a5029f261165e7b244682f484658d8e076
     *   ownerAddress: 'bcrt1q2knun5hwc6pe2spywl330qssg5e6eqy6wwupau',
     *   schemeId: 'scheme1'
     * }
     */
    '6a44446654787676e0d85846482f6844b2e76511269f02a592eb6fa6230f41bd428ce375836c4916001455a7c9d2eec68395402477e31782104533ac809a07736368656d6531',
    /**
     * updateVault : {
     *   vaultId: 93bfaa8ea52db3f1cfe937adb88bc5dc77d675f36ac709be87331835cf09e916
     *   ownerAddress: 'bcrt1q4hy0yz57jjqzetplkygxqdmy48rhmykvfrajge',
     *   schemeId: 'scheme2'
     * }
     */
    '6a44446654787616e909cf35183387be09c76af375d677dcc58bb8ad37e9cff1b32da58eaabf93160014adc8f20a9e94802cac3fb110603764a9c77d92cc07736368656d6532',
    /**
     * updateVault : {
     *   vaultId: c076512f7c766963c8aa910106fde37bc728a0001720977cade74821235652f7
     *   ownerAddress: 'bcrt1qnl9jx9smrsjd948z44ft8ykm3lwsrj5x65czhy',
     *   schemeId: 'scheme3'
     * }
     */
    '6a44446654787616e909cf35183387be09c76af375d677dcc58bb8ad37e9cff1b32da58eaabf93160014adc8f20a9e94802cac3fb110603764a9c77d92cc07736368656d6532'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x76)
  })
})

const header = '6a444466547876' // OP_RETURN(0x6a) (length 68 = 0x44) CDfTx.SIGNATURE(0x44665478) CUpdateVault.OP_CODE(0x76)
const data = '76e0d85846482f6844b2e76511269f02a592eb6fa6230f41bd428ce375836c4916001455a7c9d2eec68395402477e31782104533ac809a07736368656d6531'
// UpdateVault.vaultId(76e0d85846482f6844b2e76511269f02a592eb6fa6230f41bd428ce375836c49)
// UpdateVault.ownerAddress(16001455a7c9d2eec68395402477e31782104533ac809a0)
// UpdateVault.schemeId(7736368656d6531)
const updateVault: UpdateVault = {
  vaultId: '496c8375e38c42bd410f23a66feb92a5029f261165e7b244682f484658d8e076',
  ownerAddress: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('55a7c9d2eec68395402477e31782104533ac809a')
    ]
  },
  schemeId: 'scheme1'
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_UPDATE_VAULT(updateVault)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CUpdateVault(buffer)

    expect(composable.toObject()).toStrictEqual(updateVault)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CUpdateVault(updateVault)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
