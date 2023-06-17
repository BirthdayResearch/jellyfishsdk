import { SmartBuffer } from 'smart-buffer'
import {
  CPaybackWithCollateral,
  PaybackWithCollateral
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
       * PaybackWithCollateral : {
          vaultId: '3fe27f9a8e9dc4a6d6e3e26b107b41786e1cf34688f34d9e7e5a26c376be2351'
        }
       */
    '6a2544665478575123be76c3265a7e9e4df38846f31c6e78417b106be2e3d6a6c49d8e9a7fe23f',
    /**
       * PaybackWithCollateral : {
          vaultId: 'f95268403485ab72bccd04800788cf61bfad9fb7069b894c6f741add5bd49991'
        }
       */
    '6a2544665478579199d45bdd1a746f4c899b06b79fadbf61cf88078004cdbc72ab8534406852f9',
    /**
       * PaybackWithCollateral : {
          vaultId: '867cb87cae3f339f43d33312f6e2bea410b57e54b2aad918d6e61a82eb61aeb5'
        }
       */
    '6a254466547857b5ae61eb821ae6d618d9aab2547eb510a4bee2f61233d3439f333fae7cb87c86'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x57)
  })
})

const header = '6a254466547857' // OP_RETURN(0x6a) (length 37 = 0x25) CDfTx.SIGNATURE(0x44665478) CPaybackWithCollateral.OP_CODE(0x57)
// PaybackWithCollateral.vaultId[LE](0xb5ae61eb821ae6d618d9aab2547eb510a4bee2f61233d3439f333fae7cb87c86)
const data = 'b5ae61eb821ae6d618d9aab2547eb510a4bee2f61233d3439f333fae7cb87c86'
const paybackWithCollateral: PaybackWithCollateral = {
  vaultId: '867cb87cae3f339f43d33312f6e2bea410b57e54b2aad918d6e61a82eb61aeb5'
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_PAYBACK_WITH_COLLATERAL(paybackWithCollateral)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CPaybackWithCollateral(buffer)

    expect(composable.toObject()).toStrictEqual(paybackWithCollateral)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CPaybackWithCollateral(paybackWithCollateral)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
