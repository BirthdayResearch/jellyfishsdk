import { SmartBuffer } from 'smart-buffer'
import {
  CPaybackLoanV2,
  PaybackLoanV2
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /*
      PaybackLoanV2 : {
        vaultId: '439bccaad41172cfab20f7b0f790c2dd6479ee3d82047f8843c3b02ed8ce56b7',
        from: 'b36814fd26190b321aa985809293a41273cfe15e',
        loans: [{ dToken: 2, amounts: [{ token: 0, amount: 100 }] }]
      }
    */
    '6a4b446654786bb756ced82eb0c343887f04823dee7964ddc290f7b0f720abcf7211d4aacc9b43160014b36814fd26190b321aa985809293a41273cfe15e0101010000000000e40b5402000000',
    /*
      PaybackLoanV2 : {
        vaultId: '28643c39da09f8d899d504be61e687512d037ce36739e9fc8a038c523a5a2947',
        from: 'b36814fd26190b321aa985809293a41273cfe15e',
        loans: [{ dToken: 1, amounts: [{ token: 0, amount: new BigNumber(100) }] },
        { dToken: 2, amounts: [{ token: 0, amount: new BigNumber(100) }] }]
      }
    */
    '6a4c59446654786b47295a3a528c038afce93967e37c032d5187e661be04d599d8f809da393c6428160014b36814fd26190b321aa985809293a41273cfe15e0201010000000000e40b540200000002010000000000e40b5402000000',
    /*
      PaybackLoanV2 : {
        vaultId: '124fc1b319e424fde0c613fb841dbdcb385e0bda086824431cf84bdbecba99a7',
        from: 'b36814fd26190b321aa985809293a41273cfe15e',
        loans: [{ dToken: 2, amounts: [{ token: 1, amount: 1 }] }]
      }
    */
    '6a4b446654786ba799baecdb4bf81c43246808da0b5e38cbbd1d84fb13c6e0fd24e419b3c14f12160014b36814fd26190b321aa985809293a41273cfe15e0101010200000000e1f50500000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x6b)
  })
})

const header = '6a4c59446654786b' // OP_RETURN(0x6a) OP_PUSHDATA1(0x4c) (length 89 = 0x59) CDfTx.SIGNATURE(0x44665478) CPaybackLoanV2.OP_CODE(0x6b)
// PaybackLoanV2.vaultId[LE](0x56b932ca5a2965b7d67f99d3398d99aa0dba4ba292bb585c8a4d96e01e84bb7a)
// PaybackLoanV2.from(0xb36814fd26190b321aa985809293a41273cfe15e)
// PaybackLoanV2.loans(0x0201010000000000e40b540200000002010000000000e40b5402000000)
const data = '7abb841ee0964d8a5c58bb92a24bba0daa998d39d3997fd6b765295aca32b956160014b36814fd26190b321aa985809293a41273cfe15e0201010000000000e40b540200000002010000000000e40b5402000000'
const paybackLoan: PaybackLoanV2 = {
  vaultId: '56b932ca5a2965b7d67f99d3398d99aa0dba4ba292bb585c8a4d96e01e84bb7a',
  from: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('b36814fd26190b321aa985809293a41273cfe15e')
    ]
  },
  loans: [{ dToken: 1, amounts: [{ token: 0, amount: new BigNumber(100) }] },
    { dToken: 2, amounts: [{ token: 0, amount: new BigNumber(100) }] }]
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_PAYBACK_LOAN_V2(paybackLoan)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CPaybackLoanV2(buffer)

    expect(composable.toObject()).toStrictEqual(paybackLoan)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CPaybackLoanV2(paybackLoan)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
