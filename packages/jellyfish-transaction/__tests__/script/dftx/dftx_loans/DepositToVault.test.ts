import { SmartBuffer } from 'smart-buffer'
import {
  CDepositToVault,
  DepositToVault
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * DepositVault : {
        vaultId: 'ed59b0558f03d547819c1990bfbade53656170e2c311d9b8b418a6a74ae4c2ae',
        from: 'bcrt1q3r2jhxcammvnyfewpjd7hvxueh2xanuere5q3e',
        amount: '10000@DFI'
      }
     */
    '6a454466547853aec2e44aa7a618b4b8d911c3e270616553debabf90199c8147d5038f55b059ed16001488d52b9b1dded932272e0c9bebb0dccdd46ecf99000010a5d4e8000000',
    /**
     * DepositVault : {
        vaultId: 'ed59b0558f03d547819c1990bfbade53656170e2c311d9b8b418a6a74ae4c2ae',
        from: 'bcrt1q3r2jhxcammvnyfewpjd7hvxueh2xanuere5q3e',
        amount: '1@BTC'
      }
     */
    '6a454466547853aec2e44aa7a618b4b8d911c3e270616553debabf90199c8147d5038f55b059ed16001488d52b9b1dded932272e0c9bebb0dccdd46ecf990100e1f50500000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x53)
  })
})

const header = '6a454466547853' // OP_RETURN(0x6a) (length 69 = 0x45) CDfTx.SIGNATURE(0x44665478) CDepositToVault.OP_CODE(0x53)
// DepositToVault.vaultId[LE](0xaec2e44aa7a618b4b8d911c3e270616553debabf90199c8147d5038f55b059ed) DepositToVault.from(0x16001488d52b9b1dded932272e0c9bebb0dccdd46ecf99)
// DepositToVault.amount(0x000010a5d4e8000000)
const data = 'aec2e44aa7a618b4b8d911c3e270616553debabf90199c8147d5038f55b059ed16001488d52b9b1dded932272e0c9bebb0dccdd46ecf99000010a5d4e8000000'
const depositToVault: DepositToVault = {
  vaultId: 'ed59b0558f03d547819c1990bfbade53656170e2c311d9b8b418a6a74ae4c2ae',
  from: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('88d52b9b1dded932272e0c9bebb0dccdd46ecf99')
    ]
  },
  amount: { token: 0, amount: new BigNumber(10000) }
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_DEPOSIT_TO_VAULT(depositToVault)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CDepositToVault(buffer)

    expect(composable.toObject()).toStrictEqual(depositToVault)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CDepositToVault(depositToVault)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
