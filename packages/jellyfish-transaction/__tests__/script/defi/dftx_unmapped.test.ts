import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../src/script/defi'
import { DeFiOpUnmapped } from '../../../src/script/defi/dftx_unmapped'
import { toBuffer, toOPCodes } from '../../../src/script/_buffer'

it('should bi-directional map unmapped buffer-object-buffer', () => {
  const hex = '6a084466547800001100'

  const stack = toOPCodes(
    SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
  )

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(hex)
})

it('should map as mapped if it is unmapped', () => {
  const hex = '6a084466547800001234'

  const stack = toOPCodes(
    SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
  )

  expect(stack[0].type).toStrictEqual('OP_RETURN')
  expect(stack[1].type).toStrictEqual('OP_DEFI_TX')

  const tx = (stack[1] as OP_DEFI_TX).tx
  expect(tx.signature).toStrictEqual(1147556984)
  expect(tx.type).toStrictEqual(0)
  expect(tx.name).toStrictEqual('OP_DEFI_TX_UNMAPPED')

  const unmapped = tx.data as DeFiOpUnmapped
  expect(unmapped.hex).toStrictEqual('001234')
})
