import { SmartBuffer } from 'smart-buffer'
import { CTransaction, CTransactionSegWit } from '../../../src'

const unsigned = '0200000001f846da136c83e76c8538caa35346c7836ab603b017b564e35f17d7dfdc57066e0000000000ffffffff01804a5d05000000001600144ab4391ce5a732e36139e72d79a28e01b7b0803400000000'
const signed = '02000000000101f846da136c83e76c8538caa35346c7836ab603b017b564e35f17d7dfdc57066e0000000000ffffffff01804a5d05000000001600144ab4391ce5a732e36139e72d79a28e01b7b080340247304402206fcd6c8f1582136ad7f0d034aedd960f7aa0c1af8ba7dd982f7ab8c6c7fc75f6022066a0886d96a004381750c95a54391cf958e59143d0a1e1b622ede0f79b5ab14c012103c1f7238aa1d97af163018b76afc000f378698da9537cf6ad7dc902643a3dd5d100000000'

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
