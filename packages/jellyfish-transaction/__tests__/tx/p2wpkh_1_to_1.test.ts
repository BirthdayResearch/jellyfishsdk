import { SmartBuffer } from 'smart-buffer'
import { CTransaction, CTransactionSegWit } from '../../src'

const unsigned = '0400000001346faf87ccf6fe45463831a23054780d78e4a6decab10575aba212d2e087eb3d0000000000ffffffff010065cd1d000000001600144ab4391ce5a732e36139e72d79a28e01b7b080340000000000'
const signed = '04000000000101346faf87ccf6fe45463831a23054780d78e4a6decab10575aba212d2e087eb3d0000000000ffffffff010065cd1d000000001600144ab4391ce5a732e36139e72d79a28e01b7b0803400024730440220691a0adc945ae033716e7025235b19618a579545874521d3d70faffcbe95971602200dd1886fe71ab5ab447077680bf891c8faeede9c52e15c0b3789e128899b320e012103987aec2e508e124468f0f07a836d185b329026e7aaf75be48cf12be8f18cbe8100000000'

it('bi-directional unsigned buffer', () => {
  const fromBuffer = SmartBuffer.fromBuffer(Buffer.from(unsigned, 'hex'))
  const tx = new CTransaction(fromBuffer)

  const toBuffer = new SmartBuffer()
  tx.toBuffer(toBuffer)
  expect(toBuffer.toBuffer().toString('hex')).toStrictEqual(unsigned)
})

it('bi-directional signed buffer', () => {
  const fromBuffer = SmartBuffer.fromBuffer(Buffer.from(signed, 'hex'))
  const tx = new CTransactionSegWit(fromBuffer)

  const toBuffer = new SmartBuffer()
  tx.toBuffer(toBuffer)

  expect(toBuffer.toBuffer().toString('hex')).toStrictEqual(signed)
})
