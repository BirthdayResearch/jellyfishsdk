import { SmartBuffer } from 'smart-buffer'
import {
  CLoanPayback,
  LoanPayback
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * LoanPayback : {
        vaultId: '3fe27f9a8e9dc4a6d6e3e26b107b41786e1cf34688f34d9e7e5a26c376be2351',
        from: 'bcrt1qe87raws06n4g5x78gn32nd9uhr8mcfmc7p6h3j',
        tokenAmounts: '45@TSLA'
      }
     */
    '6a4944665478485123be76c3265a7e9e4df38846f31c6e78417b106be2e3d6a6c49d8e9a7fe23f160014c9fc3eba0fd4ea8a1bc744e2a9b4bcb8cfbc27780102000000008d380c01000000',
    /**
     * LoanPayback : {
        vaultId: 'f95268403485ab72bccd04800788cf61bfad9fb7069b894c6f741add5bd49991',
        from: 'bcrt1qwcrq4hpznhdwl830afs9u0zzj48cvpd4l7s26m',
        tokenAmounts: ['13@TSLA', '6@AMZN']
      }
     */
    '6a4c5544665478489199d45bdd1a746f4c899b06b79fadbf61cf88078004cdbc72ab8534406852f916001476060adc229ddaef9e2fea605e3c42954f8605b50202000000006d7c4d00000000030000000046c32300000000',
    /**
     * LoanPayback : {
        vaultId: '867cb87cae3f339f43d33312f6e2bea410b57e54b2aad918d6e61a82eb61aeb5',
        from: 'bcrt1qrvag70s4x65kmz8506pnrfvd77a9wl5lum3ctd',
        tokenAmounts: '30@APPL'
      }
     */
    '6a494466547848b5ae61eb821ae6d618d9aab2547eb510a4bee2f61233d3439f333fae7cb87c861600141b3a8f3e1536a96d88f47e8331a58df7ba577e9f0102000000005ed0b200000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x48)
  })
})

const header = '6a4c554466547848' // OP_RETURN(0x6a) OP_PUSHDATA1(0x4c) (length 85 = 0x55) CDfTx.SIGNATURE(0x44665478) CLoanPayback.OP_CODE(0x48)
// LoanPayback.vaultId[LE](0x9199d45bdd1a746f4c899b06b79fadbf61cf88078004cdbc72ab8534406852f9)
// LoanPayback.from(0x16001476060adc229ddaef9e2fea605e3c42954f8605b5)
// LoanPayback.tokenAmounts(0x0202000000006d7c4d00000000030000000046c32300000000)
const data = '9199d45bdd1a746f4c899b06b79fadbf61cf88078004cdbc72ab8534406852f916001476060adc229ddaef9e2fea605e3c42954f8605b50202000000006d7c4d00000000030000000046c32300000000'
const loanPayback: LoanPayback = {
  vaultId: 'f95268403485ab72bccd04800788cf61bfad9fb7069b894c6f741add5bd49991',
  from: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('76060adc229ddaef9e2fea605e3c42954f8605b5')
    ]
  },
  tokenAmounts: [{ token: 2, amount: new BigNumber(13) }, { token: 3, amount: new BigNumber(6) }]
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_LOAN_PAYBACK(loanPayback)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CLoanPayback(buffer)

    expect(composable.toObject()).toStrictEqual(loanPayback)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CLoanPayback(loanPayback)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
