import { SmartBuffer } from 'smart-buffer'
import {
  CTakeLoan,
  TakeLoan
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * TakeLoan : {
        vaultId: '6f5bf563700e008f56301fed8cc6729ff334f37d2ced46f33557fe4c5aa49016',
        tokenAmounts: [{'token': 2, 'amount': new BigNumber(40)}]
      }
     */
    '6a3344665478581690a45a4cfe5735f346ed2c7df334f39f72c68ced1f30568f000e7063f55b6f00010200000000286bee00000000',
    /**
     * TakeLoan : {
        vaultId: '6f5bf563700e008f56301fed8cc6729ff334f37d2ced46f33557fe4c5aa49016',
        tokenAmounts: [{'token': 2, 'amount': new BigNumber(40)}, {'token': 3, 'amount': new BigNumber(40)}]
      }
     */
    '6a3f44665478581690a45a4cfe5735f346ed2c7df334f39f72c68ced1f30568f000e7063f55b6f00020200000000286bee000000000300000000286bee00000000',
    /**
      * TakeLoan : {
        vaultId: '6f5bf563700e008f56301fed8cc6729ff334f37d2ced46f33557fe4c5aa49016',
        to: '0x1600149d04d9764bdd97432f13411fe9753f808dc27926'
        tokenAmounts: [{'token': 2, 'amount': new BigNumber(40)}]
      }
     */
    '6a4944665478581690a45a4cfe5735f346ed2c7df334f39f72c68ced1f30568f000e7063f55b6f1600149d04d9764bdd97432f13411fe9753f808dc27926010200000000286bee00000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x58)
  })
})

const header = '6a494466547858' // OP_RETURN(0x6a) (length 73 = 0x49) CDfTx.SIGNATURE(0x44665478) CTakeLoan.OP_CODE(0x58)
// TakeLoan.vaultId[LE](0x1690a45a4cfe5735f346ed2c7df334f39f72c68ced1f30568f000e7063f55b6f)
// TakeLoan.to(0x1600149d04d9764bdd97432f13411fe9753f808dc27926)
// TakeLoan.tokenAmounts(0x010200000000286bee00000000)
const data = '1690a45a4cfe5735f346ed2c7df334f39f72c68ced1f30568f000e7063f55b6f1600149d04d9764bdd97432f13411fe9753f808dc27926010200000000286bee00000000'
const takeLoan: TakeLoan = {
  vaultId: '6f5bf563700e008f56301fed8cc6729ff334f37d2ced46f33557fe4c5aa49016',
  to: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('9d04d9764bdd97432f13411fe9753f808dc27926')
    ]
  },
  tokenAmounts: [{ token: 2, amount: new BigNumber(40) }]
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_TAKE_LOAN(takeLoan)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CTakeLoan(buffer)

    expect(composable.toObject()).toStrictEqual(takeLoan)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CTakeLoan(takeLoan)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
